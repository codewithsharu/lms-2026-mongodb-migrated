require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const TeacherAssignment = require('../models/TeacherAssignment');

const CLASS_NAME = process.env.DEMO_CLASS_NAME || 'CSE-2026';
const SECTION_NAME = process.env.DEMO_SECTION_NAME || 'A';
const TEACHER_EMAIL = process.env.DEMO_TEACHER_EMAIL || 'teacher@edu.in';
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'admin@edu.in';
const ZONE = process.env.DEMO_ZONE || 'blue';

const assignTeacher = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Assigning teacher...');

    const teacher = await User.findOne({ email: TEACHER_EMAIL, role: 'teacher' });
    if (!teacher) {
      throw new Error(`Teacher not found for ${TEACHER_EMAIL}`);
    }

    const admin = await User.findOne({ email: ADMIN_EMAIL, role: 'admin' });
    if (!admin) {
      throw new Error(`Admin not found for ${ADMIN_EMAIL}`);
    }

    const targetClass = await Class.findOne({ name: CLASS_NAME });
    if (!targetClass) {
      throw new Error(`Class not found for ${CLASS_NAME}`);
    }

    const targetSection = await Section.findOne({ class_id: targetClass._id, name: SECTION_NAME });
    if (!targetSection) {
      throw new Error(`Section not found for ${CLASS_NAME} ${SECTION_NAME}`);
    }

    await TeacherAssignment.findOneAndUpdate(
      {
        teacher_id: teacher._id,
        class_id: targetClass._id,
        section_id: targetSection._id,
        zone: ZONE
      },
      {
        teacher_id: teacher._id,
        class_id: targetClass._id,
        section_id: targetSection._id,
        zone: ZONE,
        assigned_by: admin._id
      },
      { upsert: true, new: true }
    );

    console.log('Assignment saved:');
    console.log(`Teacher: ${TEACHER_EMAIL}`);
    console.log(`Class: ${CLASS_NAME}`);
    console.log(`Section: ${SECTION_NAME}`);
    console.log(`Zone: ${ZONE}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Assignment error:', error.message || error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

assignTeacher();
