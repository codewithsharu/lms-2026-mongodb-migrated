const mongoose = require('mongoose');

const hostedAssessmentSchema = new mongoose.Schema(
  {
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentTemplate',
      default: null,
    },
    template_ids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'AssessmentTemplate',
      default: [],
    },
    host_id: {
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
    allow_resume: {
      type: Boolean,
      default: true,
    },
    duration_minutes: {
      type: Number,
      required: true,
    },
    max_attempts: {
      type: Number,
      default: 1,
    },
    result_mode: {
      type: String,
      required: true,
      enum: ['immediate', 'manual', 'after_end'],
    },
    publish_status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'closed'],
    },
    start_time: {
      type: Date,
      default: null,
    },
    end_time: {
      type: Date,
      default: null,
    },
    coding_section: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    exam_title: {
      type: String,
      default: null,
    },
    instructions: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

hostedAssessmentSchema.index({ host_id: 1 });
hostedAssessmentSchema.index({ class_id: 1, section_id: 1, zone: 1 });

module.exports = mongoose.model('HostedAssessment', hostedAssessmentSchema);
