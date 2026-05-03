require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const TeacherDetail = require('../models/TeacherDetail');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { hashPassword } = require('../services/authService');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'edu@123';

const seedDemoUsers = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Seeding demo users...');

    // Create demo class and section
    let demoClass = await Class.findOne({ name: 'CSE-2026' });
    if (!demoClass) {
      demoClass = await Class.create({ name: 'CSE-2026', description: 'Computer Science Engineering 2026', academic_year: '2025-2026' });
      console.log('Created demo class: CSE-2026');
    }

    let demoSection = await Section.findOne({ class_id: demoClass._id, name: 'A' });
    if (!demoSection) {
      demoSection = await Section.create({ class_id: demoClass._id, name: 'A', capacity: 60 });
      console.log('Created demo section: A');
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);

    // 1. Admin user
    let admin = await User.findOne({ email: 'admin@edu.in' });
    if (!admin) {
      admin = await User.create({
        email: 'admin@edu.in',
        password_hash: passwordHash,
        full_name: 'Admin User',
        role: 'admin',
        is_active: true
      });
      console.log('Created admin user: admin@edu.in');
    } else {
      await User.findByIdAndUpdate(admin._id, { password_hash: passwordHash });
      console.log('Updated admin password: admin@edu.in');
    }

    // 2. Teacher user
    let teacher = await User.findOne({ email: 'teacher@edu.in' });
    if (!teacher) {
      teacher = await User.create({
        email: 'teacher@edu.in',
        password_hash: passwordHash,
        full_name: 'Teacher User',
        role: 'teacher',
        is_active: true,
        created_by: admin._id
      });
      await TeacherDetail.findOneAndUpdate(
        { user_id: teacher._id },
        { user_id: teacher._id, employee_id: 'EMP001', department: 'Computer Science' },
        { upsert: true }
      );
      console.log('Created teacher user: teacher@edu.in');
    } else {
      await User.findByIdAndUpdate(teacher._id, { password_hash: passwordHash });
      console.log('Updated teacher password: teacher@edu.in');
    }

    // 3. Student user
    let student = await User.findOne({ email: 'student@edu.in' });
    if (!student) {
      student = await User.create({
        email: 'student@edu.in',
        password_hash: passwordHash,
        full_name: 'Student User',
        role: 'student',
        is_active: true,
        created_by: admin._id
      });
      await StudentDetail.findOneAndUpdate(
        { user_id: student._id },
        { user_id: student._id, roll_number: 'STU001', class_id: demoClass._id, section_id: demoSection._id, zone: 'blue' },
        { upsert: true }
      );
      console.log('Created student user: student@edu.in');
    } else {
      await User.findByIdAndUpdate(student._id, { password_hash: passwordHash });
      console.log('Updated student password: student@edu.in');
    }

    console.log('\n=== Demo Users Seeded ===');
    console.log('Admin:   admin@edu.in   / ' + DEMO_PASSWORD);
    console.log('Teacher: teacher@edu.in / ' + DEMO_PASSWORD);
    console.log('Student: student@edu.in   / ' + DEMO_PASSWORD);
    console.log('========================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDemoUsers();
