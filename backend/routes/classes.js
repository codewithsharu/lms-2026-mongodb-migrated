const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const StudentDetail = require('../models/StudentDetail');
const TeacherDetail = require('../models/TeacherDetail');
const TeacherAssignment = require('../models/TeacherAssignment');
const AuditLog = require('../models/AuditLog');
const { verifyToken, isAdmin, hasRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { hashPassword } = require('../services/authService');

const router = express.Router();
const bulkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const normalizeZone = (v) => { const z = String(v||'').trim().toLowerCase(); return ['blue','red','green'].includes(z)?z:null; };
const getPasswordFromEmailPrefix = (email) => { const e=String(email||'').trim().toLowerCase(); const i=e.indexOf('@'); return i>0?e.slice(0,i).trim()||null:null; };

const hasSectionAccess = (assignments, sectionId) => {
  if (!assignments||!assignments.length) return false;
  return assignments.some(a => !a.section_id || (sectionId && a.section_id?.toString() === sectionId?.toString()));
};
const hasZoneAccess = (assignments, zone) => {
  if (!assignments||!assignments.length) return false;
  return assignments.some(a => !a.zone || a.zone === zone);
};

const parseBulkAssignmentRows = (buffer) => {
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    return data.map((row, i) => ({
      rowNumber: i + 2,
      teacher_id: String(row.teacher_id||'').trim()||null,
      teacher_email: String(row.teacher_email||row.email||'').trim().toLowerCase()||null,
      section_id: String(row.section_id||'').trim()||null,
      section_name: String(row.section_name||row.section||'').trim()||null,
      zone: String(row.zone||'').trim().toLowerCase()||null
    }));
  } catch { return []; }
};

// ==================== CLASSES CRUD (Admin) ====================

router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const classes = await Class.find({}).sort({ created_at: -1 }).lean();
    const classesWithCounts = await Promise.all(classes.map(async (c) => {
      const studentCount = await StudentDetail.countDocuments({ class_id: c._id });
      const teacherCount = await TeacherAssignment.countDocuments({ class_id: c._id });
      const sections = await Section.find({ class_id: c._id }).sort({ name: 1 }).lean();
      return { ...c, id: c._id, student_count: studentCount, teacher_count: teacherCount, sections: sections.map(s=>({...s,id:s._id})) };
    }));
    res.json(classesWithCounts);
  } catch (error) { console.error('Get classes error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id).lean();
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    const sections = await Section.find({ class_id: classData._id }).sort({ name: 1 }).lean();
    const assignments = await TeacherAssignment.find({ class_id: classData._id }).lean();
    const populatedAssignments = await Promise.all(assignments.map(async (a) => {
      const teacher = await User.findById(a.teacher_id).select('_id full_name email').lean();
      const section = a.section_id ? await Section.findById(a.section_id).select('_id name').lean() : null;
      return { ...a, id: a._id, teacher: teacher?{id:teacher._id,...teacher}:null, section: section?{id:section._id,...section}:null };
    }));
    res.json({ ...classData, id: classData._id, sections: sections.map(s=>({...s,id:s._id})), teacher_assignments: populatedAssignments });
  } catch (error) { console.error('Get class error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description, academic_year } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required' });
    const newClass = await Class.create({ name, description: description||null, academic_year: academic_year||null });
    await logAction(req, 'CREATE', 'class', newClass._id.toString(), { name });
    res.status(201).json({ message: 'Class created successfully', class: { ...newClass.toObject(), id: newClass._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Class name already exists' });
    console.error('Create class error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description, academic_year, is_active } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description||null;
    if (academic_year !== undefined) updateData.academic_year = academic_year||null;
    if (is_active !== undefined) updateData.is_active = is_active;
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updatedClass) return res.status(404).json({ error: 'Class not found' });
    await logAction(req, 'UPDATE', 'class', req.params.id, updateData);
    res.json({ message: 'Class updated successfully', class: { ...updatedClass, id: updatedClass._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Class name already exists' });
    console.error('Update class error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const classData = await Class.findById(id).select('_id name').lean();
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    const studentCount = await StudentDetail.countDocuments({ class_id: id });
    if (studentCount > 0) await StudentDetail.updateMany({ class_id: id }, { $set: { class_id: null, section_id: null, zone: null } });
    await TeacherAssignment.deleteMany({ class_id: id });
    await Section.deleteMany({ class_id: id });
    await Class.findByIdAndDelete(id);
    await logAction(req, 'DELETE', 'class', id, { class_name: classData.name, unassigned_students: studentCount });
    res.json({ message: studentCount > 0 ? `Class deleted. ${studentCount} student(s) moved to unassigned.` : 'Class deleted successfully', unassigned_students: studentCount });
  } catch (error) { console.error('Delete class error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// ==================== SECTIONS ====================

router.get('/:classId/sections', verifyToken, async (req, res) => {
  try {
    const sections = await Section.find({ class_id: req.params.classId }).sort({ name: 1 }).lean();
    const result = await Promise.all(sections.map(async (s) => {
      const count = await StudentDetail.countDocuments({ section_id: s._id });
      return { ...s, id: s._id, student_count: count };
    }));
    res.json(result);
  } catch (error) { console.error('Get sections error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/:classId/sections', verifyToken, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params; const { name, capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'Section name is required' });
    const classData = await Class.findById(classId).select('_id').lean();
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    const newSection = await Section.create({ class_id: classId, name, capacity: capacity||null });
    await logAction(req, 'CREATE', 'section', newSection._id.toString(), { class_id: classId, name });
    res.status(201).json({ message: 'Section created successfully', section: { ...newSection.toObject(), id: newSection._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Section name already exists in this class' });
    console.error('Create section error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:classId/sections/:sectionId', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, capacity } = req.body; const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = capacity||null;
    const updated = await Section.findByIdAndUpdate(req.params.sectionId, updateData, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Section not found' });
    await logAction(req, 'UPDATE', 'section', req.params.sectionId, updateData);
    res.json({ message: 'Section updated successfully', section: { ...updated, id: updated._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Section name already exists in this class' });
    console.error('Update section error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:classId/sections/:sectionId', verifyToken, isAdmin, async (req, res) => {
  try {
    const count = await StudentDetail.countDocuments({ section_id: req.params.sectionId });
    if (count > 0) return res.status(400).json({ error: 'Cannot delete section with enrolled students.' });
    await Section.findByIdAndDelete(req.params.sectionId);
    await logAction(req, 'DELETE', 'section', req.params.sectionId);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) { console.error('Delete section error:', error); res.status(500).json({ error: 'Internal server error' }); }
});
// ==================== TEACHER ROUTES ====================

// Get teacher's assigned students
router.get('/teacher/assigned-students', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id }).lean();
    if (!assignments.length) return res.json({ assignments: [], summary: { total_assignments: 0, total_students: 0 } });
    const classIds = [...new Set(assignments.map(a => a.class_id?.toString()).filter(Boolean))];
    if (!classIds.length) return res.json({ assignments: [], summary: { total_assignments: 0, total_students: 0 } });
    const students = await StudentDetail.find({ class_id: { $in: classIds } }).lean();
    const userIds = [...new Set(students.map(s => s.user_id).filter(Boolean))];
    const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select('_id email full_name phone is_active').lean() : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const classes = await Class.find({ _id: { $in: classIds } }).select('_id name').lean();
    const classMap = new Map(classes.map(c => [c._id.toString(), c]));
    const allSectionIds = [...new Set([...assignments.map(a => a.section_id?.toString()), ...students.map(s => s.section_id?.toString())].filter(Boolean))];
    const sections = allSectionIds.length ? await Section.find({ _id: { $in: allSectionIds } }).select('_id name').lean() : [];
    const sectionMap = new Map(sections.map(s => [s._id.toString(), s]));

    let totalStudents = 0;
    const enrichedAssignments = assignments.map(a => {
      const matchedStudents = students.filter(sd => {
        if (a.class_id?.toString() !== sd.class_id?.toString()) return false;
        if (a.section_id && a.section_id?.toString() !== sd.section_id?.toString()) return false;
        if (a.zone && a.zone !== sd.zone) return false;
        return true;
      });
      totalStudents += matchedStudents.length;
      const cls = classMap.get(a.class_id?.toString());
      const sec = a.section_id ? sectionMap.get(a.section_id?.toString()) : null;
      const studentDetails = matchedStudents.map(sd => {
        const u = userMap.get(sd.user_id?.toString());
        if (!u) return null;
        const sSec = sd.section_id ? sectionMap.get(sd.section_id.toString()) : null;
        return { id: u._id, email: u.email, full_name: u.full_name, phone: u.phone, is_active: u.is_active, roll_number: sd.roll_number, zone: sd.zone, section: sSec ? { id: sSec._id, name: sSec.name } : null };
      }).filter(Boolean);
      return {
        assignment_id: a._id,
        class: cls ? { id: cls._id, name: cls.name } : null,
        section: sec ? { id: sec._id, name: sec.name } : null,
        zone: a.zone || null,
        student_count: matchedStudents.length,
        students: studentDetails
      };
    });

    res.json({
      assignments: enrichedAssignments,
      summary: {
        total_assignments: enrichedAssignments.length,
        total_students: totalStudents
      }
    });
  } catch (error) { console.error('Get assigned students error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Teacher add student to class
router.post('/teacher/classes/:classId/students', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { email, full_name, phone, roll_number, section_id, zone } = req.body;
    if (!email||!full_name||!roll_number) return res.status(400).json({ error: 'Email, full name, and roll number are required' });
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id, class_id: classId }).lean();
    if (!assignments.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const normalizedEmail = email.toLowerCase().trim();
    const derivedPassword = getPasswordFromEmailPrefix(normalizedEmail);
    if (!derivedPassword) return res.status(400).json({ error: 'A valid email is required' });
    const normalizedSectionId = section_id||null;
    const normalizedZone = zone ? normalizeZone(zone) : null;
    if (!hasSectionAccess(assignments, normalizedSectionId)) return res.status(403).json({ error: 'You are not assigned to the selected section' });
    if (!hasZoneAccess(assignments, normalizedZone)) return res.status(403).json({ error: 'You are not assigned to the selected zone' });
    if (normalizedSectionId) {
      const sec = await Section.findOne({ _id: normalizedSectionId, class_id: classId }).lean();
      if (!sec) return res.status(400).json({ error: 'Section does not belong to this class' });
    }
    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const passwordHash = await hashPassword(derivedPassword);
    const newUser = await User.create({ email: normalizedEmail, password_hash: passwordHash, full_name, phone: phone||null, role: 'student', created_by: req.user.id });
    try {
      await StudentDetail.create({ user_id: newUser._id, roll_number, class_id: classId, section_id: normalizedSectionId, zone: normalizedZone });
    } catch (e) { await User.findByIdAndDelete(newUser._id); throw e; }
    await logAction(req, 'CREATE', 'user', newUser._id.toString(), { role: 'student', class_id: classId });
    res.status(201).json({ message: 'Student added successfully', user: { id: newUser._id, email: newUser.email, full_name: newUser.full_name }, generatedPassword: derivedPassword });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Duplicate entry. Email or roll number already exists.' });
    console.error('Teacher add student error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher bulk preview
router.post('/teacher/classes/:classId/students/bulk-preview', verifyToken, hasRole('teacher'), bulkUpload.single('file'), async (req, res) => {
  try {
    const { classId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'File is required' });
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id, class_id: classId }).lean();
    if (!assignments.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (!rows.length) return res.status(400).json({ error: 'File is empty' });
    const sections = await Section.find({ class_id: classId }).lean();
    const sectionsByName = new Map(sections.map(s => [s.name.trim().toLowerCase(), s]));
    const candidates = [];
    for (const row of rows) {
      const reasons = [];
      const email = String(row.email||'').trim().toLowerCase();
      const full_name = String(row.full_name||row.name||'').trim();
      const roll_number = String(row.roll_number||'').trim();
      const sectionName = String(row.section_name||row.section||'').trim();
      const zone = String(row.zone||'').trim().toLowerCase();
      if (!email) reasons.push('Email is required');
      if (!full_name) reasons.push('Full name is required');
      if (!roll_number) reasons.push('Roll number is required');
      let resolvedSectionId = null;
      if (sectionName) {
        const sec = sectionsByName.get(sectionName.toLowerCase());
        if (sec) resolvedSectionId = sec._id; else reasons.push(`Section "${sectionName}" not found`);
      }
      const normalizedZone = zone ? normalizeZone(zone) : null;
      if (zone && !normalizedZone) reasons.push('Invalid zone');
      if (email) { const exists = await User.findOne({ email }).select('_id').lean(); if (exists) reasons.push('Email already exists'); }
      if (roll_number) { const exists = await StudentDetail.findOne({ roll_number }).select('_id').lean(); if (exists) reasons.push('Roll number already exists'); }
      candidates.push({ email, full_name, phone: String(row.phone||'').trim()||null, roll_number, section_id: resolvedSectionId, section_name: sectionName, zone: normalizedZone, reasons, status: reasons.length ? 'invalid' : 'valid' });
    }
    res.json({ candidates, summary: { total: candidates.length, valid: candidates.filter(c=>c.status==='valid').length, invalid: candidates.filter(c=>c.status==='invalid').length } });
  } catch (error) { console.error('Bulk preview error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Teacher bulk import
router.post('/teacher/classes/:classId/students/bulk-import', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { candidates } = req.body;
    if (!Array.isArray(candidates)||!candidates.length) return res.status(400).json({ error: 'No candidates provided' });
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id, class_id: classId }).lean();
    if (!assignments.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const results = []; const created = [];
    for (const row of candidates) {
      if (!row.email||!row.full_name||!row.roll_number) { results.push({ email: row.email, roll_number: row.roll_number, status: 'skipped', reasons: ['Missing required fields'] }); continue; }
      const normalizedEmail = String(row.email).trim().toLowerCase();
      const derivedPassword = getPasswordFromEmailPrefix(normalizedEmail);
      if (!derivedPassword) { results.push({ email: row.email, roll_number: row.roll_number, status: 'skipped', reasons: ['Invalid email'] }); continue; }
      try {
        const passwordHash = await hashPassword(derivedPassword);
        const newUser = await User.create({ email: normalizedEmail, password_hash: passwordHash, full_name: row.full_name, phone: row.phone||null, role: 'student', created_by: req.user.id });
        try {
          await StudentDetail.create({ user_id: newUser._id, roll_number: row.roll_number, class_id: classId, section_id: row.section_id||null, zone: row.zone||null });
        } catch (e) { await User.findByIdAndDelete(newUser._id); results.push({ email: row.email, roll_number: row.roll_number, status: 'skipped', reasons: [e.message] }); continue; }
        await logAction(req, 'CREATE', 'user', newUser._id.toString(), { role: 'student', class_id: classId, email: normalizedEmail });
        results.push({ email: row.email, roll_number: row.roll_number, status: 'created' });
        created.push({ id: newUser._id, email: newUser.email, full_name: newUser.full_name, generatedPassword: derivedPassword });
      } catch (e) { results.push({ email: row.email, roll_number: row.roll_number, status: 'skipped', reasons: [e.message||'Failed to create user'] }); }
    }
    res.json({ message: 'Bulk import completed', summary: { total: results.length, created: results.filter(r=>r.status==='created').length, skipped: results.filter(r=>r.status==='skipped').length }, results, created });
  } catch (error) { console.error('Bulk import error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

// Teacher update student
router.put('/teacher/classes/:classId/students/:studentId', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const { email, full_name, phone, roll_number, section_id, zone, is_active } = req.body;
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id, class_id: classId }).lean();
    if (!assignments.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const studentUser = await User.findById(studentId).lean();
    if (!studentUser||studentUser.role!=='student') return res.status(404).json({ error: 'Student not found' });
    const sd = await StudentDetail.findOne({ user_id: studentId }).lean();
    if (!sd||sd.class_id?.toString()!==classId) return res.status(404).json({ error: 'Student does not belong to this class' });
    if (!hasSectionAccess(assignments, sd.section_id)||!hasZoneAccess(assignments, sd.zone)) return res.status(403).json({ error: 'You do not have access to modify this student' });
    const userUpdate = {};
    if (email !== undefined) { const ne = String(email).trim().toLowerCase(); if (!ne) return res.status(400).json({ error: 'Valid email required' }); userUpdate.email = ne; }
    if (full_name !== undefined) { const nf = String(full_name).trim(); if (!nf) return res.status(400).json({ error: 'Full name required' }); userUpdate.full_name = nf; }
    if (phone !== undefined) userUpdate.phone = phone||null;
    if (is_active !== undefined) userUpdate.is_active = is_active;
    if (Object.keys(userUpdate).length) await User.findByIdAndUpdate(studentId, userUpdate);
    const studentUpdate = {};
    if (roll_number !== undefined) { const nr = String(roll_number).trim(); if (!nr) return res.status(400).json({ error: 'Roll number required' }); studentUpdate.roll_number = nr; }
    if (section_id !== undefined) studentUpdate.section_id = section_id||null;
    if (zone !== undefined) studentUpdate.zone = zone||null;
    if (Object.keys(studentUpdate).length) await StudentDetail.findOneAndUpdate({ user_id: studentId }, studentUpdate);
    await logAction(req, 'UPDATE', 'user', studentId, { user: userUpdate, student_details: studentUpdate });
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Duplicate entry. Email or roll number already exists.' });
    console.error('Teacher update student error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher delete student
router.delete('/teacher/classes/:classId/students/:studentId', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    const assignments = await TeacherAssignment.find({ teacher_id: req.user.id, class_id: classId }).lean();
    if (!assignments.length) return res.status(403).json({ error: 'You are not assigned to this class' });
    const studentUser = await User.findById(studentId).lean();
    if (!studentUser||studentUser.role!=='student') return res.status(404).json({ error: 'Student not found' });
    const sd = await StudentDetail.findOne({ user_id: studentId }).lean();
    if (!sd||sd.class_id?.toString()!==classId) return res.status(404).json({ error: 'Student does not belong to this class' });
    if (!hasSectionAccess(assignments, sd.section_id)||!hasZoneAccess(assignments, sd.zone)) return res.status(403).json({ error: 'You do not have access to remove this student' });
    await AuditLog.updateMany({ user_id: studentId }, { $set: { user_id: null } });
    await User.updateMany({ created_by: studentId }, { $set: { created_by: null } });
    await StudentDetail.deleteMany({ user_id: studentId });
    await User.findByIdAndDelete(studentId);
    await logAction(req, 'DELETE', 'user', studentId, { class_id: classId, email: studentUser.email });
    res.json({ message: 'Student removed successfully' });
  } catch (error) { console.error('Teacher delete student error:', error); res.status(500).json({ error: 'Internal server error' }); }
});
// ==================== STUDENT ENDPOINTS ====================

// Get students for a class (admin/teacher use)
router.get('/:classId/students', verifyToken, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Support section filtering
    let sectionFilter = {};
    if (req.query.section_id) {
      sectionFilter.section_id = req.query.section_id;
    }
    
    // Support zone filtering
    if (req.query.zone) {
      sectionFilter.zone = req.query.zone;
    }
    
    // Get students with filters
    const students = await StudentDetail.find({ 
      class_id: classId,
      ...sectionFilter,
      ...Object.keys(sectionFilter).length > 0 ? { section_id: { $exists: true } } : {}
    }).sort({ full_name: 1 }).lean();
    
    // Populate user details
    const userIds = [...new Set(students.map(s => s.user_id?.toString()).filter(Boolean))];
    const users = userIds.length > 0 ? await User.find({ _id: { $in: userIds } }).select('_id full_name email').lean() : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    
    const enrichedStudents = students.map(student => ({
      ...student,
      user: userMap.get(student.user_id?.toString()) || null
    }));
    
    res.json(enrichedStudents);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student zone
router.put('/students/:studentId/zone', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { zone } = req.body;
    
    if (!zone) {
      return res.status(400).json({ error: 'Zone is required' });
    }
    
    const normalizedZone = normalizeZone(zone);
    if (!normalizedZone) {
      return res.status(400).json({ error: 'Invalid zone. Must be blue, red, or green' });
    }
    
    const student = await StudentDetail.findOneAndUpdate(
      { user_id: studentId },
      { zone: normalizedZone },
      { new: true, runValidators: true }
    ).lean();
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    await logAction(req, 'UPDATE', 'student', studentId, { zone: normalizedZone });
    res.json({ message: 'Student zone updated successfully', zone: normalizedZone });
  } catch (error) {
    console.error('Update student zone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student from class
router.delete('/:classId/students/:studentId', verifyToken, async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    
    // Check if student exists and belongs to class
    const student = await StudentDetail.findOne({ user_id: studentId }).lean();
    if (!student || student.class_id?.toString() !== classId) {
      return res.status(404).json({ error: 'Student not found in this class' });
    }
    
    // Remove student from class (set to unassigned)
    await StudentDetail.updateOne(
      { user_id: studentId },
      { $set: { class_id: null, section_id: null, zone: null } }
    );
    
    await logAction(req, 'DELETE', 'student', studentId, { 
      class_id: classId, 
      action: 'removed_from_class'
    });
    
    res.json({ message: 'Student removed from class successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TEACHER ASSIGNMENTS ====================

router.get('/teachers/list', verifyToken, isAdmin, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', is_active: true }).select('_id full_name email').sort({ full_name: 1 }).lean();
    const result = await Promise.all(teachers.map(async (t) => {
      const td = await TeacherDetail.findOne({ user_id: t._id }).select('employee_id department').lean();
      return { ...t, id: t._id, teacher_details: td ? [td] : [] };
    }));
    res.json(result);
  } catch (error) { console.error('Get teachers error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/:classId/assign-teacher', verifyToken, isAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacher_id, section_id, zone } = req.body;
    if (!teacher_id) return res.status(400).json({ error: 'Teacher ID is required' });
    const teacher = await User.findOne({ _id: teacher_id, role: 'teacher' }).select('_id').lean();
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const classData = await Class.findById(classId).select('_id').lean();
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    const assignment = await TeacherAssignment.create({ teacher_id, class_id: classId, section_id: section_id||null, zone: zone||null });
    const teacherData = await User.findById(teacher_id).select('_id full_name email').lean();
    const sectionData = section_id ? await Section.findById(section_id).select('_id name').lean() : null;
    await logAction(req, 'CREATE', 'teacher_assignment', assignment._id.toString(), { teacher_id, class_id: classId, section_id, zone });
    res.status(201).json({ message: 'Teacher assigned successfully', assignment: { ...assignment.toObject(), id: assignment._id, teacher: teacherData?{id:teacherData._id,...teacherData}:null, section: sectionData?{id:sectionData._id,...sectionData}:null } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'This teacher is already assigned to this class/section/zone combination' });
    console.error('Assign teacher error:', error); res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:classId/assign-teacher/bulk-upload', verifyToken, isAdmin, bulkUpload.single('file'), async (req, res) => {
  try {
    const { classId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });
    const classData = await Class.findById(classId).select('_id name').lean();
    if (!classData) return res.status(404).json({ error: 'Class not found' });
    const rows = parseBulkAssignmentRows(req.file.buffer);
    if (!rows.length) return res.status(400).json({ error: 'CSV file is empty' });
    const sections = await Section.find({ class_id: classId }).lean();
    const sectionsById = new Map(sections.map(s => [s._id.toString(), s]));
    const sectionsByName = new Map(sections.map(s => [s.name.trim().toLowerCase(), s]));
    const teacherIds = [...new Set(rows.map(r => r.teacher_id).filter(Boolean))];
    const teacherEmails = [...new Set(rows.map(r => r.teacher_email).filter(Boolean))];
    let teachersById = new Map(), teachersByEmail = new Map();
    if (teacherIds.length) {
      const tById = await User.find({ _id: { $in: teacherIds }, role: 'teacher', is_active: true }).select('_id full_name email').lean();
      tById.forEach(t => { teachersById.set(t._id.toString(), t); teachersByEmail.set(t.email, t); });
    }
    if (teacherEmails.length) {
      const tByEmail = await User.find({ email: { $in: teacherEmails }, role: 'teacher', is_active: true }).select('_id full_name email').lean();
      tByEmail.forEach(t => { teachersById.set(t._id.toString(), t); teachersByEmail.set(t.email, t); });
    }
    const existing = await TeacherAssignment.find({ class_id: classId }).lean();
    const existingKeys = new Set(existing.map(a => `${a.teacher_id}::${a.section_id||'__all__'}::${a.zone||'__all__'}`));
    const pendingKeys = new Set();
    const insertRows = [], skippedRows = [];
    rows.forEach(row => {
      const issues = [];
      if (!row.teacher_id && !row.teacher_email) issues.push('teacher_id or teacher_email required');
      let teacher = row.teacher_id ? teachersById.get(row.teacher_id) : null;
      if (!teacher && row.teacher_email) teacher = teachersByEmail.get(row.teacher_email);
      if (!teacher) issues.push('Teacher not found or inactive');
      let resolvedSectionId = null;
      if (row.section_id) { const s = sectionsById.get(row.section_id); if (s) resolvedSectionId = s._id; else issues.push('section_id not found'); }
      else if (row.section_name) { const s = sectionsByName.get(row.section_name.toLowerCase()); if (s) resolvedSectionId = s._id; else issues.push('section_name not found'); }
      const nz = row.zone ? normalizeZone(row.zone) : null;
      if (row.zone && !nz) issues.push('Invalid zone');
      if (!issues.length && teacher) {
        const key = `${teacher._id}::${resolvedSectionId||'__all__'}::${nz||'__all__'}`;
        if (existingKeys.has(key)) issues.push('Already exists');
        else if (pendingKeys.has(key)) issues.push('Duplicate in CSV');
        else { pendingKeys.add(key); insertRows.push({ teacher_id: teacher._id, class_id: classId, section_id: resolvedSectionId, zone: nz }); }
      }
      if (issues.length) skippedRows.push({ rowNumber: row.rowNumber, issues, teacher_id: row.teacher_id, teacher_email: row.teacher_email });
    });
    let createdCount = 0;
    if (insertRows.length) { const created = await TeacherAssignment.insertMany(insertRows); createdCount = created.length; }
    await logAction(req, 'BULK_CREATE', 'teacher_assignment', null, { class_id: classId, total_rows: rows.length, created_count: createdCount, skipped_count: skippedRows.length });
    res.status(201).json({ message: 'Bulk assignment completed', summary: { total_rows: rows.length, created_count: createdCount, skipped_count: skippedRows.length }, skipped_rows: skippedRows });
  } catch (error) { console.error('Bulk assign error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/assignments/:assignmentId', verifyToken, isAdmin, async (req, res) => {
  try {
    await TeacherAssignment.findByIdAndDelete(req.params.assignmentId);
    await logAction(req, 'DELETE', 'teacher_assignment', req.params.assignmentId);
    res.json({ message: 'Teacher assignment removed successfully' });
  } catch (error) { console.error('Remove assignment error:', error); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
