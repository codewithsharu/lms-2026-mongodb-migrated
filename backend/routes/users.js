const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const TeacherDetail = require('../models/TeacherDetail');
const TeacherAssignment = require('../models/TeacherAssignment');
const AuditLog = require('../models/AuditLog');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { hashPassword } = require('../services/authService');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const generatePassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getPasswordFromEmailPrefix = (email) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0) return null;
  const localPart = normalizedEmail.slice(0, atIndex).trim();
  return localPart || null;
};

const getProvisioningFallbackPassword = (email) => getPasswordFromEmailPrefix(email) || generatePassword();

const validateStudentEnrollment = async ({ classId, sectionId }) => {
  if (!classId) {
    return { valid: false, error: 'Class is required for students. Create a class first.' };
  }
  const classData = await Class.findById(classId).select('id name is_active').lean();
  if (!classData) return { valid: false, error: 'Selected class was not found. Create the class first.' };
  if (classData.is_active === false) return { valid: false, error: 'Selected class is inactive. Assign students only to active classes.' };

  if (!sectionId) return { valid: true, classData, sectionData: null };

  const sectionData = await Section.findOne({ _id: sectionId, class_id: classId }).select('id name').lean();
  if (!sectionData) return { valid: false, error: 'Selected section does not belong to the selected class.' };

  return { valid: true, classData, sectionData };
};

const resolveStudentEnrollmentByNames = async ({ className, sectionName }) => {
  const normalizedClassName = typeof className === 'string' ? className.trim() : '';
  const normalizedSectionName = typeof sectionName === 'string' ? sectionName.trim() : '';

  if (!normalizedClassName) return { valid: false, error: 'Class name is required for student uploads. Create the class first.' };

  const classData = await Class.findOne({ name: normalizedClassName }).select('id name is_active').lean();
  if (!classData) return { valid: false, error: `Class "${normalizedClassName}" was not found. Create it before uploading students.` };
  if (classData.is_active === false) return { valid: false, error: `Class "${normalizedClassName}" is inactive. Upload students only to active classes.` };

  if (!normalizedSectionName) return { valid: true, classId: classData._id, sectionId: null };

  const sectionData = await Section.findOne({ class_id: classData._id, name: normalizedSectionName }).select('id name').lean();
  if (!sectionData) return { valid: false, error: `Section "${normalizedSectionName}" was not found in class "${normalizedClassName}".` };

  return { valid: true, classId: classData._id, sectionId: sectionData._id };
};

const cleanupUserDependencies = async ({ userId, role }) => {
  if (role === 'student') {
    await StudentDetail.deleteMany({ user_id: userId });
  }
  if (role === 'teacher') {
    await TeacherAssignment.deleteMany({ teacher_id: userId });
    await TeacherDetail.deleteMany({ user_id: userId });
  }
  await AuditLog.updateMany({ user_id: userId }, { $set: { user_id: null } });
  await User.updateMany({ created_by: userId }, { $set: { created_by: null } });
};

// Get all users (Admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { role, class_id, section_id, zone, assignment_status, search, page = 1, limit = 20 } = req.query;

    const normalizedRole = String(role || '').trim().toLowerCase();
    const normalizedAssignmentStatus = String(assignment_status || '').trim().toLowerCase();
    const effectiveRole = normalizedRole || (normalizedAssignmentStatus ? 'student' : '');
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNumber - 1) * limitNumber;

    if (normalizedAssignmentStatus && !['assigned', 'unassigned'].includes(normalizedAssignmentStatus)) {
      return res.status(400).json({ error: 'assignment_status must be either assigned or unassigned' });
    }

    let filteredStudentUserIds = null;
    const hasStudentScopeFilters = Boolean(class_id) || Boolean(section_id) || Boolean(zone) || Boolean(normalizedAssignmentStatus);

    if (effectiveRole === 'student' && hasStudentScopeFilters) {
      let studentFilter = {};
      if (normalizedAssignmentStatus === 'assigned') studentFilter.class_id = { $ne: null };
      else if (normalizedAssignmentStatus === 'unassigned') studentFilter.class_id = null;
      if (class_id) studentFilter.class_id = class_id;
      if (section_id) studentFilter.section_id = section_id;
      if (zone) studentFilter.zone = zone;

      const scopedStudents = await StudentDetail.find(studentFilter).select('user_id').lean();
      filteredStudentUserIds = [...new Set(scopedStudents.map((s) => s.user_id?.toString()).filter(Boolean))];

      if (filteredStudentUserIds.length === 0) {
        return res.json({ users: [], pagination: { total: 0, page: pageNumber, limit: limitNumber, totalPages: 0 } });
      }
    }

    let filter = {};
    if (effectiveRole) filter.role = effectiveRole;
    if (filteredStudentUserIds && filteredStudentUserIds.length > 0) filter._id = { $in: filteredStudentUserIds };
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { full_name: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('_id email full_name phone profile_photo role is_active created_at last_login')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limitNumber)
      .lean();

    const usersWithDetails = await Promise.all(users.map(async (user) => {
      let details = null;
      if (user.role === 'student') {
        const sd = await StudentDetail.findOne({ user_id: user._id })
          .populate('class_id', 'id name')
          .populate('section_id', 'id name')
          .lean();
        if (sd) {
          details = { roll_number: sd.roll_number, zone: sd.zone, classes: sd.class_id, sections: sd.section_id };
        }
      } else if (user.role === 'teacher') {
        const td = await TeacherDetail.findOne({ user_id: user._id }).select('employee_id department').lean();
        details = td;
      }
      return { ...user, id: user._id, details };
    }));

    res.json({
      users: usersWithDetails,
      pagination: { total: count, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(count / limitNumber) }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user (Admin only)
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('_id email full_name phone profile_photo role is_active created_at last_login')
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    let details = null;
    if (user.role === 'student') {
      const sd = await StudentDetail.findOne({ user_id: user._id })
        .populate('class_id', 'id name').populate('section_id', 'id name').lean();
      if (sd) details = { roll_number: sd.roll_number, zone: sd.zone, classes: sd.class_id, sections: sd.section_id };
    } else if (user.role === 'teacher') {
      details = await TeacherDetail.findOne({ user_id: user._id }).select('employee_id department').lean();
    }
    res.json({ ...user, id: user._id, details });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create single user (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email, full_name, phone, profile_photo, role, roll_number, class_id, section_id, zone, employee_id, department } = req.body;

    if (!email || !full_name || !role) return res.status(400).json({ error: 'Email, full name, and role are required' });
    if (!['student', 'teacher'].includes(role)) return res.status(400).json({ error: 'Role must be either student or teacher' });

    const normalizedEmail = email.toLowerCase().trim();
    const derivedPassword = getPasswordFromEmailPrefix(normalizedEmail);
    if (!derivedPassword) return res.status(400).json({ error: 'A valid email is required' });
    if (role === 'student' && !roll_number) return res.status(400).json({ error: 'Roll number is required for students' });
    if (role === 'teacher' && !employee_id) return res.status(400).json({ error: 'Employee ID is required for teachers' });

    const sanitizedClassId = class_id || null;
    const sanitizedSectionId = section_id || null;
    const sanitizedZone = zone || null;

    if (role === 'student') {
      const enrollmentValidation = await validateStudentEnrollment({ classId: sanitizedClassId, sectionId: sanitizedSectionId });
      if (!enrollmentValidation.valid) return res.status(400).json({ error: enrollmentValidation.error });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await hashPassword(derivedPassword);

    const newUser = await User.create({
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name,
      phone: phone || null,
      profile_photo: profile_photo || null,
      role,
      created_by: req.user.id
    });

    try {
      if (role === 'student') {
        await StudentDetail.create({ user_id: newUser._id, roll_number, class_id: sanitizedClassId, section_id: sanitizedSectionId, zone: sanitizedZone });
      } else if (role === 'teacher') {
        await TeacherDetail.create({ user_id: newUser._id, employee_id, department: department || null });
      }
    } catch (detailError) {
      await User.findByIdAndDelete(newUser._id);
      throw detailError;
    }

    await logAction(req, 'CREATE', 'user', newUser._id.toString(), { role, email: normalizedEmail });

    res.status(201).json({
      message: 'User created successfully',
      user: { id: newUser._id, email: newUser.email, full_name: newUser.full_name, role: newUser.role },
      generatedPassword: derivedPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) return res.status(400).json({ error: 'Duplicate entry. Email, roll number, or employee ID already exists.' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, phone, profile_photo, is_active, new_password, roll_number, class_id, section_id, zone, employee_id, department } = req.body;

    const currentUser = await User.findById(id).lean();
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    if (currentUser.role === 'admin' && req.user.id !== id) return res.status(403).json({ error: 'Cannot modify other admin users' });

    const updateData = {};

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail || !getPasswordFromEmailPrefix(normalizedEmail)) return res.status(400).json({ error: 'A valid email is required' });
      updateData.email = normalizedEmail;
    }
    if (full_name !== undefined) {
      const n = String(full_name).trim();
      if (!n) return res.status(400).json({ error: 'Full name is required' });
      updateData.full_name = n;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (profile_photo !== undefined) updateData.profile_photo = profile_photo;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (new_password !== undefined && new_password !== '') {
      const pv = String(new_password);
      if (pv.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
      updateData.password_hash = await hashPassword(pv);
    }

    if (Object.keys(updateData).length > 0) {
      await User.findByIdAndUpdate(id, updateData);
    }

    let roleSpecificChanges = null;
    if (currentUser.role === 'student') {
      const studentUpdate = {};
      if (roll_number !== undefined) {
        const n = String(roll_number).trim();
        if (!n) return res.status(400).json({ error: 'Roll number is required for students' });
        studentUpdate.roll_number = n;
      }

      const normalizedClassId = class_id !== undefined ? class_id || null : undefined;
      const normalizedSectionId = section_id !== undefined ? section_id || null : undefined;

      if (normalizedClassId !== undefined || normalizedSectionId !== undefined) {
        const currentSD = await StudentDetail.findOne({ user_id: id }).select('class_id section_id').lean();
        const effectiveClassId = normalizedClassId !== undefined ? normalizedClassId : currentSD?.class_id || null;
        const effectiveSectionId = normalizedSectionId !== undefined ? normalizedSectionId : currentSD?.section_id || null;
        const enrollmentValidation = await validateStudentEnrollment({ classId: effectiveClassId, sectionId: effectiveSectionId });
        if (!enrollmentValidation.valid) return res.status(400).json({ error: enrollmentValidation.error });
      }

      if (normalizedClassId !== undefined) studentUpdate.class_id = normalizedClassId;
      if (normalizedSectionId !== undefined) studentUpdate.section_id = normalizedSectionId;
      if (zone !== undefined) studentUpdate.zone = zone || null;

      if (Object.keys(studentUpdate).length > 0) {
        await StudentDetail.findOneAndUpdate({ user_id: id }, studentUpdate);
        roleSpecificChanges = { student_details: studentUpdate };
      }
    } else if (currentUser.role === 'teacher') {
      const teacherUpdate = {};
      if (employee_id !== undefined) {
        const n = String(employee_id).trim();
        if (!n) return res.status(400).json({ error: 'Employee ID is required for teachers' });
        teacherUpdate.employee_id = n;
      }
      if (department !== undefined) teacherUpdate.department = department || null;

      if (Object.keys(teacherUpdate).length > 0) {
        await TeacherDetail.findOneAndUpdate({ user_id: id }, teacherUpdate);
        roleSpecificChanges = { teacher_details: teacherUpdate };
      }
    }

    await logAction(req, 'UPDATE', 'user', id, { before: currentUser, after: { ...updateData, ...(roleSpecificChanges || {}) } });
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) return res.status(400).json({ error: 'Duplicate entry. Email, roll number, or employee ID already exists.' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(id).lean();
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    if (currentUser.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin users' });

    await cleanupUserDependencies({ userId: id, role: currentUser.role });
    await User.findByIdAndDelete(id);

    await logAction(req, 'DELETE', 'user', id, { deleted_user: currentUser.email });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    const user = await User.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userPassword = new_password || generatePassword();
    const passwordHash = await hashPassword(userPassword);
    await User.findByIdAndUpdate(id, { password_hash: passwordHash });

    await logAction(req, 'UPDATE', 'user', id, { action: 'password_reset' });
    res.json({ message: 'Password reset successfully', ...(new_password ? {} : { newPassword: userPassword }) });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk upload users via Excel (Admin only)
router.post('/bulk-upload', verifyToken, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    if (!data.length) return res.status(400).json({ error: 'Excel file is empty' });

    const results = { success: [], failed: [] };

    for (const row of data) {
      try {
        const { user_type, full_name, email, phone, roll_number, employee_id, class_name, section_name, zone, department } = row;
        if (!user_type || !full_name || !email) { results.failed.push({ row, error: 'Missing required fields' }); continue; }

        const normalizedEmail = String(email).trim().toLowerCase();
        const derivedPassword = getPasswordFromEmailPrefix(normalizedEmail);
        if (!derivedPassword) { results.failed.push({ row, error: 'A valid email is required' }); continue; }

        const role = user_type.toLowerCase();
        if (!['student', 'teacher'].includes(role)) { results.failed.push({ row, error: 'Invalid user_type' }); continue; }
        if (role === 'student' && !roll_number) { results.failed.push({ row, error: 'Roll number required' }); continue; }
        if (role === 'student' && !class_name) { results.failed.push({ row, error: 'Class name required' }); continue; }
        if (role === 'teacher' && !employee_id) { results.failed.push({ row, error: 'Employee ID required' }); continue; }

        const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
        if (existingUser) { results.failed.push({ row, error: 'Email already exists' }); continue; }

        let classId = null, sectionId = null;
        if (role === 'student') {
          const er = await resolveStudentEnrollmentByNames({ className: class_name, sectionName: section_name });
          if (!er.valid) { results.failed.push({ row, error: er.error }); continue; }
          classId = er.classId; sectionId = er.sectionId;
        }

        const passwordHash = await hashPassword(derivedPassword);
        const newUser = await User.create({
          email: normalizedEmail, password_hash: passwordHash, full_name, phone: phone || null, role, created_by: req.user.id
        });

        try {
          if (role === 'student') {
            await StudentDetail.create({ user_id: newUser._id, roll_number, class_id: classId, section_id: sectionId, zone: zone ? zone.toLowerCase() : null });
          } else if (role === 'teacher') {
            await TeacherDetail.create({ user_id: newUser._id, employee_id, department: department || null });
          }
        } catch (detailError) {
          await User.findByIdAndDelete(newUser._id);
          results.failed.push({ row, error: detailError.message }); continue;
        }

        results.success.push({ email: normalizedEmail, full_name, role, generatedPassword: derivedPassword });
      } catch (rowError) {
        results.failed.push({ row, error: rowError.message });
      }
    }

    await logAction(req, 'BULK_CREATE', 'user', null, { total: data.length, success: results.success.length, failed: results.failed.length });
    res.json({ message: 'Bulk upload completed', summary: { total: data.length, successful: results.success.length, failed: results.failed.length }, results });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download Excel template
router.get('/template/download', verifyToken, isAdmin, (req, res) => {
  const templateType = String(req.query.type || '').trim().toLowerCase();
  let templateData, fileName, sheetName;

  if (templateType === 'student') {
    templateData = [{ user_type: 'student', full_name: 'John Doe', email: 'john.doe@example.com', phone: '1234567890', roll_number: 'STU001', class_name: 'CSE-2024', section_name: 'A', zone: 'blue' }];
    fileName = 'student_upload_template.xlsx'; sheetName = 'Students';
  } else if (templateType === 'teacher') {
    templateData = [{ user_type: 'teacher', full_name: 'Jane Smith', email: 'jane.smith@example.com', phone: '0987654321', employee_id: 'EMP001', department: 'Computer Science' }];
    fileName = 'teacher_upload_template.xlsx'; sheetName = 'Teachers';
  } else {
    return res.status(400).json({ error: 'Template type is required. Use type=student or type=teacher.' });
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

module.exports = router;
