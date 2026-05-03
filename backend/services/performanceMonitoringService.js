/**
 * Performance Monitoring Service
 * Holistic system health visibility with database, memory, CPU, and error tracking
 */

const os = require('os');
const mongoose = require('mongoose');
const ApiAuditLog = require('../models/ApiAuditLog');

class PerformanceMonitoringService {
  constructor() {
    this.metrics = {
      system: {
        uptime: 0,
        loadAverage: [],
        memoryUsage: {
          total: 0,
          free: 0,
          used: 0,
          percentage: 0
        },
        cpuUsage: {
          user: 0,
          system: 0,
          idle: 0,
          total: 0
        },
        diskUsage: {
          total: 0,
          free: 0,
          used: 0,
          percentage: 0
        }
      },
      database: {
        connectionStatus: 'disconnected',
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0,
          waiting: 0
        },
        queryPerformance: {
          averageTime: 0,
          slowQueries: 0,
          totalQueries: 0,
          errorQueries: 0
        },
        collections: {
          count: 0,
          totalDocuments: 0,
          totalSize: 0,
          indexes: 0
        }
      },
      application: {
        activeUsers: 0,
        activeSessions: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        averageResponseTime: 0,
        throughput: 0
      },
      alerts: {
        critical: [],
        warning: [],
        info: []
      },
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        uptime: '0s',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    this.thresholds = {
      memory: {
        warning: 70,  // 70%
        critical: 85   // 85%
      },
      cpu: {
        warning: 70,  // 70%
        critical: 85   // 85%
      },
      disk: {
        warning: 80,  // 80%
        critical: 90   // 90%
      },
      responseTime: {
        warning: 2000,  // 2 seconds
        critical: 5000   // 5 seconds
      },
      errorRate: {
        warning: 5,   // 5%
        critical: 10  // 10%
      },
      database: {
        slowQuery: 1000, // 1 second
        connectionPool: 80 // 80% of max pool
      }
    };

    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect database metrics every 60 seconds
    setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000);

    // Collect application metrics every 30 seconds
    setInterval(() => {
      this.collectApplicationMetrics();
    }, 30000);

    // Check health and generate alerts every 60 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 60000);

    console.log('🔍 Performance monitoring service started');
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      this.metrics.system.memoryUsage = {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024),    // MB
        used: Math.round(usedMemory / 1024 / 1024),    // MB
        percentage: Math.round((usedMemory / totalMemory) * 100)
      };

      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      this.metrics.system.cpuUsage = {
        user: cpus[0]?.times.user || 0,
        system: cpus[0]?.times.sys || 0,
        idle: totalIdle,
        total: totalTick,
        percentage: Math.round(((totalTick - totalIdle) / totalTick) * 100)
      };

      // Load average
      this.metrics.system.loadAverage = os.loadavg();

      // System uptime
      this.metrics.system.uptime = os.uptime();

      // Disk usage (simplified - would need fs-extra for accurate disk stats)
      this.metrics.system.diskUsage = {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0
      };

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Collect database metrics
   */
  async collectDatabaseMetrics() {
    try {
      // Check connection status
      const dbState = mongoose.connection.readyState;
      this.metrics.database.connectionStatus = 
        dbState === 1 ? 'connected' : 
        dbState === 2 ? 'connecting' : 'disconnected';

      if (dbState === 1) {
        // Get database stats
        const stats = await mongoose.connection.db.stats();
        this.metrics.database.collections = {
          count: stats.collections,
          totalDocuments: stats.objects,
          totalSize: Math.round(stats.dataSize / 1024 / 1024), // MB
          indexes: stats.indexes
        };

        // Get connection pool info (simplified)
        this.metrics.database.connectionPool = {
          active: 5,  // Would need actual pool monitoring
          idle: 10,
          total: 15,
          waiting: 0
        };

        // Query performance metrics
        const recentLogs = await ApiAuditLog.find({
          created_at: { $gte: new Date(Date.now() - 60000) } // Last 1 minute
        });

        const queryTimes = recentLogs
          .filter(log => log.performance?.duration_ms)
          .map(log => log.performance.duration_ms);

        if (queryTimes.length > 0) {
          const avgTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
          const slowQueries = queryTimes.filter(time => time > this.thresholds.database.slowQuery).length;
          
          this.metrics.database.queryPerformance = {
            averageTime: Math.round(avgTime),
            slowQueries,
            totalQueries: queryTimes.length,
            errorQueries: recentLogs.filter(log => log.response_status >= 400).length
          };
        }
      }

    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      this.metrics.database.connectionStatus = 'error';
    }
  }

  /**
   * Collect application metrics
   */
  async collectApplicationMetrics() {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      const fiveMinutesAgo = new Date(now.getTime() - 300000);

      // Get recent API calls
      const recentCalls = await ApiAuditLog.find({
        created_at: { $gte: oneMinuteAgo }
      });

      const fiveMinuteCalls = await ApiAuditLog.find({
        created_at: { $gte: fiveMinutesAgo }
      });

      // Calculate requests per second
      this.metrics.application.requestsPerSecond = recentCalls.length / 60;

      // Calculate error rate
      const errorCount = recentCalls.filter(log => log.response_status >= 400).length;
      this.metrics.application.errorRate = recentCalls.length > 0 ? 
        (errorCount / recentCalls.length) * 100 : 0;

      // Calculate average response time
      const responseTimes = recentCalls
        .filter(log => log.performance?.duration_ms)
        .map(log => log.performance.duration_ms);

      if (responseTimes.length > 0) {
        this.metrics.application.averageResponseTime = 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }

      // Calculate throughput (requests per minute)
      this.metrics.application.throughput = recentCalls.length;

      // Active users (users with activity in last 5 minutes)
      const activeUsers = new Set(
        fiveMinuteCalls
          .filter(log => log.user_id)
          .map(log => log.user_id.toString())
      );
      this.metrics.application.activeUsers = activeUsers.size;

      // Active sessions (simplified)
      this.metrics.application.activeSessions = activeUsers.size;

    } catch (error) {
      console.error('Failed to collect application metrics:', error);
    }
  }

  /**
   * Check system health and generate alerts
   */
  async checkSystemHealth() {
    this.metrics.alerts = { critical: [], warning: [], info: [] };

    // Check memory usage
    if (this.metrics.system.memoryUsage.percentage >= this.thresholds.memory.critical) {
      this.metrics.alerts.critical.push({
        type: 'memory',
        message: `Critical memory usage: ${this.metrics.system.memoryUsage.percentage}%`,
        value: this.metrics.system.memoryUsage.percentage,
        threshold: this.thresholds.memory.critical,
        timestamp: new Date()
      });
    } else if (this.metrics.system.memoryUsage.percentage >= this.thresholds.memory.warning) {
      this.metrics.alerts.warning.push({
        type: 'memory',
        message: `High memory usage: ${this.metrics.system.memoryUsage.percentage}%`,
        value: this.metrics.system.memoryUsage.percentage,
        threshold: this.thresholds.memory.warning,
        timestamp: new Date()
      });
    }

    // Check CPU usage
    if (this.metrics.system.cpuUsage.percentage >= this.thresholds.cpu.critical) {
      this.metrics.alerts.critical.push({
        type: 'cpu',
        message: `Critical CPU usage: ${this.metrics.system.cpuUsage.percentage}%`,
        value: this.metrics.system.cpuUsage.percentage,
        threshold: this.thresholds.cpu.critical,
        timestamp: new Date()
      });
    } else if (this.metrics.system.cpuUsage.percentage >= this.thresholds.cpu.warning) {
      this.metrics.alerts.warning.push({
        type: 'cpu',
        message: `High CPU usage: ${this.metrics.system.cpuUsage.percentage}%`,
        value: this.metrics.system.cpuUsage.percentage,
        threshold: this.thresholds.cpu.warning,
        timestamp: new Date()
      });
    }

    // Check database connection
    if (this.metrics.database.connectionStatus !== 'connected') {
      this.metrics.alerts.critical.push({
        type: 'database',
        message: `Database connection: ${this.metrics.database.connectionStatus}`,
        value: this.metrics.database.connectionStatus,
        threshold: 'connected',
        timestamp: new Date()
      });
    }

    // Check response time
    if (this.metrics.application.averageResponseTime >= this.thresholds.responseTime.critical) {
      this.metrics.alerts.critical.push({
        type: 'response_time',
        message: `Critical response time: ${Math.round(this.metrics.application.averageResponseTime)}ms`,
        value: Math.round(this.metrics.application.averageResponseTime),
        threshold: this.thresholds.responseTime.critical,
        timestamp: new Date()
      });
    } else if (this.metrics.application.averageResponseTime >= this.thresholds.responseTime.warning) {
      this.metrics.alerts.warning.push({
        type: 'response_time',
        message: `High response time: ${Math.round(this.metrics.application.averageResponseTime)}ms`,
        value: Math.round(this.metrics.application.averageResponseTime),
        threshold: this.thresholds.responseTime.warning,
        timestamp: new Date()
      });
    }

    // Check error rate
    if (this.metrics.application.errorRate >= this.thresholds.errorRate.critical) {
      this.metrics.alerts.critical.push({
        type: 'error_rate',
        message: `Critical error rate: ${this.metrics.application.errorRate.toFixed(2)}%`,
        value: this.metrics.application.errorRate,
        threshold: this.thresholds.errorRate.critical,
        timestamp: new Date()
      });
    } else if (this.metrics.application.errorRate >= this.thresholds.errorRate.warning) {
      this.metrics.alerts.warning.push({
        type: 'error_rate',
        message: `High error rate: ${this.metrics.application.errorRate.toFixed(2)}%`,
        value: this.metrics.application.errorRate,
        threshold: this.thresholds.errorRate.warning,
        timestamp: new Date()
      });
    }

    // Determine overall health status
    if (this.metrics.alerts.critical.length > 0) {
      this.metrics.health.status = 'critical';
    } else if (this.metrics.alerts.warning.length > 0) {
      this.metrics.health.status = 'warning';
    } else {
      this.metrics.health.status = 'healthy';
    }

    this.metrics.health.lastCheck = new Date();
    this.metrics.health.uptime = this.formatUptime(this.metrics.system.uptime);

    // Log critical alerts
    if (this.metrics.alerts.critical.length > 0) {
      console.error('🚨 CRITICAL SYSTEM ALERTS:', this.metrics.alerts.critical);
    }
  }

  /**
   * Get comprehensive performance dashboard data
   */
  async getPerformanceDashboard() {
    // Refresh metrics before returning
    await Promise.all([
      this.collectSystemMetrics(),
      this.collectDatabaseMetrics(),
      this.collectApplicationMetrics(),
      this.checkSystemHealth()
    ]);

    return {
      timestamp: new Date(),
      system: this.metrics.system,
      database: this.metrics.database,
      application: this.metrics.application,
      alerts: this.metrics.alerts,
      health: this.metrics.health,
      thresholds: this.thresholds
    };
  }

  /**
   * Get historical performance data
   */
  async getHistoricalData(timeRange = '1h') {
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const timeRangeMs = timeRanges[timeRange] || timeRanges['1h'];
    const startTime = new Date(Date.now() - timeRangeMs);

    try {
      // Get historical API performance data
      const historicalData = await ApiAuditLog.aggregate([
        { $match: { created_at: { $gte: startTime } } },
        {
          $group: {
            _id: {
              year: { $year: '$created_at' },
              month: { $month: '$created_at' },
              day: { $dayOfMonth: '$created_at' },
              hour: { $hour: '$created_at' },
              minute: timeRange === '1h' ? { $minute: '$created_at' } : null
            },
            avgResponseTime: { $avg: '$performance.duration_ms' },
            requestCount: { $sum: 1 },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$response_status', 400] }, 1, 0] }
            },
            uniqueUsers: { $addToSet: '$user_id' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1, '_id.minute': 1 } },
        { $limit: 100 }
      ]);

      return historicalData.map(data => ({
        timestamp: new Date(
          data._id.year,
          data._id.month - 1,
          data._id.day,
          data._id.hour,
          data._id.minute || 0
        ),
        avgResponseTime: Math.round(data.avgResponseTime || 0),
        requestCount: data.requestCount,
        errorRate: data.requestCount > 0 ? (data.errorCount / data.requestCount) * 100 : 0,
        activeUsers: data.uniqueUsers.length
      }));

    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }

  /**
   * Get database performance details
   */
  async getDatabasePerformance() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'disconnected',
          message: 'Database not connected'
        };
      }

      // Get collection statistics
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionStats = [];

      for (const collection of collections) {
        try {
          const stats = await mongoose.connection.db.collection(collection.name).stats();
          collectionStats.push({
            name: collection.name,
            documents: stats.count,
            size: Math.round(stats.size / 1024), // KB
            avgDocSize: stats.count > 0 ? Math.round(stats.size / stats.count) : 0,
            indexes: stats.nindexes
          });
        } catch (error) {
          console.error(`Failed to get stats for collection ${collection.name}:`, error);
        }
      }

      // Get slow queries
      const slowQueries = await ApiAuditLog.find({
        'performance.duration_ms': { $gte: this.thresholds.database.slowQuery },
        created_at: { $gte: new Date(Date.now() - 3600000) } // Last 1 hour
      })
      .sort({ 'performance.duration_ms': -1 })
      .limit(10);

      return {
        status: 'connected',
        collections: collectionStats,
        slowQueries: slowQueries.map(q => ({
          endpoint: q.api_endpoint,
          method: q.http_method,
          duration: q.performance.duration_ms,
          timestamp: q.created_at
        })),
        connectionPool: this.metrics.database.connectionPool,
        queryPerformance: this.metrics.database.queryPerformance
      };

    } catch (error) {
      console.error('Failed to get database performance:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get system resource usage trends
   */
  getSystemTrends() {
    return {
      memory: {
        current: this.metrics.system.memoryUsage.percentage,
        trend: 'stable', // Would need historical data
        forecast: 'stable'
      },
      cpu: {
        current: this.metrics.system.cpuUsage.percentage,
        trend: 'stable',
        forecast: 'stable'
      },
      loadAverage: {
        '1min': this.metrics.system.loadAverage[0],
        '5min': this.metrics.system.loadAverage[1],
        '15min': this.metrics.system.loadAverage[2]
      }
    };
  }

  /**
   * Get alert summary
   */
  getAlertSummary() {
    return {
      total: this.metrics.alerts.critical.length + this.metrics.alerts.warning.length + this.metrics.alerts.info.length,
      critical: this.metrics.alerts.critical.length,
      warning: this.metrics.alerts.warning.length,
      info: this.metrics.alerts.info.length,
      recent: this.metrics.alerts.critical.concat(this.metrics.alerts.warning).slice(0, 5)
    };
  }

  /**
   * Format uptime for display
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations() {
    const recommendations = [];

    // Memory recommendations
    if (this.metrics.system.memoryUsage.percentage > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Consider increasing system memory or optimizing memory usage',
        action: 'Monitor memory-intensive operations and consider scaling'
      });
    }

    // CPU recommendations
    if (this.metrics.system.cpuUsage.percentage > 80) {
      recommendations.push({
        type: 'cpu',
        priority: 'high',
        message: 'High CPU usage detected',
        action: 'Consider scaling horizontally or optimizing CPU-intensive operations'
      });
    }

    // Database recommendations
    if (this.metrics.database.queryPerformance.slowQueries > 10) {
      recommendations.push({
        type: 'database',
        priority: 'medium',
        message: 'Multiple slow queries detected',
        action: 'Review and optimize database queries, add indexes if needed'
      });
    }

    // Response time recommendations
    if (this.metrics.application.averageResponseTime > 1000) {
      recommendations.push({
        type: 'response_time',
        priority: 'medium',
        message: 'High average response time',
        action: 'Review API performance, optimize slow endpoints'
      });
    }

    return recommendations;
  }
}

module.exports = new PerformanceMonitoringService();
