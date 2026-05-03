const mongoose = require('mongoose');

const assessmentTemplateSchema = new mongoose.Schema(
  {
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    question_count: {
      type: Number,
      default: 0,
    },
    total_marks: {
      type: Number,
      default: 100,
    },
    passing_percentage: {
      type: Number,
      default: 40,
    },
    template_data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

assessmentTemplateSchema.index({ teacher_id: 1 });

module.exports = mongoose.model('AssessmentTemplate', assessmentTemplateSchema);
