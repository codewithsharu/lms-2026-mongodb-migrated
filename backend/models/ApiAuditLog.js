/**
 * API Audit Log Model
 * Enterprise-level API monitoring and audit trail
 */

const mongoose = require('mongoose');

const apiAuditLogSchema = new mongoose.Schema({
  // Request Information
  request_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // User Information
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user_email: {
    type: String,
    default: 'anonymous'
  },
  user_role: {
    type: String,
    default: 'anonymous'
  },
  
  // API Details
  api_module: {
    type: String,
    required: true,
    enum: [
      'auth', 'users', 'classes', 'sections', 'students', 'teachers',
      'assessments', 'exams', 'attempts', 'reports', 'profiles',
      'zones', 'assignments', 'monitoring', 'system'
    ]
  },
  api_endpoint: {
    type: String,
    required: true
  },
  http_method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  },
  api_version: {
    type: String,
    default: 'v1'
  },
  
  // Request Details
  request_headers: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  request_body: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  request_params: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  request_query: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Response Details
  response_status: {
    type: Number,
    required: true
  },
  response_body: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  response_headers: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Performance Metrics
  performance: {
    request_timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    response_timestamp: {
      type: Date,
      required: true
    },
    duration_ms: {
      type: Number,
      required: true
    },
    database_queries: {
      type: Number,
      default: 0
    },
    cache_hits: {
      type: Number,
      default: 0
    },
    cache_misses: {
      type: Number,
      default: 0
    }
  },
  
  // Network Information
  network: {
    ip_address: {
      type: String,
      required: true
    },
    user_agent: {
      type: String,
      default: null
    },
    referer: {
      type: String,
      default: null
    },
    origin: {
      type: String,
      default: null
    }
  },
  
  // Security Information
  security: {
    authentication_method: {
      type: String,
      enum: ['jwt', 'session', 'api_key', 'oauth', 'anonymous'],
      default: 'anonymous'
    },
    authorization_status: {
      type: String,
      enum: ['granted', 'denied', 'bypassed'],
      default: 'granted'
    },
    permissions_required: [{
      type: String
    }],
    permissions_granted: [{
      type: String
    }],
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    security_flags: [{
      type: String
    }]
  },
  
  // Business Context
  business_context: {
    operation_type: {
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'execute', 'export', 'import'],
      required: true
    },
    resource_type: {
      type: String,
      required: true
    },
    resource_id: {
      type: String,
      default: null
    },
    resource_name: {
      type: String,
      default: null
    },
    business_impact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    compliance_flags: [{
      type: String
    }]
  },
  
  // Error Information
  error: {
    error_occurred: {
      type: Boolean,
      default: false
    },
    error_type: {
      type: String,
      default: null
    },
    error_code: {
      type: String,
      default: null
    },
    error_message: {
      type: String,
      default: null
    },
    stack_trace: {
      type: String,
      default: null
    },
    error_category: {
      type: String,
      enum: ['validation', 'authorization', 'business_logic', 'system', 'network', 'database'],
      default: null
    }
  },
  
  // System Information
  system: {
    server_id: {
      type: String,
      default: 'server_1'
    },
    node_version: {
      type: String,
      default: process.version
    },
    platform: {
      type: String,
      default: process.platform
    },
    memory_usage_mb: {
      type: Number,
      default: 0
    },
    cpu_usage_percent: {
      type: Number,
      default: 0
    }
  },
  
  // Correlation ID for tracking related operations
  correlation_id: {
    type: String,
    default: null
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false },
  collection: 'api_audit_logs'
});

// Indexes for efficient querying
apiAuditLogSchema.index({ user_id: 1, created_at: -1 });
apiAuditLogSchema.index({ api_module: 1, created_at: -1 });
apiAuditLogSchema.index({ api_endpoint: 1, created_at: -1 });
apiAuditLogSchema.index({ 'response_status': 1, created_at: -1 });
apiAuditLogSchema.index({ 'error.error_occurred': 1, created_at: -1 });
apiAuditLogSchema.index({ 'security.risk_level': 1, created_at: -1 });
apiAuditLogSchema.index({ correlation_id: 1 });
apiAuditLogSchema.index({ 'network.ip_address': 1, created_at: -1 });
apiAuditLogSchema.index({ 'business_context.operation_type': 1, created_at: -1 });

// Compound indexes for complex queries
apiAuditLogSchema.index({ user_id: 1, api_module: 1, created_at: -1 });
apiAuditLogSchema.index({ api_module: 1, 'response_status': 1, created_at: -1 });
apiAuditLogSchema.index({ 'security.risk_level': 1, 'error.error_occurred': 1, created_at: -1 });

// TTL index for old logs (keep for 1 year by default)
apiAuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Virtual fields
apiAuditLogSchema.virtual('is_success').get(function() {
  return this.response_status >= 200 && this.response_status < 300;
});

apiAuditLogSchema.virtual('is_error').get(function() {
  return this.response_status >= 400 || this.error.error_occurred;
});

apiAuditLogSchema.virtual('is_slow').get(function() {
  return this.performance.duration_ms > 2000; // 2 seconds threshold
});

// Static methods
apiAuditLogSchema.statics.getApiStatistics = async function(filters = {}) {
  const {
    startDate,
    endDate,
    apiModule,
    userId,
    riskLevel,
    operationType
  } = filters;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.created_at = {};
    if (startDate) matchStage.created_at.$gte = new Date(startDate);
    if (endDate) matchStage.created_at.$lte = new Date(endDate);
  }
  
  if (apiModule) matchStage.api_module = apiModule;
  if (userId) matchStage.user_id = userId;
  if (riskLevel) matchStage['security.risk_level'] = riskLevel;
  if (operationType) matchStage['business_context.operation_type'] = operationType;
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total_requests: { $sum: 1 },
        successful_requests: {
          $sum: { $cond: [{ $gte: ['$response_status', 200] }, 1, 0] }
        },
        failed_requests: {
          $sum: { $cond: [{ $gte: ['$response_status', 400] }, 1, 0] }
        },
        avg_response_time: { $avg: '$performance.duration_ms' },
        max_response_time: { $max: '$performance.duration_ms' },
        min_response_time: { $min: '$performance.duration_ms' },
        unique_users: { $addToSet: '$user_id' },
        error_count: { $sum: { $cond: ['$error.error_occurred', 1, 0] } }
      }
    }
  ];
  
  const results = await this.aggregate(pipeline);
  return results[0] || {
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    avg_response_time: 0,
    max_response_time: 0,
    min_response_time: 0,
    unique_users: [],
    error_count: 0
  };
};

apiAuditLogSchema.statics.getModuleUsage = async function(timeRange = '24h') {
  const timeRanges = {
    '1h': 1 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const timeRangeMs = timeRanges[timeRange] || timeRanges['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  return this.aggregate([
    { $match: { created_at: { $gte: startTime } } },
    {
      $group: {
        _id: '$api_module',
        request_count: { $sum: 1 },
        avg_response_time: { $avg: '$performance.duration_ms' },
        error_count: {
          $sum: { $cond: ['$error.error_occurred', 1, 0] }
        },
        unique_users: { $addToSet: '$user_id' }
      }
    },
    { $sort: { request_count: -1 } }
  ]);
};

apiAuditLogSchema.statics.getErrorAnalysis = async function(timeRange = '24h') {
  const timeRanges = {
    '1h': 1 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  
  const timeRangeMs = timeRanges[timeRange] || timeRanges['24h'];
  const startTime = new Date(Date.now() - timeRangeMs);
  
  return this.aggregate([
    { $match: { 
      created_at: { $gte: startTime },
      $or: [
        { 'response_status': { $gte: 400 } },
        { 'error.error_occurred': true }
      ]
    }},
    {
      $group: {
        _id: {
          api_module: '$api_module',
          api_endpoint: '$api_endpoint',
          error_type: '$error.error_type',
          response_status: '$response_status'
        },
        count: { $sum: 1 },
        avg_response_time: { $avg: '$performance.duration_ms' },
        unique_users: { $addToSet: '$user_id' },
        last_occurred: { $max: '$created_at' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);
};

// Instance methods
apiAuditLogSchema.methods.calculateRiskLevel = function() {
  let riskScore = 0;
  
  // Response status risk
  if (this.response_status >= 500) riskScore += 4;
  else if (this.response_status >= 400) riskScore += 2;
  
  // Duration risk
  if (this.performance.duration_ms > 10000) riskScore += 3;
  else if (this.performance.duration_ms > 5000) riskScore += 2;
  else if (this.performance.duration_ms > 2000) riskScore += 1;
  
  // Error risk
  if (this.error.error_occurred) riskScore += 3;
  
  // Operation risk
  if (this.business_context.operation_type === 'delete') riskScore += 2;
  if (this.business_context.business_impact === 'critical') riskScore += 2;
  
  // Determine risk level
  if (riskScore >= 7) return 'critical';
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
};

apiAuditLogSchema.methods.toSafeResponse = function() {
  return {
    request_id: this.request_id,
    user_id: this.user_id,
    api_module: this.api_module,
    api_endpoint: this.api_endpoint,
    http_method: this.http_method,
    response_status: this.response_status,
    performance: {
      duration_ms: this.performance.duration_ms,
      database_queries: this.performance.database_queries
    },
    network: {
      ip_address: this.network.ip_address
    },
    business_context: this.business_context,
    error: this.error.error_occurred ? {
      error_type: this.error.error_type,
      error_message: this.error.message
    } : null,
    created_at: this.created_at
  };
};

module.exports = mongoose.model('ApiAuditLog', apiAuditLogSchema);
