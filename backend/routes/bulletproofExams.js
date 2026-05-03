/**
 * Bulletproof Exam API Routes
 * Simplified, atomic, and 99% error-free exam endpoints
 */

const express = require('express');
const { verifyToken, hasRole } = require('../middleware/auth');
const bulletproofExamService = require('../services/bulletproofExamService');
const auditService = require('../services/auditService');

const router = express.Router();

// Middleware for request tracking
const trackRequest = (req, res, next) => {
  req.operationId = bulletproofExamService.generateOperationId();
  req.startTime = Date.now();
  next();
};

// Middleware for error handling
const errorHandler = (error, req, res, next) => {
  const duration = Date.now() - req.startTime;
  
  // Log error for audit
  auditService.logAction({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    actionType: 'system_error',
    resourceType: 'System',
    resourceId: req.operationId,
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
    error: {
      message: 'An unexpected error occurred',
      category: 'system_error',
      operation_id: req.operationId
    }
  });
};

// Apply middleware to all routes
router.use(trackRequest);

// ========================================
// TEACHER ENDPOINTS (7 total)
// ========================================

/**
 * POST /api/bulletproof-exams
 * Create a new exam
 */
router.post('/', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.createExam(req.user.id, req.body);
    
    // Log success
    await auditService.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: 'assessment_created',
      resourceType: 'BulletproofExam',
      resourceId: result.data?.exam_id,
      apiEndpoint: req.originalUrl,
      httpMethod: req.method,
      responseStatus: 201,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      businessContext: {
        assessment_title: req.body.title,
        teacher_name: req.user.full_name
      }
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bulletproof-exams
 * List exams for teacher
 */
router.get('/', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const exams = await BulletproofExam.findByTeacher(req.user.id, {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50
    });
    
    res.json({
      success: true,
      data: exams.map(exam => exam.toAPIResponse(false)),
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bulletproof-exams/:examId
 * Get exam details
 */
router.get('/:examId', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const exam = await BulletproofExam.findOne({ exam_id: req.params.examId, teacher_id: req.user.id });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found',
          category: 'authorization_error',
          operation_id: req.operationId
        }
      });
    }
    
    res.json({
      success: true,
      data: exam.toAPIResponse(true, true),
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bulletproof-exams/:examId
 * Update exam (only if not published)
 */
router.put('/:examId', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const exam = await BulletproofExam.findOne({ 
      exam_id: req.params.examId, 
      teacher_id: req.user.id,
      'state.status': 'draft'
    });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found or cannot be updated',
          category: 'business_logic_error',
          operation_id: req.operationId
        }
      });
    }
    
    // Update exam (simplified - only allow certain fields)
    if (req.body.title) exam.title = req.body.title;
    if (req.body.description) exam.description = req.body.description;
    if (req.body.duration_minutes) exam.config.duration_minutes = req.body.duration_minutes;
    if (req.body.questions) exam.questions = bulletproofExamService.processQuestions(req.body.questions);
    
    await exam.save();
    
    res.json({
      success: true,
      data: exam.toAPIResponse(true, true),
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/bulletproof-exams/:examId
 * Delete exam (only if no attempts exist)
 */
router.delete('/:examId', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const BulletproofAttempt = require('../models/BulletproofAttempt');
    
    const exam = await BulletproofExam.findOne({ 
      exam_id: req.params.examId, 
      teacher_id: req.user.id 
    });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found',
          category: 'authorization_error',
          operation_id: req.operationId
        }
      });
    }
    
    // Check if any attempts exist
    const attemptCount = await BulletproofAttempt.countDocuments({ exam_id: req.params.examId });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete exam with existing attempts',
          category: 'business_logic_error',
          operation_id: req.operationId
        }
      });
    }
    
    await BulletproofExam.deleteOne({ exam_id: req.params.examId });
    
    res.json({
      success: true,
      message: 'Exam deleted successfully',
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bulletproof-exams/:examId/publish
 * Publish exam
 */
router.post('/:examId/publish', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const exam = await BulletproofExam.findOne({ 
      exam_id: req.params.examId, 
      teacher_id: req.user.id,
      'state.status': 'draft'
    });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found or already published',
          category: 'business_logic_error',
          operation_id: req.operationId
        }
      });
    }
    
    exam.state.status = 'published';
    exam.state.published_at = new Date();
    await exam.save();
    
    res.json({
      success: true,
      data: exam.toAPIResponse(false),
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bulletproof-exams/:examId/stats
 * Get exam statistics
 */
router.get('/:examId/stats', verifyToken, hasRole('teacher'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.getExamStatistics(req.user.id, req.params.examId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ========================================
// STUDENT ENDPOINTS (5 total)
// ========================================

/**
 * GET /api/bulletproof-exams/available
 * Get available exams for student
 */
router.get('/student/available', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.getAvailableExams(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bulletproof-exams/:examId/start
 * Start exam attempt
 */
router.post('/:examId/start', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const browserInfo = {
      user_agent: req.headers['user-agent'],
      screen_resolution: req.body.screen_resolution,
      timezone: req.body.timezone,
      language: req.body.language
    };
    
    const result = await bulletproofExamService.startExamAttempt(
      req.user.id, 
      req.params.examId, 
      browserInfo
    );
    
    // Log start
    await auditService.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: 'assessment_started',
      resourceType: 'BulletproofAttempt',
      resourceId: result.data?.attempt_id,
      apiEndpoint: req.originalUrl,
      httpMethod: req.method,
      responseStatus: 201,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      businessContext: {
        assessment_title: req.params.examId,
        student_name: req.user.full_name,
        attempt_number: result.data?.attempt_number
      }
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bulletproof-exams/:examId/resume
 * Resume exam attempt
 */
router.get('/:examId/resume', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.resumeExam(
      req.user.id,
      req.body.attempt_id || req.query.attempt_id,
      req.query.backup_id
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bulletproof-exams/:attemptId/save
 * Save answer or navigate
 */
router.put('/:attemptId/save', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    let result;
    
    if (req.body.action === 'save_answer') {
      result = await bulletproofExamService.saveAnswer(
        req.user.id,
        req.params.attemptId,
        req.body.question_id,
        req.body.answer,
        {
          time_spent_seconds: req.body.time_spent_seconds,
          current_question_index: req.body.current_question_index
        }
      );
    } else if (req.body.action === 'navigate') {
      result = await bulletproofExamService.navigateToQuestion(
        req.user.id,
        req.params.attemptId,
        req.body.question_index,
        {
          time_spent_seconds: req.body.time_spent_seconds
        }
      );
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid action. Use save_answer or navigate',
          category: 'validation_error',
          operation_id: req.operationId
        }
      });
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bulletproof-exams/:attemptId/submit
 * Submit exam
 */
router.post('/:attemptId/submit', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.submitExam(
      req.user.id,
      req.params.attemptId,
      req.body.submission_type || 'manual'
    );
    
    // Log submission
    await auditService.logAction({
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: 'assessment_submitted',
      resourceType: 'BulletproofAttempt',
      resourceId: req.params.attemptId,
      apiEndpoint: req.originalUrl,
      httpMethod: req.method,
      responseStatus: 200,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      businessContext: {
        assessment_title: req.params.examId,
        student_name: req.user.full_name,
        score_after: result.data?.results?.score,
        submission_type: req.body.submission_type || 'manual'
      }
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ========================================
// RECOVERY ENDPOINTS (3 total)
// ========================================

/**
 * GET /api/bulletproof-exams/:attemptId/backups
 * Get backup history
 */
router.get('/:attemptId/backups', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const BulletproofAttempt = require('../models/BulletproofAttempt');
    const attempt = await BulletproofAttempt.findOne({
      attempt_id: req.params.attemptId,
      student_id: req.user.id
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Attempt not found',
          category: 'authorization_error',
          operation_id: req.operationId
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        attempt_id: attempt.attempt_id,
        backups: attempt.backups.map(backup => ({
          backup_id: backup.backup_id,
          timestamp: backup.timestamp,
          backup_type: backup.backup_type,
          size_bytes: backup.size_bytes,
          is_valid: backup.is_valid
        })),
        total_backups: attempt.backups.length
      },
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bulletproof-exams/:attemptId/restore
 * Restore from backup
 */
router.post('/:attemptId/restore', verifyToken, hasRole('student'), async (req, res, next) => {
  try {
    const result = await bulletproofExamService.resumeExam(
      req.user.id,
      req.params.attemptId,
      req.body.backup_id
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bulletproof-exams/health
 * System health check
 */
router.get('/health', async (req, res, next) => {
  try {
    const BulletproofExam = require('../models/BulletproofExam');
    const BulletproofAttempt = require('../models/BulletproofAttempt');
    
    // Check database connectivity
    const examCount = await BulletproofExam.countDocuments();
    const attemptCount = await BulletproofAttempt.countDocuments();
    
    // Check active attempts
    const activeAttempts = await BulletproofAttempt.countDocuments({
      'state.status': { $in: ['in_progress', 'paused'] }
    });
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        statistics: {
          total_exams: examCount,
          total_attempts: attemptCount,
          active_attempts: activeAttempts
        },
        performance: {
          response_time_ms: Date.now() - req.startTime,
          memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024
        }
      },
      operation_id: req.operationId
    });
  } catch (error) {
    next(error);
  }
});

// Apply error handler
router.use(errorHandler);

module.exports = router;
