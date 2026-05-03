const mongoose = require('mongoose');

const assessmentAttemptSchema = new mongoose.Schema(
  {
    hosted_assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostedAssessment',
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attempt_number: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: 'in_progress',
      enum: ['in_progress', 'submitted', 'auto_submitted'],
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: null,
    },
    total_marks: {
      type: Number,
      default: null,
    },
    percentage: {
      type: Number,
      default: null,
    },
    correct_count: {
      type: Number,
      default: 0,
    },
    total_questions: {
      type: Number,
      default: 0,
    },
    // Simple test code for access control
    test_code: {
      type: String,
      default: null,
    },
    // Detailed section-wise results
    section_results: {
      mcq: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        wrong: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        marks_obtained: { type: Number, default: 0 },
        total_marks: { type: Number, default: 0 }
      },
      coding: {
        attempted: { type: Number, default: 0 },
        executed: { type: Number, default: 0 },
        total_test_cases: { type: Number, default: 0 },
        passed_test_cases: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        marks_obtained: { type: Number, default: 0 },
        total_marks: { type: Number, default: 0 },
        challenges: [{
          challenge_id: String,
          attempted: { type: Boolean, default: false },
          executed: { type: Boolean, default: false },
          total_test_cases: { type: Number, default: 0 },
          passed_test_cases: { type: Number, default: 0 },
          marks_obtained: { type: Number, default: 0 },
          execution_time: { type: Number, default: 0 },
          last_submission: { type: Date, default: null }
        }]
      }
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    submitted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

assessmentAttemptSchema.index(
  { hosted_assessment_id: 1, student_id: 1, attempt_number: 1 },
  { unique: true }
);
assessmentAttemptSchema.index({ student_id: 1 });
assessmentAttemptSchema.index({ hosted_assessment_id: 1 });
assessmentAttemptSchema.index({ status: 1 });

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
