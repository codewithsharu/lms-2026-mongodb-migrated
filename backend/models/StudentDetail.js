const mongoose = require('mongoose');

const studentDetailSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roll_number: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

studentDetailSchema.index({ user_id: 1 }, { unique: true });
studentDetailSchema.index({ roll_number: 1 }, { unique: true });
studentDetailSchema.index({ class_id: 1 });
studentDetailSchema.index({ user_id: 1, class_id: 1 });

module.exports = mongoose.model('StudentDetail', studentDetailSchema);
