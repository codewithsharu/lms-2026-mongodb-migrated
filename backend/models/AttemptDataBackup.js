const mongoose = require('mongoose');

const attemptDataBackupSchema = new mongoose.Schema(
  {
    attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: true,
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hosted_assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostedAssessment',
      required: true,
    },
    backup_type: {
      type: String,
      required: true,
      enum: ['auto_save', 'manual_save', 'session_backup', 'crash_recovery', 'submit_backup'],
    },
    backup_timestamp: {
      type: Date,
      default: Date.now,
    },
    // Complete attempt state snapshot
    attempt_state: {
      status: String,
      current_section: String,
      remaining_seconds: Number,
      section_completion_order: {
        mcq_completed_at: Date,
        coding_entered_at: Date,
      },
      answers: mongoose.Schema.Types.Mixed,
      // UI state
      ui_saved_responses: mongoose.Schema.Types.Mixed,
      ui_marked_for_review: mongoose.Schema.Types.Mixed,
      ui_current_question_index: Number,
      // Coding submissions state
      coding_submissions: mongoose.Schema.Types.Mixed,
      coding_frame_height: Number,
      coding_selected_challenge_index: Number,
      // Session metadata
      session_token: String,
      session_updated_at: Date,
      // Browser state
      browser_info: {
        user_agent: String,
        screen_resolution: String,
        timezone: String,
        language: String,
      },
      // Network state
      network_info: {
        is_online: Boolean,
        connection_type: String,
        effective_bandwidth: Number,
      },
    },
    // Computed scores at backup time
    computed_scores: {
      mcq: {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        wrong: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        marks_obtained: { type: Number, default: 0 },
        total_marks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
      coding: {
        attempted: { type: Number, default: 0 },
        executed: { type: Number, default: 0 },
        total_test_cases: { type: Number, default: 0 },
        passed_test_cases: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        marks_obtained: { type: Number, default: 0 },
        total_marks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        challenges: [{
          challenge_id: String,
          attempted: { type: Boolean, default: false },
          executed: { type: Boolean, default: false },
          total_test_cases: { type: Number, default: 0 },
          passed_test_cases: { type: Number, default: 0 },
          marks_obtained: { type: Number, default: 0 },
          execution_time: { type: Number, default: 0 },
          last_submission: { type: Date, default: null },
        }],
      },
      overall: {
        total_score: { type: Number, default: 0 },
        total_marks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        correct_count: { type: Number, default: 0 },
        total_questions: { type: Number, default: 0 },
      },
    },
    // Data integrity hash
    data_hash: String,
    // Backup metadata
    backup_metadata: {
      backup_size_bytes: Number,
      compression_used: Boolean,
      backup_trigger: String, // 'timer', 'user_action', 'network_change', 'page_unload'
      backup_sequence: Number, // Incremental backup number
      is_incremental: Boolean,
      parent_backup_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttemptDataBackup',
      },
    },
    // Recovery information
    recovery_info: {
      is_restorable: { type: Boolean, default: true },
      restore_attempts: { type: Number, default: 0 },
      last_restore_attempt: Date,
      restore_success_rate: { type: Number, default: 0 },
    },
    // Validation status
    validation_status: {
      is_valid: { type: Boolean, default: true },
      validation_errors: [String],
      last_validated: Date,
      checksum: String,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for efficient querying
attemptDataBackupSchema.index({ attempt_id: 1, backup_timestamp: -1 });
attemptDataBackupSchema.index({ student_id: 1, hosted_assessment_id: 1, backup_timestamp: -1 });
attemptDataBackupSchema.index({ backup_type: 1, backup_timestamp: -1 });
attemptDataBackupSchema.index({ 'attempt_state.status': 1 });
attemptDataBackupSchema.index({ 'validation_status.is_valid': 1 });
attemptDataBackupSchema.index({ 'recovery_info.is_restorable': 1 });

// Compound index for finding latest valid backup
attemptDataBackupSchema.index(
  { attempt_id: 1, 'validation_status.is_valid': 1, backup_timestamp: -1 }
);

module.exports = mongoose.model('AttemptDataBackup', attemptDataBackupSchema);
