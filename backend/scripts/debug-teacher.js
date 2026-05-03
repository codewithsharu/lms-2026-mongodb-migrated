require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const TeacherAssignment = require('../models/TeacherAssignment');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const Class = require('../models/Class');
const Section = require('../models/Section');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const teacher = await User.findOne({ email: 'teacher@edu.in' });
  console.log('Teacher ID:', teacher._id.toString());
  
  const assignments = await TeacherAssignment.find({ teacher_id: teacher._id }).lean();
  console.log('Assignments count:', assignments.length);
  
  for (const a of assignments) {
    console.log('  Assignment:', a._id, 'class_id:', a.class_id, 'section_id:', a.section_id, 'zone:', a.zone);
  }

  const classIds = [...new Set(assignments.map(a => a.class_id?.toString()).filter(Boolean))];
  console.log('Class IDs:', classIds);
  
  const students = await StudentDetail.find({ class_id: { $in: classIds } }).lean();
  console.log('Students in these classes:', students.length);
  
  for (const s of students) {
    const u = await User.findById(s.user_id).select('email full_name').lean();
    const sec = s.section_id ? await Section.findById(s.section_id).select('name').lean() : null;
    console.log('  Student:', u?.email, 'section:', sec?.name, 'zone:', s.zone);
  }

  await mongoose.disconnect();
})();
