const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

sectionSchema.index({ class_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
