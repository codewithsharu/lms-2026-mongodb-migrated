const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

class AuditService {
  constructor() {
    this.correlationMap = new Map(); // Request ID -> correlation ID
    this.performanceMap = new Map(); // Request ID -> performance tracking
  }

  /**
   * Generate a unique correlation ID for tracking related operations
   */
  generateCorrelationId() {
    return crypto.randomUUID();
  }

  /**
   * Start tracking an operation with correlation ID
   */
  startOperationTracking(requestId, correlationId = null) {
    const corrId = correlationId || this.generateCorrelationId();
    this.correlationMap.set(requestId, corrId);
    this.performanceMap.set(requestId, {
      startTime: Date.now(),
      databaseOperations: 0,
      apiCalls: 0,
    });
    return corrId;
  }

  /**
   * End tracking and calculate performance metrics
   */
  endOperationTracking(requestId) {
    const tracking = this.performanceMap.get(requestId);
    if (tracking) {
      const duration = Date.now() - tracking.startTime;
      const metrics = {
        duration_ms: duration,
        database_operations: tracking.databaseOperations,
        api_calls_made: tracking.apiCalls,
      };
      this.performanceMap.delete(requestId);
      return metrics;
    }
    return null;
  }

  /**
   * Track database operation
   */
  trackDatabaseOperation(requestId) {
    const tracking = this.performanceMap.get(requestId);
    if (tracking) {
      tracking.databaseOperations++;
    }
  }

  /**
   * Track API call
   */
  trackApiCall(requestId) {
    const tracking = this.performanceMap.get(requestId);
    if (tracking) {
      tracking.apiCalls++;
    }
  }

  /**
   * Create a comprehensive audit log entry
   */
  async logAction({
    userId,
    userEmail,
    userRole,
    actionType,
    resourceType,
    resourceId,
    apiEndpoint,
    httpMethod,
    requestBody,
    responseStatus,
    ipAddress,
    userAgent,
    sessionToken,
    changes,
    businessContext,
    errorInfo,
    securityInfo,
    correlationId,
    parentLogId,
    requestId,
  }) {
    try {
      // Get performance metrics if available
      let performanceMetrics = null;
      if (requestId) {
        performanceMetrics = this.endOperationTracking(requestId);
        correlationId = correlationId || this.correlationMap.get(requestId);
      }

      // Calculate data impact
      let dataImpact = { records_affected: 0, data_size_bytes: 0, critical_data_changed: false };
      if (changes) {
        dataImpact.records_affected = 1; // Basic calculation
        if (changes.before || changes.after) {
          dataImpact.data_size_bytes = JSON.stringify(changes.before || changes.after).length;
        }
        dataImpact.critical_data_changed = this.isCriticalDataChange(actionType, resourceType, changes);
      }

      // Determine risk level
      let riskLevel = 'low';
      if (errorInfo?.error_occurred) riskLevel = 'high';
      if (securityInfo?.authorization_status === 'denied') riskLevel = 'critical';
      if (dataImpact.critical_data_changed) riskLevel = 'medium';

      // Create audit log entry
      const auditLog = new AuditLog({
        user_id: userId,
        user_email: userEmail || 'anonymous',
        user_role: userRole || 'anonymous',
        action_type: actionType,
        resource_type: resourceType,
        resource_id: String(resourceId),
        api_endpoint: apiEndpoint,
        http_method: httpMethod,
        request_body: this.sanitizeRequestBody(requestBody),
        response_status: responseStatus,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_token: sessionToken,
        changes: changes ? {
          before: changes.before,
          after: changes.after,
          fields_changed: changes.fields_changed || this.extractChangedFields(changes.before, changes.after),
          change_summary: changes.change_summary || this.generateChangeSummary(changes),
          data_impact,
        } : undefined,
        performance_metrics: performanceMetrics,
        security_info: {
          authentication_method: securityInfo?.authenticationMethod,
          authorization_status: securityInfo?.authorizationStatus,
          risk_level: riskLevel,
          compliance_flags: securityInfo?.complianceFlags || [],
        },
        error_info: errorInfo ? {
          error_occurred: true,
          error_type: errorInfo.type,
          error_message: errorInfo.message,
          stack_trace: errorInfo.stackTrace,
          recovery_attempted: errorInfo.recoveryAttempted || false,
          recovery_successful: errorInfo.recoverySuccessful,
        } : undefined,
        business_context: businessContext,
        metadata: {
          server_version: process.env.npm_package_version,
          node_version: process.version,
          environment: process.env.NODE_ENV,
          correlation_id: correlationId,
          parent_log_id: parentLogId,
        },
        validation_status: {
          is_valid: true,
          validation_errors: [],
          last_validated: new Date(),
          checksum: this.generateChecksum({ actionType, resourceType, resourceId }),
        },
      });

      await auditLog.save();

      // Update parent log if applicable
      if (parentLogId) {
        await AuditLog.findByIdAndUpdate(parentLogId, {
          $push: { 'metadata.child_log_ids': auditLog._id }
        });
      }

      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error to avoid breaking main operations
      return null;
    }
  }

  /**
   * Log assessment attempt actions
   */
  async logAssessmentAction({
    userId,
    userEmail,
    userRole,
    actionType,
    attemptId,
    assessmentTitle,
    attemptNumber,
    scoreBefore,
    scoreAfter,
    req,
    changes,
    errorInfo,
  }) {
    return this.logAction({
      userId,
      userEmail,
      userRole,
      actionType,
      resourceType: 'AssessmentAttempt',
      resourceId: attemptId,
      apiEndpoint: req?.originalUrl,
      httpMethod: req?.method,
      requestBody: req?.body,
      responseStatus: req?.res?.statusCode,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      sessionToken: req?.headers['x-exam-session-token'],
      changes,
      businessContext: {
        assessment_title: assessmentTitle,
        attempt_number: attemptNumber,
        score_before: scoreBefore,
        score_after: scoreAfter,
      },
      errorInfo,
      securityInfo: {
        authenticationMethod: 'jwt',
        authorizationStatus: 'granted',
      },
    });
  }

  /**
   * Log backup operations
   */
  async logBackupAction({
    userId,
    userEmail,
    userRole,
    actionType,
    backupId,
    attemptId,
    backupType,
    backupSize,
    req,
    changes,
    errorInfo,
  }) {
    return this.logAction({
      userId,
      userEmail,
      userRole,
      actionType,
      resourceType: 'AttemptDataBackup',
      resourceId: backupId,
      apiEndpoint: req?.originalUrl,
      httpMethod: req?.method,
      requestBody: req?.body,
      responseStatus: req?.res?.statusCode,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      changes,
      businessContext: {
        backup_type: backupType,
        backup_size_bytes: backupSize,
      },
      errorInfo,
      securityInfo: {
        authenticationMethod: 'jwt',
        authorizationStatus: 'granted',
      },
    });
  }

  /**
   * Log scoring actions
   */
  async logScoringAction({
    userId,
    userEmail,
    userRole,
    actionType,
    recordId,
    assessmentTitle,
    studentName,
    scoreBefore,
    scoreAfter,
    achievements,
    req,
    changes,
    errorInfo,
  }) {
    return this.logAction({
      userId,
      userEmail,
      userRole,
      actionType,
      resourceType: 'BestScoreRecord',
      resourceId: recordId,
      apiEndpoint: req?.originalUrl,
      httpMethod: req?.method,
      requestBody: req?.body,
      responseStatus: req?.res?.statusCode,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      changes,
      businessContext: {
        assessment_title: assessmentTitle,
        student_name: studentName,
        score_before: scoreBefore,
        score_after: scoreAfter,
        achievements_count: achievements?.length || 0,
      },
      errorInfo,
      securityInfo: {
        authenticationMethod: 'jwt',
        authorizationStatus: 'granted',
      },
    });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(resourceType, resourceId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      actionTypes,
      startDate,
      endDate,
      includeErrors = false,
    } = options;

    const query = {
      resource_type: resourceType,
      resource_id: String(resourceId),
    };

    if (actionTypes && actionTypes.length > 0) {
      query.action_type = { $in: actionTypes };
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    if (!includeErrors) {
      query['error_info.error_occurred'] = { $ne: true };
    }

    const logs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .select('-request_body -changes.before -changes.after'); // Exclude large fields for list view

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    };
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      actionTypes,
      resourceTypes,
      startDate,
      endDate,
    } = options;

    const query = { user_id: userId };

    if (actionTypes && actionTypes.length > 0) {
      query.action_type = { $in: actionTypes };
    }

    if (resourceTypes && resourceTypes.length > 0) {
      query.resource_type = { $in: resourceTypes };
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .populate('parent_log_id', 'action_type created_at')
      .select('-request_body');

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    };
  }

  /**
   * Get system error logs
   */
  async getErrorLogs(options = {}) {
    const {
      limit = 100,
      offset = 0,
      errorTypes,
      riskLevels,
      startDate,
      endDate,
    } = options;

    const query = { 'error_info.error_occurred': true };

    if (errorTypes && errorTypes.length > 0) {
      query['error_info.error_type'] = { $in: errorTypes };
    }

    if (riskLevels && riskLevels.length > 0) {
      query['security_info.risk_level'] = { $in: riskLevels };
    }

    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .select('-request_body');

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    };
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(options = {}) {
    const {
      startDate,
      endDate,
      resourceType,
      groupBy = 'action_type',
    } = options;

    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.created_at = {};
      if (startDate) matchStage.created_at.$gte = new Date(startDate);
      if (endDate) matchStage.created_at.$lte = new Date(endDate);
    }

    if (resourceType) {
      matchStage.resource_type = resourceType;
    }

    const groupStage = {};
    switch (groupBy) {
      case 'action_type':
        groupStage._id = '$action_type';
        break;
      case 'resource_type':
        groupStage._id = '$resource_type';
        break;
      case 'user_role':
        groupStage._id = '$user_role';
        break;
      case 'risk_level':
        groupStage._id = '$security_info.risk_level';
        break;
      default:
        groupStage._id = '$action_type';
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          count: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' },
          error_count: {
            $sum: { $cond: ['$error_info.error_occurred', 1, 0] }
          },
          avg_duration: {
            $avg: '$performance_metrics.duration_ms'
          },
          total_data_impact: {
            $sum: '$changes.data_impact.records_affected'
          },
        }
      },
      { $sort: { count: -1 } }
    ];

    const results = await AuditLog.aggregate(pipeline);
    
    return {
      report_data: results,
      summary: {
        total_actions: results.reduce((sum, item) => sum + item.count, 0),
        total_errors: results.reduce((sum, item) => sum + item.error_count, 0),
        unique_users_total: new Set(results.flatMap(item => item.unique_users.map(id => String(id)))).size,
        date_range: { startDate, endDate },
        group_by: groupBy,
      },
    };
  }

  // Helper methods
  sanitizeRequestBody(body) {
    if (!body) return null;
    
    // Remove sensitive fields
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.sessionToken;
    delete sanitized.apiKey;
    
    // Limit size
    const bodyStr = JSON.stringify(sanitized);
    if (bodyStr.length > 10000) {
      return { truncated: true, original_size: bodyStr.length };
    }
    
    return sanitized;
  }

  extractChangedFields(before, after) {
    if (!before || !after) return [];
    
    const fields = new Set();
    const beforeKeys = Object.keys(before);
    const afterKeys = Object.keys(after);
    
    beforeKeys.forEach(key => {
      if (!afterKeys.includes(key) || JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        fields.add(key);
      }
    });
    
    afterKeys.forEach(key => {
      if (!beforeKeys.includes(key)) {
        fields.add(key);
      }
    });
    
    return Array.from(fields);
  }

  generateChangeSummary(changes) {
    if (!changes.before || !changes.after) return null;
    
    const fields = this.extractChangedFields(changes.before, changes.after);
    return `${fields.length} fields changed: ${fields.join(', ')}`;
  }

  isCriticalDataChange(actionType, resourceType, changes) {
    const criticalActions = ['assessment_submitted', 'best_score_updated', 'backup_restored'];
    const criticalResources = ['AssessmentAttempt', 'BestScoreRecord'];
    
    if (criticalActions.includes(actionType) || criticalResources.includes(resourceType)) {
      return true;
    }
    
    // Check if score or status changed
    if (changes.before && changes.after) {
      if (changes.before.score !== changes.after.score) return true;
      if (changes.before.status !== changes.after.status) return true;
    }
    
    return false;
  }

  generateChecksum(data) {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
}

module.exports = new AuditService();
