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
    },
    resource_type: {
      type: String,
      default: null,
    },
    resource_id: {
      type: String,
      default: null,
    },
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
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
