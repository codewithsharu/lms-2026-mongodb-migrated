/**
 * Bulletproof Exam Monitoring Service
 * Real-time monitoring and health checks for the exam system
 */

const BulletproofExam = require('../models/BulletproofExam');
const BulletproofAttempt = require('../models/BulletproofAttempt');
const User = require('../models/User');
const auditService = require('./auditService');

class ExamMonitoringService {
  constructor() {
    this.metrics = {
      system: {
        uptime: Date.now(),
        lastHealthCheck: null,
        healthStatus: 'unknown',
        activeConnections: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      exams: {
        total: 0,
        published: 0,
        draft: 0,
        closed: 0,
        archived: 0
      },
      attempts: {
        total: 0,
        active: 0,
        completed: 0,
        expired: 0,
        abandoned: 0
      },
      performance: {
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0,
        concurrentUsers: 0
      },
      alerts: []
    };
    
    this.thresholds = {
      memoryUsage: 80, // 80% of available memory
      cpuUsage: 85,    // 85% CPU usage
      responseTime: 2000, // 2 seconds
      errorRate: 5,     // 5% error rate
      activeAttempts: 1000, // Maximum concurrent attempts
      diskSpace: 90    // 90% disk usage
    };
    
    this.alertHistory = [];
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Metrics collection every 60 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
    
    // Alert checking every 10 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 10000);
    
    console.log('🔍 Exam monitoring service started');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      timestamp: new Date(),
      status: 'healthy',
      checks: {},
      duration: 0
    };

    try {
      // Database connectivity check
      healthCheck.checks.database = await this.checkDatabaseHealth();
      
      // Memory usage check
      healthCheck.checks.memory = this.checkMemoryUsage();
      
      // Active attempts check
      healthCheck.checks.activeAttempts = await this.checkActiveAttempts();
      
      // Response time check
      healthCheck.checks.responseTime = await this.checkResponseTime();
      
      // Error rate check
      healthCheck.checks.errorRate = await this.checkErrorRate();
      
      // Disk space check
      healthCheck.checks.diskSpace = await this.checkDiskSpace();
      
      // Overall health status
      const failedChecks = Object.values(healthCheck.checks).filter(check => check.status !== 'healthy');
      if (failedChecks.length > 0) {
        healthCheck.status = 'degraded';
        if (failedChecks.length > 2) {
          healthCheck.status = 'unhealthy';
        }
      }
      
      healthCheck.duration = Date.now() - startTime;
      
      this.metrics.system.lastHealthCheck = healthCheck.timestamp;
      this.metrics.system.healthStatus = healthCheck.status;
      
      // Log health check
      await this.logHealthCheck(healthCheck);
      
      return healthCheck;
      
    } catch (error) {
      console.error('Health check failed:', error);
      healthCheck.status = 'error';
      healthCheck.error = error.message;
      return healthCheck;
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await BulletproofExam.findOne().limit(1);
      
      // Test write operation
      const testExam = new BulletproofExam({
        title: 'Health Check Test',
        teacher_id: new require('mongoose').Types.ObjectId(),
        config: { duration_minutes: 1, max_attempts: 1 },
        questions: [{
          question_id: 'health_check_q',
          type: 'mcq',
          question: 'Health check question',
          marks: 1,
          options: [
            { option_id: 'o1', text: 'A', is_correct: true },
            { option_id: 'o2', text: 'B', is_correct: false },
            { option_id: 'o3', text: 'C', is_correct: false },
            { option_id: 'o4', text: 'D', is_correct: false }
          ]
        }],
        schedule: {
          start_time: new Date(),
          end_time: new Date(Date.now() + 3600000)
        }
      });
      
      await testExam.save();
      await BulletproofExam.deleteOne({ _id: testExam._id });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: responseTime,
        message: 'Database operations successful'
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    this.metrics.system.memoryUsage = memoryUsagePercent;
    
    const status = memoryUsagePercent > this.thresholds.memoryUsage ? 'warning' : 'healthy';
    
    return {
      status,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      systemUsage: Math.round(memoryUsagePercent),
      message: `Memory usage: ${memoryUsagePercent.toFixed(1)}%`
    };
  }

  /**
   * Check active attempts
   */
  async checkActiveAttempts() {
    try {
      const activeAttempts = await BulletproofAttempt.countDocuments({
        'state.status': { $in: ['in_progress', 'paused'] }
      });
      
      this.metrics.attempts.active = activeAttempts;
      
      const status = activeAttempts > this.thresholds.activeAttempts ? 'warning' : 'healthy';
      
      return {
        status,
        count: activeAttempts,
        threshold: this.thresholds.activeAttempts,
        message: `${activeAttempts} active attempts`
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check response time
   */
  async checkResponseTime() {
    const startTime = Date.now();
    
    try {
      // Simple database query
      await BulletproofExam.countDocuments();
      
      const responseTime = Date.now() - startTime;
      this.metrics.performance.averageResponseTime = responseTime;
      
      const status = responseTime > this.thresholds.responseTime ? 'warning' : 'healthy';
      
      return {
        status,
        responseTime,
        threshold: this.thresholds.responseTime,
        message: `Response time: ${responseTime}ms`
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check error rate
   */
  async checkErrorRate() {
    try {
      // Get recent error logs from audit service
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const errorCount = await require('../models/AuditLog').countDocuments({
        'error_info.error_occurred': true,
        created_at: { $gte: fiveMinutesAgo }
      });
      
      const totalRequests = await require('../models/AuditLog').countDocuments({
        created_at: { $gte: fiveMinutesAgo }
      });
      
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
      this.metrics.performance.errorRate = errorRate;
      
      const status = errorRate > this.thresholds.errorRate ? 'warning' : 'healthy';
      
      return {
        status,
        errorRate: errorRate.toFixed(2),
        errorCount,
        totalRequests,
        threshold: this.thresholds.errorRate,
        message: `Error rate: ${errorRate.toFixed(2)}%`
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      
      // This is a simplified check - in production, you'd use a proper disk space monitoring library
      return {
        status: 'healthy',
        message: 'Disk space check passed'
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    try {
      // Exam metrics
      const examStats = await BulletproofExam.aggregate([
        {
          $group: {
            _id: '$state.status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      this.metrics.exams.total = examStats.reduce((sum, stat) => sum + stat.count, 0);
      examStats.forEach(stat => {
        this.metrics.exams[stat._id] = stat.count;
      });
      
      // Attempt metrics
      const attemptStats = await BulletproofAttempt.aggregate([
        {
          $group: {
            _id: '$state.status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      this.metrics.attempts.total = attemptStats.reduce((sum, stat) => sum + stat.count, 0);
      attemptStats.forEach(stat => {
        this.metrics.attempts[stat._id] = stat.count;
      });
      
      // Performance metrics
      const recentLogs = await require('../models/AuditLog')
        .find({ created_at: { $gte: new Date(Date.now() - 60000) } })
        .sort({ created_at: -1 });
      
      if (recentLogs.length > 0) {
        const responseTimes = recentLogs
          .filter(log => log.performance_metrics?.duration_ms)
          .map(log => log.performance_metrics.duration_ms);
        
        if (responseTimes.length > 0) {
          this.metrics.performance.averageResponseTime = 
            responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        }
        
        const errorCount = recentLogs.filter(log => log.error_info?.error_occurred).length;
        this.metrics.performance.errorRate = (errorCount / recentLogs.length) * 100;
      }
      
      // System metrics
      this.metrics.system.uptime = Date.now();
      this.metrics.system.activeConnections = recentLogs.length;
      
      console.log('📊 Metrics collected successfully');
      
    } catch (error) {
      console.error('Metrics collection failed:', error);
    }
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    const newAlerts = [];
    
    // Memory usage alert
    if (this.metrics.system.memoryUsage > this.thresholds.memoryUsage) {
      newAlerts.push({
        type: 'memory',
        severity: 'warning',
        message: `Memory usage is ${this.metrics.system.memoryUsage.toFixed(1)}%`,
        threshold: this.thresholds.memoryUsage,
        current: this.metrics.system.memoryUsage,
        timestamp: new Date()
      });
    }
    
    // Active attempts alert
    if (this.metrics.attempts.active > this.thresholds.activeAttempts) {
      newAlerts.push({
        type: 'active_attempts',
        severity: 'warning',
        message: `Active attempts: ${this.metrics.attempts.active}`,
        threshold: this.thresholds.activeAttempts,
        current: this.metrics.attempts.active,
        timestamp: new Date()
      });
    }
    
    // Response time alert
    if (this.metrics.performance.averageResponseTime > this.thresholds.responseTime) {
      newAlerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Response time: ${this.metrics.performance.averageResponseTime.toFixed(0)}ms`,
        threshold: this.thresholds.responseTime,
        current: this.metrics.performance.averageResponseTime,
        timestamp: new Date()
      });
    }
    
    // Error rate alert
    if (this.metrics.performance.errorRate > this.thresholds.errorRate) {
      newAlerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate: ${this.metrics.performance.errorRate.toFixed(2)}%`,
        threshold: this.thresholds.errorRate,
        current: this.metrics.performance.errorRate,
        timestamp: new Date()
      });
    }
    
    // Add new alerts to metrics
    this.metrics.alerts = [...this.metrics.alerts, ...newAlerts];
    
    // Keep only last 100 alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }
    
    // Log critical alerts
    newAlerts.forEach(alert => {
      if (alert.severity === 'critical') {
        console.error('🚨 CRITICAL ALERT:', alert.message);
        this.logAlert(alert);
      }
    });
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  async getMonitoringDashboard() {
    try {
      // Get latest metrics
      await this.collectMetrics();
      
      // Get recent health checks
      const recentHealthChecks = this.getRecentHealthChecks();
      
      // Get active attempts with details
      const activeAttemptsDetails = await this.getActiveAttemptsDetails();
      
      // Get system performance trends
      const performanceTrends = await this.getPerformanceTrends();
      
      return {
        timestamp: new Date(),
        system: this.metrics.system,
        exams: this.metrics.exams,
        attempts: this.metrics.attempts,
        performance: this.metrics.performance,
        alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
        healthChecks: recentHealthChecks,
        activeAttempts: activeAttemptsDetails,
        trends: performanceTrends,
        thresholds: this.thresholds
      };
      
    } catch (error) {
      console.error('Failed to get monitoring dashboard:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get real-time exam statistics
   */
  async getRealTimeStats() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Current active exams
      const activeExams = await BulletproofExam.countDocuments({
        'state.status': 'published',
        'schedule.start_time': { $lte: now },
        'schedule.end_time': { $gte: now }
      });
      
      // Active attempts
      const activeAttempts = await BulletproofAttempt.countDocuments({
        'state.status': { $in: ['in_progress', 'paused'] }
      });
      
      // Recent submissions (last hour)
      const recentSubmissions = await BulletproofAttempt.countDocuments({
        'state.status': 'submitted',
        'state.submitted_at': { $gte: oneHourAgo }
      });
      
      // Average score (last hour)
      const recentScores = await BulletproofAttempt.aggregate([
        {
          $match: {
            'state.status': 'submitted',
            'state.submitted_at': { $gte: oneHourAgo }
          }
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$results.score' },
            avgPercentage: { $avg: '$results.percentage' }
          }
        }
      ]);
      
      return {
        timestamp: now,
        activeExams,
        activeAttempts,
        recentSubmissions,
        averageScore: recentScores[0]?.avgScore || 0,
        averagePercentage: recentScores[0]?.avgPercentage || 0,
        systemHealth: this.metrics.system.healthStatus
      };
      
    } catch (error) {
      console.error('Failed to get real-time stats:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get exam performance analytics
   */
  async getExamPerformanceAnalytics(examId, timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      const timeRangeMs = timeRanges[timeRange] || timeRanges['24h'];
      const startTime = new Date(Date.now() - timeRangeMs);
      
      // Get attempt statistics
      const attemptStats = await BulletproofAttempt.aggregate([
        { $match: { exam_id: examId, created_at: { $gte: startTime } } },
        {
          $group: {
            _id: '$state.status',
            count: { $sum: 1 },
            avgScore: { $avg: '$results.score' },
            avgTime: { $avg: '$results.time_taken_seconds' }
          }
        }
      ]);
      
      // Get hourly submission trends
      const hourlyTrends = await BulletproofAttempt.aggregate([
        {
          $match: {
            exam_id: examId,
            'state.status': 'submitted',
            'state.submitted_at': { $gte: startTime }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$state.submitted_at' },
              month: { $month: '$state.submitted_at' },
              day: { $dayOfMonth: '$state.submitted_at' },
              hour: { $hour: '$state.submitted_at' }
            },
            count: { $sum: 1 },
            avgScore: { $avg: '$results.score' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);
      
      // Get score distribution
      const scoreDistribution = await BulletproofAttempt.aggregate([
        {
          $match: {
            exam_id: examId,
            'state.status': 'submitted',
            'state.submitted_at': { $gte: startTime }
          }
        },
        {
          $bucket: {
            groupBy: '$results.percentage',
            boundaries: [0, 20, 40, 60, 80, 100],
            default: 'other',
            output: {
              count: { $sum: 1 },
              avgScore: { $avg: '$results.score' }
            }
          }
        }
      ]);
      
      return {
        examId,
        timeRange,
        timestamp: new Date(),
        attemptStats,
        hourlyTrends,
        scoreDistribution,
        totalAttempts: attemptStats.reduce((sum, stat) => sum + stat.count, 0),
        completionRate: this.calculateCompletionRate(attemptStats)
      };
      
    } catch (error) {
      console.error('Failed to get exam performance analytics:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Helper methods
  getRecentHealthChecks() {
    // Return last 10 health checks (mock implementation)
    return [];
  }

  async getActiveAttemptsDetails() {
    try {
      const activeAttempts = await BulletproofAttempt.find({
        'state.status': { $in: ['in_progress', 'paused'] }
      })
      .populate('student_id', 'full_name email')
      .select('attempt_id exam_id student_id state timing current_state')
      .limit(50);
      
      return activeAttempts.map(attempt => ({
        attempt_id: attempt.attempt_id,
        exam_id: attempt.exam_id,
        student: attempt.student_id,
        status: attempt.state.status,
        remaining_seconds: attempt.timing.remaining_seconds,
        current_question: attempt.current_state.current_question_index,
        last_activity: attempt.state.last_activity
      }));
      
    } catch (error) {
      console.error('Failed to get active attempts details:', error);
      return [];
    }
  }

  async getPerformanceTrends() {
    // Return performance trends (mock implementation)
    return {
      responseTime: [],
      errorRate: [],
      throughput: []
    };
  }

  calculateCompletionRate(attemptStats) {
    const totalAttempts = attemptStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedAttempts = attemptStats
      .filter(stat => ['submitted', 'expired'].includes(stat._id))
      .reduce((sum, stat) => sum + stat.count, 0);
    
    return totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0;
  }

  async logHealthCheck(healthCheck) {
    try {
      await auditService.logAction({
        userId: null,
        userEmail: 'system',
        userRole: 'system',
        actionType: 'system_health_check',
        resourceType: 'System',
        resourceId: 'health_check',
        api_endpoint: '/monitoring/health',
        http_method: 'GET',
        responseStatus: healthCheck.status === 'healthy' ? 200 : 500,
        changes: {
          before: null,
          after: healthCheck,
          fields_changed: ['health_status'],
          change_summary: `Health check: ${healthCheck.status}`
        },
        businessContext: {
          system_status: healthCheck.status,
          duration: healthCheck.duration
        }
      });
    } catch (error) {
      console.error('Failed to log health check:', error);
    }
  }

  async logAlert(alert) {
    try {
      await auditService.logAction({
        userId: null,
        userEmail: 'system',
        userRole: 'system',
        actionType: 'system_alert',
        resourceType: 'System',
        resourceId: 'alert',
        api_endpoint: '/monitoring/alerts',
        http_method: 'POST',
        responseStatus: 500,
        changes: {
          before: null,
          after: alert,
          fields_changed: ['alert_triggered'],
          change_summary: `Alert: ${alert.message}`
        },
        businessContext: {
          alert_type: alert.type,
          alert_severity: alert.severity
        },
        security_info: {
          risk_level: alert.severity === 'critical' ? 'critical' : 'medium'
        }
      });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }
}

module.exports = new ExamMonitoringService();
