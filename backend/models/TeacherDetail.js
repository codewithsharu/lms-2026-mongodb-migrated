const mongoose = require('mongoose');

const teacherDetailSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employee_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    department: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

teacherDetailSchema.index({ user_id: 1 });

module.exports = mongoose.model('TeacherDetail', teacherDetailSchema);
