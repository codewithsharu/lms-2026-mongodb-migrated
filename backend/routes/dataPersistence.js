const express = require('express');
const router = express.Router();
const dataPersistenceService = require('../services/dataPersistenceService');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const AttemptDataBackup = require('../models/AttemptDataBackup');
const BestScoreRecord = require('../models/BestScoreRecord');
const { verifyToken, hasRole } = require('../middleware/auth');

const getApiErrorMessage = (error, fallback) => (process.env.NODE_ENV === 'production' ? fallback : (error?.message || fallback));

// Student: Create manual backup
router.post('/student/attempts/:attemptId/backup', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { backupType = 'manual_save', ...additionalData } = req.body;

    // Verify ownership
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const backup = await dataPersistenceService.createBackup(attemptId, backupType, {
      ...additionalData,
      trigger: 'user_action',
      browserInfo: req.headers['user-agent'] ? {
        user_agent: req.headers['user-agent'],
        screen_resolution: req.body.screenResolution,
        timezone: req.body.timezone,
        language: req.body.language,
      } : {},
      networkInfo: {
        is_online: req.body.isOnline !== false,
        connection_type: req.body.connectionType,
        effective_bandwidth: req.body.bandwidth,
      },
    });

    res.status(201).json({
      message: 'Backup created successfully',
      backup: {
        id: backup._id,
        type: backup.backup_type,
        timestamp: backup.backup_timestamp,
        sequence: backup.backup_metadata.backup_sequence,
        data_hash: backup.data_hash,
        computed_scores: backup.computed_scores,
      },
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to create backup') });
  }
});

// Student: Get all backups for an attempt
router.get('/student/attempts/:attemptId/backups', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { page = 1, limit = 20, backupType } = req.query;

    // Verify ownership
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const query = { attempt_id: attemptId };
    if (backupType) {
      query.backup_type = backupType;
    }

    const skip = (page - 1) * limit;
    const backups = await AttemptDataBackup.find(query)
      .sort({ backup_timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-attempt_state.answers -backup_metadata'); // Exclude large fields for list view

    const total = await AttemptDataBackup.countDocuments(query);

    res.json({
      backups: backups.map(backup => ({
        id: backup._id,
        type: backup.backup_type,
        timestamp: backup.backup_timestamp,
        sequence: backup.backup_metadata.backup_sequence,
        is_valid: backup.validation_status.is_valid,
        is_restorable: backup.recovery_info.is_restorable,
        computed_scores: backup.computed_scores,
        backup_size: `${backup.backup_metadata.backup_size_bytes} bytes`,
        trigger: backup.backup_metadata.backup_trigger,
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_backups: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch backups') });
  }
});

// Student: Restore from backup
router.post('/student/attempts/:attemptId/restore', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { backupId, forceRestore = false } = req.body;

    // Verify ownership
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Only allow restoration for in-progress attempts
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Can only restore in-progress attempts' });
    }

    const restoreResult = await dataPersistenceService.restoreFromBackup(attemptId, {
      backupId,
      forceRestore,
    });

    res.json({
      message: 'Attempt restored successfully',
      restore_result: {
        backup_id: restoreResult.backup._id,
        backup_timestamp: restoreResult.backup.backup_timestamp,
        backup_type: restoreResult.backup.backup_type,
        restored_scores: restoreResult.computedScores,
      },
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to restore from backup') });
  }
});

// Student: Get comprehensive attempt data
router.get('/student/attempts/:attemptId/comprehensive', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Verify ownership
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const comprehensiveData = await dataPersistenceService.getComprehensiveAttemptData(attemptId);

    res.json({
      attempt: comprehensiveData.attempt,
      backup_summary: {
        total_backups: comprehensiveData.backupCount,
        has_valid_backups: comprehensiveData.hasValidBackups,
        latest_backup: comprehensiveData.latestBackup ? {
          id: comprehensiveData.latestBackup._id,
          type: comprehensiveData.latestBackup.backup_type,
          timestamp: comprehensiveData.latestBackup.backup_timestamp,
          is_valid: comprehensiveData.latestBackup.validation_status.is_valid,
        } : null,
      },
      best_score_record: comprehensiveData.bestScoreRecord ? {
        best_score: comprehensiveData.bestScoreRecord.best_score,
        total_attempts: comprehensiveData.bestScoreRecord.metadata.total_attempts,
        achievements: comprehensiveData.bestScoreRecord.achievements.length,
        improvement_streak: comprehensiveData.bestScoreRecord.metadata.improvement_streak,
        score_history_count: comprehensiveData.bestScoreRecord.score_history.length,
      } : null,
    });
  } catch (error) {
    console.error('Get comprehensive data error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch comprehensive data') });
  }
});

// Student: Get best score records
router.get('/student/best-scores', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { assessmentId, page = 1, limit = 20 } = req.query;

    const query = { student_id: req.user.id };
    if (assessmentId) {
      query.hosted_assessment_id = assessmentId;
    }

    const skip = (page - 1) * limit;
    const bestScoreRecords = await BestScoreRecord.find(query)
      .populate('hosted_assessment_id', 'exam_title start_time end_time')
      .populate('best_attempt_id', 'attempt_number submitted_at')
      .sort({ 'best_score.overall.percentage': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BestScoreRecord.countDocuments(query);

    res.json({
      best_score_records: bestScoreRecords.map(record => ({
        id: record._id,
        assessment: record.hosted_assessment_id,
        best_attempt: record.best_attempt_id,
        best_score: record.best_score,
        total_attempts: record.metadata.total_attempts,
        achievements: record.achievements,
        improvement_streak: record.metadata.improvement_streak,
        last_updated: record.last_updated,
        performance_analytics: {
          average_improvement: record.performance_analytics.average_improvement,
          consistency_score: record.performance_analytics.consistency_score,
          learning_curve_points: record.performance_analytics.learning_curve.length,
        },
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get best scores error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch best scores') });
  }
});

// Student: Get detailed best score record
router.get('/student/best-scores/:recordId', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { recordId } = req.params;

    const bestScoreRecord = await BestScoreRecord.findOne({
      _id: recordId,
      student_id: req.user.id,
    })
      .populate('hosted_assessment_id')
      .populate('best_attempt_id')
      .populate('score_history.attempt_id');

    if (!bestScoreRecord) {
      return res.status(404).json({ error: 'Best score record not found' });
    }

    res.json({
      best_score_record: bestScoreRecord,
    });
  } catch (error) {
    console.error('Get best score record error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch best score record') });
  }
});

// Teacher: Get best scores for their assessments
router.get('/teacher/assessments/:assessmentId/best-scores', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { page = 1, limit = 50, sortBy = 'percentage', sortOrder = 'desc' } = req.query;

    // Verify ownership
    const HostedAssessment = require('../models/HostedAssessment');
    const assessment = await HostedAssessment.findOne({ _id: assessmentId, host_id: req.user.id });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const sortOptions = {};
    sortOptions[`best_score.overall.${sortBy}`] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;
    const bestScoreRecords = await BestScoreRecord.find({ hosted_assessment_id: assessmentId })
      .populate('student_id', 'full_name email')
      .populate('best_attempt_id', 'attempt_number submitted_at')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BestScoreRecord.countDocuments({ hosted_assessment_id: assessmentId });

    res.json({
      best_score_records: bestScoreRecords.map(record => ({
        id: record._id,
        student: record.student_id,
        best_attempt: record.best_attempt_id,
        best_score: record.best_score,
        total_attempts: record.metadata.total_attempts,
        achievements: record.achievements,
        improvement_streak: record.metadata.improvement_streak,
        last_updated: record.last_updated,
      })),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit),
      },
      assessment_summary: {
        title: assessment.exam_title,
        total_students: total,
        class_average: total > 0 ? 
          (await BestScoreRecord.aggregate([
            { $match: { hosted_assessment_id: assessmentId } },
            { $group: { _id: null, avgPercentage: { $avg: '$best_score.overall.percentage' } } }
          ]))[0]?.avgPercentage || 0 : 0,
      },
    });
  } catch (error) {
    console.error('Teacher get best scores error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch best scores') });
  }
});

// Admin: System-wide backup statistics
router.get('/admin/backup-statistics', verifyToken, hasRole('admin'), async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const ranges = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const days = ranges[timeRange] || 7;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const [
      totalBackups,
      validBackups,
      backupsByType,
      storageStats,
      recentBackups,
    ] = await Promise.all([
      AttemptDataBackup.countDocuments({ backup_timestamp: { $gte: startDate } }),
      AttemptDataBackup.countDocuments({ 
        backup_timestamp: { $gte: startDate },
        'validation_status.is_valid': true 
      }),
      AttemptDataBackup.aggregate([
        { $match: { backup_timestamp: { $gte: startDate } } },
        { $group: { _id: '$backup_type', count: { $sum: 1 } } }
      ]),
      AttemptDataBackup.aggregate([
        { $match: { backup_timestamp: { $gte: startDate } } },
        { $group: { 
          _id: null,
          total_size: { $sum: '$backup_metadata.backup_size_bytes' },
          avg_size: { $avg: '$backup_metadata.backup_size_bytes' },
          max_size: { $max: '$backup_metadata.backup_size_bytes' },
          min_size: { $min: '$backup_metadata.backup_size_bytes' }
        }}
      ]),
      AttemptDataBackup.find({ backup_timestamp: { $gte: startDate } })
        .sort({ backup_timestamp: -1 })
        .limit(10)
        .select('backup_type backup_timestamp backup_metadata.backup_size_bytes validation_status.is_valid'),
    ]);

    res.json({
      time_range: timeRange,
      statistics: {
        total_backups,
        valid_backups,
        validity_rate: totalBackups > 0 ? (validBackups / totalBackups) * 100 : 0,
        backups_by_type: backupsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        storage: storageStats[0] ? {
          total_size_bytes: storageStats[0].total_size,
          total_size_mb: Math.round(storageStats[0].total_size / (1024 * 1024) * 100) / 100,
          avg_size_bytes: Math.round(storageStats[0].avg_size),
          max_size_bytes: storageStats[0].max_size,
          min_size_bytes: storageStats[0].min_size,
        } : null,
      },
      recent_backups: recentBackups.map(backup => ({
        type: backup.backup_type,
        timestamp: backup.backup_timestamp,
        size_bytes: backup.backup_metadata.backup_size_bytes,
        is_valid: backup.validation_status.is_valid,
      })),
    });
  } catch (error) {
    console.error('Get backup statistics error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch backup statistics') });
  }
});

// Admin: Cleanup old backups
router.post('/admin/cleanup-backups', verifyToken, hasRole('admin'), async (req, res) => {
  try {
    const { maxAgeDays = 30, maxBackupsPerAttempt = 50 } = req.body;

    const deletedCount = await dataPersistenceService.cleanupOldBackups(maxAgeDays, maxBackupsPerAttempt);

    res.json({
      message: 'Backup cleanup completed',
      deleted_count: deletedCount,
      cleanup_parameters: {
        max_age_days: maxAgeDays,
        max_backups_per_attempt: maxBackupsPerAttempt,
      },
    });
  } catch (error) {
    console.error('Cleanup backups error:', error);
    res.status(500).json({ error: getApiErrorMessage(error, 'Failed to cleanup backups') });
  }
});

module.exports = router;
