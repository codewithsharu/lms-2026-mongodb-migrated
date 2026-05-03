const crypto = require('crypto');
const AttemptDataBackup = require('../models/AttemptDataBackup');
const BestScoreRecord = require('../models/BestScoreRecord');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const { calculateAttemptSummary, calculateCodingSummary } = require('./assessmentScoringService');
const auditService = require('./auditService');

class DataPersistenceService {
  constructor() {
    this.activeBackupIntervals = new Map(); // attemptId -> interval
    this.backupQueue = new Map(); // attemptId -> queue of backups
    this.isProcessing = new Set(); // attemptIds being processed
  }

  /**
   * Create a comprehensive backup of attempt data
   */
  async createBackup(attemptId, backupType = 'auto_save', additionalData = {}) {
    try {
      // Prevent concurrent backups for same attempt
      if (this.isProcessing.has(attemptId)) {
        console.log(`Backup already in progress for attempt ${attemptId}, queuing...`);
        this.queueBackup(attemptId, backupType, additionalData);
        return null;
      }

      this.isProcessing.add(attemptId);

      const attempt = await AssessmentAttempt.findById(attemptId)
        .populate('hosted_assessment_id')
        .lean();

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      // Calculate current scores
      const template = attempt.hosted_assessment_id?.template;
      const questions = template?.template_data?.questions || [];
      
      const mcqSummary = calculateAttemptSummary(questions, attempt.answers || {}, template?.total_marks);
      const codingSummary = await calculateCodingSummary({
        codingSection: attempt.hosted_assessment_id?.coding_section,
        rawAnswers: attempt.answers || {}
      });

      const computedScores = {
        mcq: {
          attempted: mcqSummary.normalizedAnswers ? Object.keys(mcqSummary.normalizedAnswers).length : 0,
          correct: mcqSummary.correctCount,
          wrong: (mcqSummary.normalizedAnswers ? Object.keys(mcqSummary.normalizedAnswers).length : 0) - mcqSummary.correctCount,
          total: mcqSummary.totalQuestions,
          marks_obtained: mcqSummary.score,
          total_marks: mcqSummary.totalMarks,
          percentage: mcqSummary.percentage,
        },
        coding: {
          attempted: codingSummary.attemptedQuestionCount,
          executed: codingSummary.attemptedQuestionCount,
          total_test_cases: codingSummary.totalQuestionCount,
          passed_test_cases: codingSummary.passedQuestionCount,
          total: codingSummary.totalQuestionCount,
          marks_obtained: codingSummary.score,
          total_marks: codingSummary.totalMarks,
          percentage: codingSummary.totalMarks > 0 ? (codingSummary.score / codingSummary.totalMarks) * 100 : 0,
          challenges: this.extractChallengeDetails(codingSummary.challengeBreakdown),
        },
        overall: {
          total_score: mcqSummary.score + codingSummary.score,
          total_marks: mcqSummary.totalMarks + codingSummary.totalMarks,
          percentage: (mcqSummary.totalMarks + codingSummary.totalMarks) > 0 ? 
            ((mcqSummary.score + codingSummary.score) / (mcqSummary.totalMarks + codingSummary.totalMarks)) * 100 : 0,
          correct_count: mcqSummary.correctCount + codingSummary.passedQuestionCount,
          total_questions: mcqSummary.totalQuestions + codingSummary.totalQuestionCount,
        }
      };

      // Create backup data
      const backupData = {
        attempt_id: attemptId,
        student_id: attempt.student_id,
        hosted_assessment_id: attempt.hosted_assessment_id,
        backup_type,
        backup_timestamp: new Date(),
        attempt_state: {
          status: attempt.status,
          current_section: attempt.answers?.__sectionMeta?.currentSection || 'mcq',
          remaining_seconds: attempt.remaining_seconds || 0,
          section_completion_order: attempt.section_completion_order || {},
          answers: attempt.answers || {},
          ui_saved_responses: attempt.answers?.__uiSavedResponses || {},
          ui_marked_for_review: attempt.answers?.__uiMarkedForReview || {},
          ui_current_question_index: additionalData.currentQuestionIndex || 0,
          coding_submissions: attempt.answers?.__codingSubmissions || {},
          coding_frame_height: additionalData.codingFrameHeight || 0,
          coding_selected_challenge_index: additionalData.selectedChallengeIndex || 0,
          session_token: attempt.answers?.__sessionMeta?.token || null,
          session_updated_at: attempt.answers?.__sessionMeta?.updatedAt || null,
          browser_info: additionalData.browserInfo || {},
          network_info: additionalData.networkInfo || {},
        },
        computed_scores,
        data_hash: this.generateDataHash(attempt.answers || {}),
        backup_metadata: {
          backup_size_bytes: JSON.stringify(attempt.answers || {}).length,
          compression_used: false,
          backup_trigger: additionalData.trigger || 'timer',
          backup_sequence: await this.getNextBackupSequence(attemptId),
          is_incremental: backupType === 'auto_save',
          parent_backup_id: additionalData.parentBackupId || null,
        },
        validation_status: {
          is_valid: true,
          validation_errors: [],
          last_validated: new Date(),
          checksum: this.generateChecksum(attempt),
        },
      };

      const backup = new AttemptDataBackup(backupData);
      await backup.save();

      console.log(`Created ${backupType} backup for attempt ${attemptId} with hash ${backup.data_hash}`);
      
      return backup;
    } catch (error) {
      console.error(`Failed to create backup for attempt ${attemptId}:`, error);
      throw error;
    } finally {
      this.isProcessing.delete(attemptId);
      this.processBackupQueue(attemptId);
    }
  }

  /**
   * Setup progressive auto-save for an attempt
   */
  setupProgressiveSave(attemptId, options = {}) {
    const {
      intervalMs = 30000, // 30 seconds default
      maxBackups = 50,
      immediateFirst = true,
    } = options;

    // Clear existing interval if any
    this.clearProgressiveSave(attemptId);

    let backupCount = 0;

    const performBackup = async () => {
      try {
        if (backupCount >= maxBackups) {
          console.log(`Max backups reached for attempt ${attemptId}, stopping progressive save`);
          this.clearProgressiveSave(attemptId);
          return;
        }

        await this.createBackup(attemptId, 'auto_save', {
          trigger: 'progressive_timer',
          backupSequence: backupCount + 1,
        });
        
        backupCount++;
      } catch (error) {
        console.error(`Progressive save failed for attempt ${attemptId}:`, error);
      }
    };

    // Immediate first backup if requested
    if (immediateFirst) {
      performBackup();
    }

    // Set up interval
    const interval = setInterval(performBackup, intervalMs);
    this.activeBackupIntervals.set(attemptId, interval);

    console.log(`Setup progressive save for attempt ${attemptId} with ${intervalMs}ms interval`);
  }

  /**
   * Clear progressive save for an attempt
   */
  clearProgressiveSave(attemptId) {
    const interval = this.activeBackupIntervals.get(attemptId);
    if (interval) {
      clearInterval(interval);
      this.activeBackupIntervals.delete(attemptId);
      console.log(`Cleared progressive save for attempt ${attemptId}`);
    }
  }

  /**
   * Restore attempt from latest valid backup
   */
  async restoreFromBackup(attemptId, options = {}) {
    try {
      const { backupId, forceRestore = false } = options;

      let backup;
      if (backupId) {
        backup = await AttemptDataBackup.findById(backupId);
      } else {
        // Find latest valid backup
        backup = await AttemptDataBackup.findOne({
          attempt_id: attemptId,
          'validation_status.is_valid': true,
          'recovery_info.is_restorable': true,
        }).sort({ backup_timestamp: -1 });
      }

      if (!backup) {
        throw new Error('No valid backup found for restoration');
      }

      // Validate backup integrity
      const isValid = await this.validateBackupIntegrity(backup);
      if (!isValid && !forceRestore) {
        throw new Error('Backup integrity validation failed');
      }

      // Restore attempt data
      const attempt = await AssessmentAttempt.findById(attemptId);
      if (!attempt) {
        throw new Error('Attempt not found');
      }

      // Restore answers and state
      attempt.answers = backup.attempt_state.answers;
      attempt.section_completion_order = backup.attempt_state.section_completion_order;
      
      await attempt.save();

      // Update backup recovery info
      backup.recovery_info.restore_attempts += 1;
      backup.recovery_info.last_restore_attempt = new Date();
      await backup.save();

      console.log(`Successfully restored attempt ${attemptId} from backup ${backup._id}`);
      
      return {
        success: true,
        backup,
        restoredData: backup.attempt_state,
        computedScores: backup.computed_scores,
      };
    } catch (error) {
      console.error(`Failed to restore attempt ${attemptId} from backup:`, error);
      throw error;
    }
  }

  /**
   * Update best score record for a student
   */
  async updateBestScoreRecord(attemptId, forceUpdate = false) {
    try {
      const attempt = await AssessmentAttempt.findById(attemptId)
        .populate('hosted_assessment_id')
        .lean();

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      // Only update for submitted attempts
      if (attempt.status !== 'submitted' && attempt.status !== 'auto_submitted') {
        return null;
      }

      const studentId = attempt.student_id;
      const hostedAssessmentId = attempt.hosted_assessment_id;

      // Find or create best score record
      let bestScoreRecord = await BestScoreRecord.findOne({
        student_id: studentId,
        hosted_assessment_id: hostedAssessmentId,
      });

      const isNewRecord = !bestScoreRecord;
      if (isNewRecord) {
        bestScoreRecord = new BestScoreRecord({
          student_id: studentId,
          hosted_assessment_id: hostedAssessmentId,
        });
      }

      // Calculate current attempt scores
      const currentScore = {
        overall: {
          score: attempt.score || 0,
          total_marks: attempt.total_marks || 0,
          percentage: attempt.percentage || 0,
          correct_count: attempt.correct_count || 0,
          total_questions: attempt.total_questions || 0,
        },
        mcq: {
          score: attempt.section_results?.mcq?.marks_obtained || 0,
          total_marks: attempt.section_results?.mcq?.total_marks || 0,
          percentage: attempt.section_results?.mcq?.total_marks > 0 ? 
            ((attempt.section_results.mcq.marks_obtained / attempt.section_results.mcq.total_marks) * 100) : 0,
          correct_count: attempt.section_results?.mcq?.correct || 0,
          total_questions: attempt.section_results?.mcq?.total || 0,
        },
        coding: {
          score: attempt.section_results?.coding?.marks_obtained || 0,
          total_marks: attempt.section_results?.coding?.total_marks || 0,
          percentage: attempt.section_results?.coding?.total_marks > 0 ? 
            ((attempt.section_results.coding.marks_obtained / attempt.section_results.coding.total_marks) * 100) : 0,
          total_test_cases: attempt.section_results?.coding?.total_test_cases || 0,
          passed_test_cases: attempt.section_results?.coding?.passed_test_cases || 0,
          challenges_solved: attempt.section_results?.coding?.challenges?.filter(c => c.executed).length || 0,
          total_challenges: attempt.section_results?.coding?.challenges?.length || 0,
        },
      };

      // Check if this is a new best score
      const isBestScore = !bestScoreRecord.best_score || 
        currentScore.overall.score > bestScoreRecord.best_score.overall.score ||
        (currentScore.overall.score === bestScoreRecord.best_score.overall.score && 
         currentScore.overall.percentage > bestScoreRecord.best_score.overall.percentage);

      if (isBestScore || forceUpdate || isNewRecord) {
        // Update best score
        bestScoreRecord.best_score = currentScore;
        bestScoreRecord.best_attempt_id = attempt._id;
      }

      // Add to score history
      const previousScore = bestScoreRecord.score_history.length > 0 ? 
        bestScoreRecord.score_history[bestScoreRecord.score_history.length - 1].score : 0;
      
      const improvement = currentScore.overall.score - previousScore;

      bestScoreRecord.score_history.push({
        attempt_id: attempt._id,
        attempt_number: attempt.attempt_number,
        score: currentScore.overall.score,
        total_marks: currentScore.overall.total_marks,
        percentage: currentScore.overall.percentage,
        achieved_at: attempt.submitted_at || new Date(),
        improvement_from_previous: improvement,
        was_best_score_at_time: isBestScore,
        section_scores: {
          mcq: currentScore.mcq,
          coding: currentScore.coding,
        },
      });

      // Update analytics
      this.updatePerformanceAnalytics(bestScoreRecord);
      
      // Update metadata
      this.updateMetadata(bestScoreRecord, attempt);

      // Check for achievements
      await this.checkAndAwardAchievements(bestScoreRecord, attempt, currentScore, isNewRecord);

      bestScoreRecord.last_updated = new Date();
      await bestScoreRecord.save();

      console.log(`Updated best score record for student ${studentId}, assessment ${hostedAssessmentId}. Best score: ${bestScoreRecord.best_score.overall.score}`);

      return bestScoreRecord;
    } catch (error) {
      console.error(`Failed to update best score record for attempt ${attemptId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive attempt data with all backups and scores
   */
  async getComprehensiveAttemptData(attemptId) {
    try {
      const [attempt, backups, bestScoreRecord] = await Promise.all([
        AssessmentAttempt.findById(attemptId).populate('hosted_assessment_id'),
        AttemptDataBackup.find({ attempt_id: attemptId }).sort({ backup_timestamp: -1 }),
        BestScoreRecord.findOne({
          student_id: (await AssessmentAttempt.findById(attemptId)).student_id,
          hosted_assessment_id: (await AssessmentAttempt.findById(attemptId)).hosted_assessment_id,
        }),
      ]);

      return {
        attempt,
        backups: backups.map(backup => ({
          ...backup.toObject(),
          data_size: `${backup.backup_metadata.backup_size_bytes} bytes`,
          is_valid: backup.validation_status.is_valid,
          restorable: backup.recovery_info.is_restorable,
        })),
        bestScoreRecord,
        latestBackup: backups[0] || null,
        backupCount: backups.length,
        hasValidBackups: backups.some(b => b.validation_status.is_valid && b.recovery_info.is_restorable),
      };
    } catch (error) {
      console.error(`Failed to get comprehensive data for attempt ${attemptId}:`, error);
      throw error;
    }
  }

  // Helper methods
  generateDataHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  generateChecksum(attempt) {
    const checksumData = {
      id: attempt._id,
      student_id: attempt.student_id,
      status: attempt.status,
      score: attempt.score,
      updated_at: attempt.updated_at,
    };
    return crypto.createHash('md5').update(JSON.stringify(checksumData)).digest('hex');
  }

  async getNextBackupSequence(attemptId) {
    const lastBackup = await AttemptDataBackup.findOne({ attempt_id: attemptId })
      .sort({ 'backup_metadata.backup_sequence': -1 });
    return (lastBackup?.backup_metadata?.backup_sequence || 0) + 1;
  }

  extractChallengeDetails(challengeBreakdown) {
    if (!challengeBreakdown) return [];
    
    return Object.entries(challengeBreakdown).map(([challengeId, details]) => ({
      challenge_id: challengeId,
      attempted: details.totalQuestionCount > 0,
      executed: details.passedQuestionCount > 0,
      total_test_cases: details.totalQuestionCount,
      passed_test_cases: details.passedQuestionCount,
      marks_obtained: details.score,
      execution_time: details.executionTime || 0,
      last_submission: details.lastSubmissionTime || null,
    }));
  }

  async validateBackupIntegrity(backup) {
    try {
      // Validate data hash
      const currentHash = this.generateDataHash(backup.attempt_state.answers);
      if (currentHash !== backup.data_hash) {
        backup.validation_status.is_valid = false;
        backup.validation_status.validation_errors.push('Data hash mismatch');
        await backup.save();
        return false;
      }

      // Validate checksum
      const attempt = await AssessmentAttempt.findById(backup.attempt_id);
      const currentChecksum = this.generateChecksum(attempt);
      if (backup.validation_status.checksum !== currentChecksum) {
        backup.validation_status.is_valid = false;
        backup.validation_status.validation_errors.push('Checksum mismatch');
        await backup.save();
        return false;
      }

      backup.validation_status.is_valid = true;
      backup.validation_status.last_validated = new Date();
      await backup.save();
      return true;
    } catch (error) {
      console.error(`Backup validation failed:`, error);
      return false;
    }
  }

  queueBackup(attemptId, backupType, additionalData) {
    if (!this.backupQueue.has(attemptId)) {
      this.backupQueue.set(attemptId, []);
    }
    this.backupQueue.get(attemptId).push({ backupType, additionalData });
  }

  async processBackupQueue(attemptId) {
    const queue = this.backupQueue.get(attemptId);
    if (!queue || queue.length === 0) return;

    const { backupType, additionalData } = queue.shift();
    try {
      await this.createBackup(attemptId, backupType, additionalData);
    } catch (error) {
      console.error(`Queued backup failed for attempt ${attemptId}:`, error);
    }

    // Process next in queue if any
    if (queue.length > 0) {
      setTimeout(() => this.processBackupQueue(attemptId), 1000);
    }
  }

  updatePerformanceAnalytics(bestScoreRecord) {
    const history = bestScoreRecord.score_history;
    if (history.length < 2) return;

    // Calculate improvements
    const improvements = history.slice(1).map((entry, index) => 
      entry.score - history[index].score
    );

    bestScoreRecord.performance_analytics.average_improvement = 
      improvements.reduce((a, b) => a + b, 0) / improvements.length;
    bestScoreRecord.performance_analytics.best_improvement = Math.max(...improvements);
    bestScoreRecord.performance_analytics.consistency_score = 
      BestScoreRecord.calculateConsistency(history);

    // Build learning curve
    bestScoreRecord.performance_analytics.learning_curve = history.map(entry => ({
      attempt_number: entry.attempt_number,
      score: entry.score,
      percentage: entry.percentage,
      timestamp: entry.achieved_at,
    }));
  }

  updateMetadata(bestScoreRecord, attempt) {
    const now = new Date();
    
    if (!bestScoreRecord.metadata.first_attempt_at) {
      bestScoreRecord.metadata.first_attempt_at = attempt.started_at;
    }
    
    bestScoreRecord.metadata.last_attempt_at = attempt.submitted_at || now;
    bestScoreRecord.metadata.total_attempts = bestScoreRecord.score_history.length;
    
    // Calculate time metrics
    if (attempt.started_at && attempt.submitted_at) {
      const timeSpent = (attempt.submitted_at - attempt.started_at) / (1000 * 60); // minutes
      bestScoreRecord.metadata.total_time_spent_minutes += timeSpent;
      bestScoreRecord.metadata.average_time_per_attempt_minutes = 
        bestScoreRecord.metadata.total_time_spent_minutes / bestScoreRecord.metadata.total_attempts;
      
      if (!bestScoreRecord.metadata.best_time_taken_minutes || 
          timeSpent < bestScoreRecord.metadata.best_time_taken_minutes) {
        bestScoreRecord.metadata.best_time_taken_minutes = timeSpent;
      }
    }

    // Update improvement streak
    const lastImprovement = bestScoreRecord.score_history[bestScoreRecord.score_history.length - 1]?.improvement_from_previous || 0;
    if (lastImprovement > 0) {
      bestScoreRecord.metadata.improvement_streak++;
      bestScoreRecord.metadata.best_streak = Math.max(
        bestScoreRecord.metadata.best_streak,
        bestScoreRecord.metadata.improvement_streak
      );
    } else {
      bestScoreRecord.metadata.improvement_streak = 0;
    }
  }

  async checkAndAwardAchievements(bestScoreRecord, attempt, currentScore, isNewRecord) {
    const achievements = [];

    // First attempt achievement
    if (isNewRecord) {
      achievements.push({
        badge_type: 'first_attempt',
        badge_name: 'First Step',
        description: 'Completed your first attempt',
        earned_at: new Date(),
        associated_attempt_id: attempt._id,
        badge_level: 'bronze',
      });
    }

    // Perfect score achievement
    if (currentScore.overall.percentage === 100) {
      achievements.push({
        badge_type: 'perfect_score',
        badge_name: 'Perfect Score',
        description: 'Achieved 100% score',
        earned_at: new Date(),
        associated_attempt_id: attempt._id,
        badge_level: 'platinum',
      });
    }

    // Improvement achievement
    const improvement = currentScore.overall.score - (bestScoreRecord.score_history[bestScoreRecord.score_history.length - 2]?.score || 0);
    if (improvement > 0) {
      let level = 'bronze';
      if (improvement > 20) level = 'silver';
      if (improvement > 50) level = 'gold';
      
      achievements.push({
        badge_type: 'improvement',
        badge_name: 'Improvement',
        description: `Improved score by ${improvement} points`,
        earned_at: new Date(),
        associated_attempt_id: attempt._id,
        badge_level: level,
      });
    }

    // Add new achievements to record
    if (achievements.length > 0) {
      bestScoreRecord.achievements.push(...achievements);
    }
  }

  /**
   * Clean up old backups to prevent storage bloat
   */
  async cleanupOldBackups(maxAgeDays = 30, maxBackupsPerAttempt = 50) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      // Delete old backups
      const deleteResult = await AttemptDataBackup.deleteMany({
        backup_timestamp: { $lt: cutoffDate },
      });

      // Keep only the most recent backups per attempt
      const attempts = await AssessmentAttempt.find({}).select('_id');
      
      for (const attempt of attempts) {
        const backups = await AttemptDataBackup.find({ attempt_id: attempt._id })
          .sort({ backup_timestamp: -1 })
          .skip(maxBackupsPerAttempt);
        
        if (backups.length > 0) {
          const backupIds = backups.map(b => b._id);
          await AttemptDataBackup.deleteMany({ _id: { $in: backupIds } });
        }
      }

      console.log(`Cleanup completed. Deleted ${deleteResult.deletedCount} old backups.`);
      return deleteResult.deletedCount;
    } catch (error) {
      console.error('Backup cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new DataPersistenceService();
