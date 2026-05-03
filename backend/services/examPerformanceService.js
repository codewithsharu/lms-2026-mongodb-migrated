/**
 * Bulletproof Exam Performance Service
 * Performance optimization and scalability features
 */

const Redis = require('redis');
const NodeCache = require('node-cache');
const cluster = require('cluster');
const os = require('os');

class ExamPerformanceService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });
    
    this.redisClient = null;
    this.metrics = {
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      database: {
        queryTime: [],
        slowQueries: [],
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      performance: {
        responseTime: [],
        throughput: 0,
        concurrentRequests: 0
      }
    };
    
    this.initializeRedis();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize Redis for distributed caching
   */
  async initializeRedis() {
    try {
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retry_delay_on_failover: 100,
        maxRetriesPerRequest: 3
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected for exam performance optimization');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.warn('Redis not available, falling back to in-memory cache:', error.message);
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 30000);

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupMetrics();
    }, 300000);
  }

  /**
   * Cache exam data with multiple layers
   */
  async cacheExamData(examId, data, ttl = 600) {
    const cacheKey = `exam:${examId}`;
    
    try {
      // Memory cache first
      this.cache.set(cacheKey, data, ttl);
      
      // Redis cache if available
      if (this.redisClient) {
        await this.redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to cache exam data:', error);
      return false;
    }
  }

  /**
   * Get cached exam data with fallback
   */
  async getCachedExamData(examId) {
    const cacheKey = `exam:${examId}`;
    
    try {
      // Try memory cache first
      let data = this.cache.get(cacheKey);
      if (data) {
        this.metrics.cache.hits++;
        return data;
      }
      
      // Try Redis cache
      if (this.redisClient) {
        const redisData = await this.redisClient.get(cacheKey);
        if (redisData) {
          data = JSON.parse(redisData);
          // Backfill memory cache
          this.cache.set(cacheKey, data);
          this.metrics.cache.hits++;
          return data;
        }
      }
      
      this.metrics.cache.misses++;
      return null;
      
    } catch (error) {
      console.error('Failed to get cached exam data:', error);
      this.metrics.cache.misses++;
      return null;
    }
  }

  /**
   * Invalidate cache for exam
   */
  async invalidateExamCache(examId) {
    const cacheKey = `exam:${examId}`;
    
    try {
      // Remove from memory cache
      this.cache.del(cacheKey);
      
      // Remove from Redis
      if (this.redisClient) {
        await this.redisClient.del(cacheKey);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to invalidate exam cache:', error);
      return false;
    }
  }

  /**
   * Batch cache operations for multiple exams
   */
  async batchCacheExams(exams, ttl = 600) {
    const operations = [];
    
    for (const exam of exams) {
      operations.push(this.cacheExamData(exam.exam_id, exam, ttl));
    }
    
    try {
      const results = await Promise.allSettled(operations);
      return results.filter(r => r.status === 'fulfilled').length;
    } catch (error) {
      console.error('Batch cache operation failed:', error);
      return 0;
    }
  }

  /**
   * Optimize database queries with connection pooling
   */
  async optimizedQuery(model, query, options = {}) {
    const startTime = Date.now();
    
    try {
      // Add query hints for optimization
      const optimizedQuery = {
        ...query,
        lean: true, // Return plain JavaScript objects
        maxTimeMS: options.maxTime || 5000 // Query timeout
      };
      
      // Add indexes hint if provided
      if (options.hint) {
        optimizedQuery.hint = options.hint;
      }
      
      const result = await model.find(optimizedQuery);
      
      const queryTime = Date.now() - startTime;
      this.recordQueryTime(queryTime);
      
      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordSlowQuery(query, queryTime, error);
      throw error;
    }
  }

  /**
   * Paginated results with performance optimization
   */
  async getPaginatedResults(model, query, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { created_at: -1 },
      populate = null,
      select = null
    } = options;
    
    const skip = (page - 1) * limit;
    
    try {
      // Use aggregation for better performance with large datasets
      const pipeline = [
        { $match: query },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit + 1 } // Get one extra to check if there are more pages
      ];
      
      if (select) {
        pipeline.push({ $project: select });
      }
      
      if (populate) {
        pipeline.push({
          $lookup: {
            from: populate.model,
            localField: populate.localField,
            foreignField: populate.foreignField,
            as: populate.as
          }
        });
      }
      
      const results = await model.aggregate(pipeline);
      
      const hasMore = results.length > limit;
      if (hasMore) {
        results.pop(); // Remove the extra item
      }
      
      return {
        data: results,
        pagination: {
          page,
          limit,
          hasMore,
          total: hasMore ? skip + limit + 1 : skip + results.length
        }
      };
      
    } catch (error) {
      console.error('Paginated query failed:', error);
      throw error;
    }
  }

  /**
   * Real-time exam statistics with caching
   */
  async getRealTimeExamStats(examId, forceRefresh = false) {
    const cacheKey = `exam_stats:${examId}`;
    
    // Try cache first
    if (!forceRefresh) {
      const cached = await this.getCachedExamData(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    try {
      const BulletproofAttempt = require('../models/BulletproofAttempt');
      
      // Use aggregation for efficient statistics calculation
      const stats = await BulletproofAttempt.aggregate([
        { $match: { exam_id: examId } },
        {
          $group: {
            _id: '$state.status',
            count: { $sum: 1 },
            avgScore: { $avg: '$results.score' },
            avgTime: { $avg: '$results.time_taken_seconds' },
            maxScore: { $max: '$results.score' },
            minScore: { $min: '$results.score' }
          }
        }
      ]);
      
      // Get active attempts count
      const activeCount = await BulletproofAttempt.countDocuments({
        exam_id: examId,
        'state.status': { $in: ['in_progress', 'paused'] }
      });
      
      const result = {
        examId,
        timestamp: new Date(),
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgScore: stat.avgScore || 0,
            avgTime: stat.avgTime || 0,
            maxScore: stat.maxScore || 0,
            minScore: stat.minScore || 0
          };
          return acc;
        }, {}),
        activeAttempts: activeCount,
        totalAttempts: stats.reduce((sum, stat) => sum + stat.count, 0)
      };
      
      // Cache the result
      await this.cacheExamData(cacheKey, result, 60); // Cache for 1 minute
      
      return result;
      
    } catch (error) {
      console.error('Failed to get real-time exam stats:', error);
      throw error;
    }
  }

  /**
   * Bulk operations for better performance
   */
  async bulkUpdateAttempts(attemptUpdates) {
    const BulletproofAttempt = require('../models/BulletproofAttempt');
    
    try {
      const bulkOps = attemptUpdates.map(update => ({
        updateOne: {
          filter: { attempt_id: update.attemptId },
          update: { $set: update.data },
          upsert: false
        }
      }));
      
      const result = await BulletproofAttempt.bulkWrite(bulkOps);
      
      // Invalidate relevant caches
      for (const update of attemptUpdates) {
        await this.invalidateExamCache(update.examId);
      }
      
      return {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      };
      
    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    }
  }

  /**
   * Connection pool monitoring
   */
  getConnectionPoolStats() {
    // This would integrate with your database connection pool
    // For now, return mock data
    return {
      active: 5,
      idle: 10,
      total: 15,
      waiting: 0
    };
  }

  /**
   * Load balancing for exam servers
   */
  getLoadBalancingInfo() {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    return {
      serverId: process.env.SERVER_ID || 'unknown',
      cpuUsage: cpuUsage.user / 1000000, // Convert to percentage
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      activeConnections: this.metrics.performance.concurrentRequests,
      uptime: process.uptime(),
      loadAverage: require('os').loadavg()
    };
  }

  /**
   * Auto-scaling recommendations
   */
  getAutoScalingRecommendations() {
    const loadInfo = this.getLoadBalancingInfo();
    const recommendations = [];
    
    // CPU-based scaling
    if (loadInfo.cpuUsage > 80) {
      recommendations.push({
        type: 'scale_up',
        reason: 'High CPU usage',
        current: loadInfo.cpuUsage,
        threshold: 80,
        suggested: 'Add 1 more server instance'
      });
    } else if (loadInfo.cpuUsage < 20) {
      recommendations.push({
        type: 'scale_down',
        reason: 'Low CPU usage',
        current: loadInfo.cpuUsage,
        threshold: 20,
        suggested: 'Consider removing 1 server instance'
      });
    }
    
    // Memory-based scaling
    if (loadInfo.memoryUsage > 85) {
      recommendations.push({
        type: 'scale_up',
        reason: 'High memory usage',
        current: loadInfo.memoryUsage,
        threshold: 85,
        suggested: 'Add server with more memory'
      });
    }
    
    // Connection-based scaling
    if (loadInfo.activeConnections > 500) {
      recommendations.push({
        type: 'scale_up',
        reason: 'High connection count',
        current: loadInfo.activeConnections,
        threshold: 500,
        suggested: 'Add server to handle load'
      });
    }
    
    return recommendations;
  }

  /**
   * Performance optimization for exam submission
   */
  async optimizeExamSubmission(attemptId, submissionData) {
    const startTime = Date.now();
    
    try {
      // Use transaction for atomic submission
      const session = await require('mongoose').startSession();
      session.startTransaction();
      
      try {
        // Get attempt with lock
        const BulletproofAttempt = require('../models/BulletproofAttempt');
        const attempt = await BulletproofAttempt.findOne({
          attempt_id: attemptId
        }).session(session);
        
        if (!attempt) {
          throw new Error('Attempt not found');
        }
        
        // Update attempt atomically
        attempt.results = submissionData.results;
        attempt.state.status = 'submitted';
        attempt.state.submitted_at = new Date();
        
        await attempt.save({ session });
        
        // Commit transaction
        await session.commitTransaction();
        
        // Invalidate cache
        await this.invalidateExamCache(attempt.exam_id);
        
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          duration,
          attemptId: attempt.attempt_id
        };
        
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
      
    } catch (error) {
      console.error('Optimized exam submission failed:', error);
      throw error;
    }
  }

  /**
   * Background job processing for heavy operations
   */
  async queueBackgroundJob(jobType, data, priority = 'normal') {
    const job = {
      id: this.generateJobId(),
      type: jobType,
      data: data,
      priority: priority,
      createdAt: new Date(),
      status: 'queued'
    };
    
    try {
      // Add to Redis queue if available
      if (this.redisClient) {
        await this.redisClient.lpush(
          `jobs:${priority}`,
          JSON.stringify(job)
        );
      } else {
        // Fallback to in-memory queue
        this.processJob(job);
      }
      
      return job.id;
    } catch (error) {
      console.error('Failed to queue background job:', error);
      throw error;
    }
  }

  /**
   * Process background job
   */
  async processJob(job) {
    try {
      switch (job.type) {
        case 'calculate_exam_stats':
          await this.calculateExamStats(job.data.examId);
          break;
        case 'cleanup_old_attempts':
          await this.cleanupOldAttempts(job.data.daysOld);
          break;
        case 'generate_exam_report':
          await this.generateExamReport(job.data.examId);
          break;
        default:
          console.warn('Unknown job type:', job.type);
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      
    } catch (error) {
      console.error('Job processing failed:', error);
      job.status = 'failed';
      job.error = error.message;
    }
  }

  /**
   * Record query performance metrics
   */
  recordQueryTime(time) {
    this.metrics.database.queryTime.push(time);
    
    // Keep only last 1000 queries
    if (this.metrics.database.queryTime.length > 1000) {
      this.metrics.database.queryTime = this.metrics.database.queryTime.slice(-1000);
    }
  }

  /**
   * Record slow query
   */
  recordSlowQuery(query, time, error) {
    this.metrics.database.slowQueries.push({
      query: JSON.stringify(query),
      time,
      error: error.message,
      timestamp: new Date()
    });
    
    // Keep only last 100 slow queries
    if (this.metrics.database.slowQueries.length > 100) {
      this.metrics.database.slowQueries = this.metrics.database.slowQueries.slice(-100);
    }
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    // Update cache hit rate
    const totalCacheRequests = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = totalCacheRequests > 0 ? 
      (this.metrics.cache.hits / totalCacheRequests) * 100 : 0;
    
    // Update database metrics
    this.metrics.database.connectionPool = this.getConnectionPoolStats();
    
    // Calculate average query time
    if (this.metrics.database.queryTime.length > 0) {
      const avgQueryTime = this.metrics.database.queryTime.reduce((a, b) => a + b, 0) / 
        this.metrics.database.queryTime.length;
      this.metrics.database.avgQueryTime = avgQueryTime;
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupMetrics() {
    // Keep only recent metrics
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    this.metrics.performance.responseTime = 
      this.metrics.performance.responseTime.filter(time => time > oneHourAgo);
    
    this.metrics.database.queryTime = 
      this.metrics.database.queryTime.slice(-500);
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      timestamp: new Date(),
      cache: {
        ...this.metrics.cache,
        memoryUsage: this.cache.getStats(),
        redisConnected: !!this.redisClient
      },
      database: {
        ...this.metrics.database,
        avgQueryTime: this.metrics.database.avgQueryTime || 0,
        slowQueryCount: this.metrics.database.slowQueries.length
      },
      performance: {
        ...this.metrics.performance,
        avgResponseTime: this.calculateAverageResponseTime()
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      recommendations: this.getAutoScalingRecommendations()
    };
  }

  // Helper methods
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateAverageResponseTime() {
    if (this.metrics.performance.responseTime.length === 0) return 0;
    
    const sum = this.metrics.performance.responseTime.reduce((a, b) => a + b, 0);
    return sum / this.metrics.performance.responseTime.length;
  }

  async calculateExamStats(examId) {
    // Implementation for calculating exam statistics
    console.log(`Calculating stats for exam: ${examId}`);
  }

  async cleanupOldAttempts(daysOld) {
    // Implementation for cleaning up old attempts
    console.log(`Cleaning up attempts older than ${daysOld} days`);
  }

  async generateExamReport(examId) {
    // Implementation for generating exam reports
    console.log(`Generating report for exam: ${examId}`);
  }
}

module.exports = new ExamPerformanceService();
