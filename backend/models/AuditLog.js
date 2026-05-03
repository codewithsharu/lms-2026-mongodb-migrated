const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    user_email: {
      type: String,
      default: 'anonymous',
    },
    user_role: {
      type: String,
      default: 'anonymous',
    },
    action_type: {
      type: String,
      required: true,
      enum: [
        // Assessment actions
        'assessment_created', 'assessment_updated', 'assessment_deleted', 'assessment_published',
        'assessment_started', 'assessment_resumed', 'assessment_submitted', 'assessment_autosaved',
        'assessment_timeout', 'assessment_abandoned',
        // Data persistence actions
        'backup_created', 'backup_restored', 'backup_deleted', 'backup_validated',
        'progressive_save_started', 'progressive_save_stopped',
        // Scoring actions
        'score_calculated', 'best_score_updated', 'achievement_earned',
        'performance_analytics_updated',
        // Session actions
        'session_started', 'session_ended', 'session_conflict', 'session_takeover',
        // Data integrity actions
        'data_validated', 'data_corrupted', 'data_recovered', 'data_synced',
        // System actions
        'cleanup_performed', 'system_error', 'user_action', 'api_call'
      ],
    },
    resource_type: {
      type: String,
      required: true,
      enum: ['AssessmentAttempt', 'AttemptDataBackup', 'BestScoreRecord', 'HostedAssessment', 'User', 'System'],
    },
    resource_id: {
      type: String,
      required: true,
    },
    // API information
    api_endpoint: {
      type: String,
      default: null,
    },
    http_method: {
      type: String,
      default: null,
    },
    request_body: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    response_status: {
      type: Number,
      default: null,
    },
    // Network and client information
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
    session_token: {
      type: String,
      default: null,
    },
    // Data change tracking
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
      fields_changed: [{ type: String }],
      change_summary: { type: String, default: null },
      data_impact: {
        records_affected: { type: Number, default: 0 },
        data_size_bytes: { type: Number, default: 0 },
        critical_data_changed: { type: Boolean, default: false },
      },
    },
    // Performance metrics
    performance_metrics: {
      duration_ms: { type: Number, default: null },
      memory_usage_mb: { type: Number, default: null },
      database_operations: { type: Number, default: 0 },
      api_calls_made: { type: Number, default: 0 },
    },
    // Security and compliance
    security_info: {
      authentication_method: { type: String, default: null },
      authorization_status: { type: String, default: null },
      risk_level: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
      compliance_flags: [{ type: String }],
    },
    // Error and exception tracking
    error_info: {
      error_occurred: { type: Boolean, default: false },
      error_type: { type: String, default: null },
      error_message: { type: String, default: null },
      stack_trace: { type: String, default: null },
      recovery_attempted: { type: Boolean, default: false },
      recovery_successful: { type: Boolean, default: null },
    },
    // Business context
    business_context: {
      assessment_title: { type: String, default: null },
      student_name: { type: String, default: null },
      teacher_name: { type: String, default: null },
      class_section: { type: String, default: null },
      attempt_number: { type: Number, default: null },
      score_before: { type: Number, default: null },
      score_after: { type: Number, default: null },
    },
    // System metadata
    metadata: {
      server_version: { type: String, default: null },
      database_version: { type: String, default: null },
      node_version: { type: String, default: null },
      environment: { type: String, default: null },
      correlation_id: { type: String, default: null }, // For tracking related operations
      parent_log_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog', default: null },
      child_log_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog' }],
    },
    // Validation status
    validation_status: {
      is_valid: { type: Boolean, default: true },
      validation_errors: [{ type: String }],
      last_validated: { type: Date, default: null },
      checksum: { type: String, default: null },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Indexes for efficient querying
auditLogSchema.index({ user_id: 1, created_at: -1 });
auditLogSchema.index({ action_type: 1, created_at: -1 });
auditLogSchema.index({ resource_type: 1, resource_id: 1, created_at: -1 });
auditLogSchema.index({ 'error_info.error_occurred': 1, created_at: -1 });
auditLogSchema.index({ 'security_info.risk_level': 1, created_at: -1 });
auditLogSchema.index({ 'metadata.correlation_id': 1 });
auditLogSchema.index({ 'business_context.assessment_title': 1, created_at: -1 });

// Compound indexes for complex queries
auditLogSchema.index({ user_id: 1, action_type: 1, created_at: -1 });
auditLogSchema.index({ resource_type: 1, action_type: 1, created_at: -1 });

// TTL index for old logs (optional - keep logs for 1 year by default)
auditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
