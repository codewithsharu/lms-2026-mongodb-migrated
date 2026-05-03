const mongoose = require('mongoose');

const bestScoreRecordSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hosted_assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostedAssessment',
      required: true,
    },
    // Best score information
    best_score: {
      overall: {
        score: { type: Number, required: true },
        total_marks: { type: Number, required: true },
        percentage: { type: Number, required: true },
        correct_count: { type: Number, required: true },
        total_questions: { type: Number, required: true },
        rank: { type: Number, default: null }, // Class rank if available
      },
      mcq: {
        score: { type: Number, required: true },
        total_marks: { type: Number, required: true },
        percentage: { type: Number, required: true },
        correct_count: { type: Number, required: true },
        total_questions: { type: Number, required: true },
        time_taken_minutes: { type: Number, default: null },
      },
      coding: {
        score: { type: Number, required: true },
        total_marks: { type: Number, required: true },
        percentage: { type: Number, required: true },
        total_test_cases: { type: Number, required: true },
        passed_test_cases: { type: Number, required: true },
        execution_time_ms: { type: Number, default: null },
        challenges_solved: { type: Number, default: 0 },
        total_challenges: { type: Number, default: 0 },
      },
    },
    // Reference to the attempt that achieved this score
    best_attempt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: true,
    },
    // Score improvement tracking
    score_history: [{
      attempt_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentAttempt',
        required: true,
      },
      attempt_number: { type: Number, required: true },
      score: { type: Number, required: true },
      total_marks: { type: Number, required: true },
      percentage: { type: Number, required: true },
      achieved_at: { type: Date, required: true },
      improvement_from_previous: { type: Number, default: 0 },
      was_best_score_at_time: { type: Boolean, default: false },
      section_scores: {
        mcq: {
          score: Number,
          total_marks: Number,
          percentage: Number,
        },
        coding: {
          score: Number,
          total_marks: Number,
          percentage: Number,
        },
      },
    }],
    // Achievement badges and milestones
    achievements: [{
      badge_type: {
        type: String,
        enum: ['first_attempt', 'perfect_score', 'improvement', 'consistency', 'speed', 'mastery'],
      },
      badge_name: String,
      description: String,
      earned_at: { type: Date, required: true },
      associated_attempt_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssessmentAttempt',
      },
      badge_level: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] },
    }],
    // Performance analytics
    performance_analytics: {
      average_improvement: { type: Number, default: 0 },
      best_improvement: { type: Number, default: 0 },
      consistency_score: { type: Number, default: 0 }, // How consistent scores are
      learning_curve: [{
        attempt_number: Number,
        score: Number,
        percentage: Number,
        timestamp: Date,
      }],
      weak_areas: [{
        section: String,
        topic: String,
        performance_percentage: Number,
        improvement_needed: Boolean,
      }],
      strong_areas: [{
        section: String,
        topic: String,
        performance_percentage: Number,
      }],
    },
    // Comparison with peers (anonymized)
    peer_comparison: {
      class_average: { type: Number, default: null },
      class_percentile: { type: Number, default: null },
      total_students: { type: Number, default: null },
      students_above: { type: Number, default: null },
      students_below: { type: Number, default: null },
    },
    // Metadata
    metadata: {
      first_attempt_at: Date,
      last_attempt_at: Date,
      total_attempts: { type: Number, default: 0 },
      total_time_spent_minutes: { type: Number, default: 0 },
      average_time_per_attempt_minutes: { type: Number, default: 0 },
      best_time_taken_minutes: { type: Number, default: null },
      improvement_streak: { type: Number, default: 0 }, // Consecutive improvements
      best_streak: { type: Number, default: 0 }, // Best improvement streak
    },
    // Data integrity
    last_updated: {
      type: Date,
      default: Date.now,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // System or teacher who updated
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes for efficient querying
bestScoreRecordSchema.index({ student_id: 1, hosted_assessment_id: 1 }, { unique: true });
bestScoreRecordSchema.index({ student_id: 1, 'best_score.overall.percentage': -1 });
bestScoreRecordSchema.index({ hosted_assessment_id: 1, 'best_score.overall.percentage': -1 });
bestScoreRecordSchema.index({ 'best_attempt_id': 1 });
bestScoreRecordSchema.index({ 'score_history.attempt_id': 1 });
bestScoreRecordSchema.index({ 'achievements.earned_at': -1 });
bestScoreRecordSchema.index({ 'peer_comparison.class_percentile': 1 });

// Compound index for leaderboard queries
bestScoreRecordSchema.index(
  { hosted_assessment_id: 1, 'best_score.overall.percentage': -1, 'best_score.overall.score': -1 }
);

// Static methods for score calculations
bestScoreRecordSchema.statics.calculateImprovement = function(previousScore, currentScore) {
  if (previousScore === null || previousScore === undefined) return 0;
  return currentScore - previousScore;
};

bestScoreRecordSchema.statics.calculateConsistency = function(scoreHistory) {
  if (!scoreHistory || scoreHistory.length < 2) return 100;
  
  const scores = scoreHistory.map(h => h.percentage);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Consistency score: higher when standard deviation is lower
  return Math.max(0, 100 - (standardDeviation * 2));
};

module.exports = mongoose.model('BestScoreRecord', bestScoreRecordSchema);
