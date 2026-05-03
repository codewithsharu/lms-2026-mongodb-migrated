require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const StudentDetail = require('../models/StudentDetail');
const TeacherDetail = require('../models/TeacherDetail');
const TeacherAssignment = require('../models/TeacherAssignment');
const AssessmentTemplate = require('../models/AssessmentTemplate');
const HostedAssessment = require('../models/HostedAssessment');
const { hashPassword } = require('../services/authService');

const PASSWORD = 'edu@123';

const log = (msg) => console.log(`  ✓ ${msg}`);

const seedFullDemo = async () => {
  try {
    await connectDB();
    console.log('\n🚀 Seeding full demo data...\n');
    const passwordHash = await hashPassword(PASSWORD);

    // ─── 1. ADMIN ───
    let admin = await User.findOne({ email: 'admin@edu.in' });
    if (!admin) {
      admin = await User.create({ email: 'admin@edu.in', password_hash: passwordHash, full_name: 'Admin User', role: 'admin', is_active: true });
      log('Created admin: admin@edu.in');
    } else {
      await User.findByIdAndUpdate(admin._id, { password_hash: passwordHash });
      log('Admin exists: admin@edu.in (password reset)');
    }

    // ─── 2. CLASSES ───
    const classData = [
      { name: 'CSE-2026', description: 'Computer Science Engineering 2026', academic_year: '2025-2026' },
      { name: 'ECE-2026', description: 'Electronics & Communication 2026', academic_year: '2025-2026' },
      { name: 'MECH-2026', description: 'Mechanical Engineering 2026', academic_year: '2025-2026' }
    ];
    const classMap = {};
    for (const cd of classData) {
      let cls = await Class.findOne({ name: cd.name });
      if (!cls) cls = await Class.create(cd);
      classMap[cd.name] = cls;
      log(`Class: ${cd.name}`);
    }

    // ─── 3. SECTIONS ───
    const sectionData = [
      { class_name: 'CSE-2026', sections: ['A', 'B'] },
      { class_name: 'ECE-2026', sections: ['A'] },
      { class_name: 'MECH-2026', sections: ['A'] }
    ];
    const sectionMap = {};
    for (const sd of sectionData) {
      const cls = classMap[sd.class_name];
      for (const secName of sd.sections) {
        let sec = await Section.findOne({ class_id: cls._id, name: secName });
        if (!sec) sec = await Section.create({ class_id: cls._id, name: secName, capacity: 60 });
        sectionMap[`${sd.class_name}-${secName}`] = sec;
        log(`Section: ${sd.class_name} → ${secName}`);
      }
    }

    // ─── 4. TEACHERS ───
    const teacherData = [
      { email: 'teacher@edu.in', full_name: 'Teacher User', employee_id: 'EMP001', department: 'Computer Science' },
      { email: 'teacher2@edu.in', full_name: 'Ravi Kumar', employee_id: 'EMP002', department: 'Electronics' },
      { email: 'teacher3@edu.in', full_name: 'Priya Sharma', employee_id: 'EMP003', department: 'Mathematics' }
    ];
    const teacherMap = {};
    for (const td of teacherData) {
      let teacher = await User.findOne({ email: td.email });
      if (!teacher) {
        teacher = await User.create({ email: td.email, password_hash: passwordHash, full_name: td.full_name, role: 'teacher', is_active: true, created_by: admin._id });
      } else {
        await User.findByIdAndUpdate(teacher._id, { password_hash: passwordHash });
      }
      await TeacherDetail.findOneAndUpdate(
        { user_id: teacher._id },
        { user_id: teacher._id, employee_id: td.employee_id, department: td.department },
        { upsert: true }
      );
      teacherMap[td.email] = teacher;
      log(`Teacher: ${td.email} (${td.full_name})`);
    }

    // ─── 5. STUDENTS ───
    const studentData = [
      { email: 'student@edu.in', full_name: 'Student User', roll: 'CSE001', class_name: 'CSE-2026', section: 'A', zone: 'blue' },
      { email: 'student2@edu.in', full_name: 'Ankit Verma', roll: 'CSE002', class_name: 'CSE-2026', section: 'A', zone: 'blue' },
      { email: 'student3@edu.in', full_name: 'Sneha Reddy', roll: 'CSE003', class_name: 'CSE-2026', section: 'B', zone: 'red' },
      { email: 'student4@edu.in', full_name: 'Rahul Joshi', roll: 'ECE001', class_name: 'ECE-2026', section: 'A', zone: 'green' },
      { email: 'student5@edu.in', full_name: 'Meera Patel', roll: 'CSE004', class_name: 'CSE-2026', section: 'A', zone: 'blue' }
    ];
    const studentMap = {};
    for (const sd of studentData) {
      let student = await User.findOne({ email: sd.email });
      if (!student) {
        student = await User.create({ email: sd.email, password_hash: passwordHash, full_name: sd.full_name, role: 'student', is_active: true, created_by: admin._id });
      } else {
        await User.findByIdAndUpdate(student._id, { password_hash: passwordHash });
      }
      const cls = classMap[sd.class_name];
      const sec = sectionMap[`${sd.class_name}-${sd.section}`];
      await StudentDetail.findOneAndUpdate(
        { user_id: student._id },
        { user_id: student._id, roll_number: sd.roll, class_id: cls._id, section_id: sec._id, zone: sd.zone },
        { upsert: true }
      );
      studentMap[sd.email] = student;
      log(`Student: ${sd.email} (${sd.full_name}) → ${sd.class_name} ${sd.section} [${sd.zone}]`);
    }

    // ─── 6. TEACHER ASSIGNMENTS ───
    const assignmentData = [
      { teacher_email: 'teacher@edu.in', class_name: 'CSE-2026', section: 'A', zone: null },
      { teacher_email: 'teacher@edu.in', class_name: 'CSE-2026', section: 'B', zone: null },
      { teacher_email: 'teacher2@edu.in', class_name: 'ECE-2026', section: 'A', zone: null },
      { teacher_email: 'teacher3@edu.in', class_name: 'CSE-2026', section: 'A', zone: 'blue' }
    ];
    for (const ad of assignmentData) {
      const teacher = teacherMap[ad.teacher_email];
      const cls = classMap[ad.class_name];
      const sec = ad.section ? sectionMap[`${ad.class_name}-${ad.section}`] : null;
      const existing = await TeacherAssignment.findOne({
        teacher_id: teacher._id, class_id: cls._id,
        ...(sec ? { section_id: sec._id } : {}),
        ...(ad.zone ? { zone: ad.zone } : {})
      });
      if (!existing) {
        await TeacherAssignment.create({
          teacher_id: teacher._id, class_id: cls._id,
          section_id: sec?._id || null, zone: ad.zone || null,
          assigned_by: admin._id
        });
      }
      log(`Assignment: ${ad.teacher_email} → ${ad.class_name} ${ad.section || 'all'} ${ad.zone || 'all zones'}`);
    }

    // ─── 7. ASSESSMENT TEMPLATE ───
    const teacher1 = teacherMap['teacher@edu.in'];
    let template = await AssessmentTemplate.findOne({ teacher_id: teacher1._id, title: 'Data Structures Mid-Term' });
    if (!template) {
      template = await AssessmentTemplate.create({
        teacher_id: teacher1._id,
        title: 'Data Structures Mid-Term',
        subject: 'Data Structures',
        description: 'Mid-term examination covering arrays, linked lists, stacks, and queues',
        question_count: 5,
        total_marks: 10,
        passing_percentage: 40,
        template_data: {
          questions: [
            {
              type: 'mcq', question: 'What is the time complexity of binary search?',
              options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
              correctOptions: [1], answerMode: 'single', marks: 2
            },
            {
              type: 'mcq', question: 'Which data structure uses FIFO principle?',
              options: ['Stack', 'Queue', 'Tree', 'Graph'],
              correctOptions: [1], answerMode: 'single', marks: 2
            },
            {
              type: 'mcq', question: 'Which of these are linear data structures?',
              options: ['Array', 'Tree', 'Stack', 'Graph'],
              correctOptions: [0, 2], answerMode: 'multiple', marks: 2
            },
            {
              type: 'blank', question: 'A stack follows the _____ principle.',
              blankAnswer: 'LIFO', marks: 2
            },
            {
              type: 'mcq', question: 'What is the worst-case time complexity of QuickSort?',
              options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
              correctOptions: [2], answerMode: 'single', marks: 2
            }
          ]
        },
        is_active: true
      });
      log('Template: Data Structures Mid-Term (5 questions, 10 marks)');
    } else {
      log('Template exists: Data Structures Mid-Term');
    }

    // ─── 8. HOSTED EXAM ───
    const cseClass = classMap['CSE-2026'];
    const sectionA = sectionMap['CSE-2026-A'];
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000); // started 1 hour ago
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // ends tomorrow

    let hosted = await HostedAssessment.findOne({ template_id: template._id, host_id: teacher1._id });
    if (!hosted) {
      hosted = await HostedAssessment.create({
        template_id: template._id,
        host_id: teacher1._id,
        class_id: cseClass._id,
        section_id: sectionA._id,
        zone: null,
        allow_resume: true,
        duration_minutes: 30,
        max_attempts: 3,
        result_mode: 'immediate',
        publish_status: 'published',
        start_time: startTime,
        end_time: endTime,
        exam_title: 'DS Mid-Term Exam - CSE A',
        instructions: 'Answer all questions. You have 30 minutes. No negative marking.'
      });
      log('Hosted Exam: DS Mid-Term Exam - CSE A (PUBLISHED, active now)');
    } else {
      // Update times to ensure it's active
      await HostedAssessment.findByIdAndUpdate(hosted._id, {
        start_time: startTime, end_time: endTime, publish_status: 'published'
      });
      log('Hosted Exam exists (times updated to be active now)');
    }

    // ─── SUMMARY ───
    console.log('\n══════════════════════════════════════════════');
    console.log('  DEMO DATA SEEDED SUCCESSFULLY');
    console.log('══════════════════════════════════════════════');
    console.log('\n  📋 Accounts (all passwords: edu@123)');
    console.log('  ─────────────────────────────────────');
    console.log('  Admin:    admin@edu.in');
    console.log('  Teacher:  teacher@edu.in  (CSE-2026 A & B)');
    console.log('  Teacher:  teacher2@edu.in (ECE-2026 A)');
    console.log('  Teacher:  teacher3@edu.in (CSE-2026 A blue)');
    console.log('  Student:  student@edu.in  (CSE-2026 A blue)');
    console.log('  Student:  student2@edu.in (CSE-2026 A blue)');
    console.log('  Student:  student3@edu.in (CSE-2026 B red)');
    console.log('  Student:  student4@edu.in (ECE-2026 A green)');
    console.log('  Student:  student5@edu.in (CSE-2026 A blue)');
    console.log('\n  📝 Exam Ready');
    console.log('  ─────────────────────────────────────');
    console.log('  "DS Mid-Term Exam - CSE A" is PUBLISHED');
    console.log('  5 questions, 10 marks, 30 min duration');
    console.log('  Students in CSE-2026 Section A can attempt');
    console.log('  (student@edu.in, student2@edu.in, student5@edu.in)');
    console.log('══════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedFullDemo();
