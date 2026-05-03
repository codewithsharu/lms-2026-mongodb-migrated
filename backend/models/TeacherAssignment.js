const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    section_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    zone: {
      type: String,
      enum: ['blue', 'red', 'green', null],
      default: null,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

teacherAssignmentSchema.index(
  { teacher_id: 1, class_id: 1, section_id: 1, zone: 1 },
  { unique: true }
);
teacherAssignmentSchema.index({ teacher_id: 1 });

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
