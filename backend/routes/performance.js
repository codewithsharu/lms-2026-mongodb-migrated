/**
 * Performance Monitoring API Routes
 * Holistic system health visibility with database, memory, CPU, and error tracking
 */

const express = require('express');
const { verifyToken, hasRole } = require('../middleware/auth');
const performanceMonitoringService = require('../services/performanceMonitoringService');
const auditService = require('../services/auditService');

const router = express.Router();

// Middleware for API audit logging
const auditApiCall = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request info for audit
  req.auditInfo = {
    requestId,
    startTime,
    module: 'performance',
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role
  };
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log API call
    auditService.logAction({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      actionType: 'api_call',
      resourceType: 'API',
      resourceId: requestId,
      apiEndpoint: req.originalUrl,
      httpMethod: req.method,
      requestBody: req.method !== 'GET' ? req.body : null,
      responseStatus: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      performance: {
        duration_ms: duration,
        request_timestamp: new Date(startTime),
        response_timestamp: new Date(endTime)
      },
      business_context: {
        operation_type: 'read',
        resource_type: 'performance',
        api_module: 'performance'
      },
      security: {
        authentication_method: 'jwt',
        authorization_status: res.statusCode < 400 ? 'granted' : 'denied'
      },
      network: {
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Apply audit middleware to all routes
router.use(auditApiCall);

// ========================================
// PERFORMANCE DASHBOARD ENDPOINTS
// ========================================

/**
 * GET /api/performance/dashboard
 * Get comprehensive performance dashboard data
 */
router.get('/dashboard', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/performance/health
 * Get system health status
 */
router.get('/health', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        status: dashboardData.health.status,
        uptime: dashboardData.health.uptime,
        lastCheck: dashboardData.health.lastCheck,
        version: dashboardData.health.version,
        alerts: dashboardData.alerts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/performance/historical
 * Get historical performance data
 */
router.get('/historical', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    const historicalData = await performanceMonitoringService.getHistoricalData(timeRange);
    
    res.json({
      success: true,
      data: {
        timeRange,
        data: historicalData,
        count: historicalData.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// SYSTEM METRICS ENDPOINTS
// ========================================

/**
 * GET /api/performance/system
 * Get system metrics (CPU, memory, disk)
 */
router.get('/system', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        memory: dashboardData.system.memoryUsage,
        cpu: dashboardData.system.cpuUsage,
        loadAverage: dashboardData.system.loadAverage,
        uptime: dashboardData.system.uptime,
        disk: dashboardData.system.diskUsage,
        trends: performanceMonitoringService.getSystemTrends()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/performance/database
 * Get database performance metrics
 */
router.get('/database', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const databasePerformance = await performanceMonitoringService.getDatabasePerformance();
    
    res.json({
      success: true,
      data: databasePerformance
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/performance/application
 * Get application performance metrics
 */
router.get('/application', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        activeUsers: dashboardData.application.activeUsers,
        activeSessions: dashboardData.application.activeSessions,
        requestsPerSecond: dashboardData.application.requestsPerSecond,
        errorRate: dashboardData.application.errorRate,
        averageResponseTime: dashboardData.application.averageResponseTime,
        throughput: dashboardData.application.throughput
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ALERTS ENDPOINTS
// ========================================

/**
 * GET /api/performance/alerts
 * Get current system alerts
 */
router.get('/alerts', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        alerts: dashboardData.alerts,
        summary: performanceMonitoringService.getAlertSummary()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/performance/alerts/critical
 * Get only critical alerts
 */
router.get('/alerts/critical', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        alerts: dashboardData.alerts.critical,
        count: dashboardData.alerts.critical.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// THRESHOLDS ENDPOINTS
// ========================================

/**
 * GET /api/performance/thresholds
 * Get current performance thresholds
 */
router.get('/thresholds', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: dashboardData.thresholds
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/performance/thresholds
 * Update performance thresholds (admin only)
 */
router.put('/thresholds', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid thresholds data'
      });
    }
    
    // Validate threshold values
    const validThresholds = {};
    
    if (thresholds.memory && typeof thresholds.memory === 'object') {
      validThresholds.memory = {
        warning: Math.max(0, Math.min(100, thresholds.memory.warning || 70)),
        critical: Math.max(0, Math.min(100, thresholds.memory.critical || 85))
      };
    }
    
    if (thresholds.cpu && typeof thresholds.cpu === 'object') {
      validThresholds.cpu = {
        warning: Math.max(0, Math.min(100, thresholds.cpu.warning || 70)),
        critical: Math.max(0, Math.min(100, thresholds.cpu.critical || 85))
      };
    }
    
    if (thresholds.responseTime && typeof thresholds.responseTime === 'object') {
      validThresholds.responseTime = {
        warning: Math.max(0, thresholds.responseTime.warning || 2000),
        critical: Math.max(0, thresholds.responseTime.critical || 5000)
      };
    }
    
    if (thresholds.errorRate && typeof thresholds.errorRate === 'object') {
      validThresholds.errorRate = {
        warning: Math.max(0, Math.min(100, thresholds.errorRate.warning || 5)),
        critical: Math.max(0, Math.min(100, thresholds.errorRate.critical || 10))
      };
    }
    
    // Update thresholds in service
    Object.assign(performanceMonitoringService.thresholds, validThresholds);
    
    res.json({
      success: true,
      data: {
        message: 'Thresholds updated successfully',
        updatedThresholds: validThresholds
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// RECOMMENDATIONS ENDPOINTS
// ========================================

/**
 * GET /api/performance/recommendations
 * Get performance recommendations
 */
router.get('/recommendations', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const recommendations = performanceMonitoringService.getPerformanceRecommendations();
    
    res.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// MONITORING STATUS ENDPOINTS
// ========================================

/**
 * GET /api/performance/status
 * Get monitoring service status
 */
router.get('/status', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        monitoring: {
          status: 'active',
          lastUpdate: new Date(),
          collectionInterval: '30 seconds',
          healthCheckInterval: '60 seconds'
        },
        system: {
          status: dashboardData.health.status,
          uptime: dashboardData.health.uptime,
          version: dashboardData.health.version
        },
        database: {
          status: dashboardData.database.connectionStatus,
          collections: dashboardData.database.collections.count
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/performance/refresh
 * Force refresh performance metrics
 */
router.post('/refresh', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    // Force refresh all metrics
    await Promise.all([
      performanceMonitoringService.collectSystemMetrics(),
      performanceMonitoringService.collectDatabaseMetrics(),
      performanceMonitoringService.collectApplicationMetrics(),
      performanceMonitoringService.checkSystemHealth()
    ]);
    
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        message: 'Performance metrics refreshed successfully',
        timestamp: new Date(),
        health: dashboardData.health,
        alerts: dashboardData.alerts
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// SUMMARY ENDPOINTS
// ========================================

/**
 * GET /api/performance/summary
 * Get performance summary for quick overview
 */
router.get('/summary', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitoringService.getPerformanceDashboard();
    
    res.json({
      success: true,
      data: {
        health: {
          status: dashboardData.health.status,
          uptime: dashboardData.health.uptime
        },
        system: {
          memoryUsage: dashboardData.system.memoryUsage.percentage,
          cpuUsage: dashboardData.system.cpuUsage.percentage
        },
        application: {
          activeUsers: dashboardData.application.activeUsers,
          requestsPerSecond: dashboardData.application.requestsPerSecond,
          errorRate: dashboardData.application.errorRate,
          averageResponseTime: dashboardData.application.averageResponseTime
        },
        database: {
          status: dashboardData.database.connectionStatus,
          totalDocuments: dashboardData.database.collections.totalDocuments,
          averageQueryTime: dashboardData.database.queryPerformance.averageTime
        },
        alerts: {
          critical: dashboardData.alerts.critical.length,
          warning: dashboardData.alerts.warning.length,
          total: dashboardData.alerts.critical.length + dashboardData.alerts.warning.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ERROR HANDLING
// ========================================

router.use((error, req, res, next) => {
  console.error('Performance monitoring error:', error);
  
  // Log error for audit
  auditService.logAction({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    actionType: 'system_error',
    resourceType: 'API',
    resourceId: req.auditInfo?.requestId,
    apiEndpoint: req.originalUrl,
    httpMethod: req.method,
    responseStatus: 500,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    errorInfo: {
      error_occurred: true,
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack
    }
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    request_id: req.auditInfo?.requestId
  });
});

module.exports = router;
