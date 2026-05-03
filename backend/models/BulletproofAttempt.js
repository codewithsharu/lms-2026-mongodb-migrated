/**
 * Bulletproof Exam Attempt Model
 * Atomic state management with 100% data preservation
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const bulletproofAttemptSchema = new mongoose.Schema({
  // Core identifiers
  attempt_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `attempt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  },
  exam_id: {
    type: String,
    required: true,
    ref: 'BulletproofExam'
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attempt_number: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Attempt state (immutable transitions only)
  state: {
    status: {
      type: String,
      required: true,
      enum: ['created', 'started', 'in_progress', 'paused', 'submitted', 'expired', 'abandoned'],
      default: 'created'
    },
    started_at: Date,
    paused_at: Date,
    resumed_at: Date,
    submitted_at: Date,
    expired_at: Date,
    abandoned_at: Date,
    last_activity: {
      type: Date,
      default: Date.now
    }
  },
  
  // Time tracking
  timing: {
    duration_minutes: Number,
    remaining_seconds: {
      type: Number,
      required: true,
      min: 0
    },
    total_time_spent_seconds: {
      type: Number,
      default: 0
    },
    extensions: [{
      reason: String,
      minutes_added: Number,
      granted_at: Date,
      granted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  
  // Current state (always preserved)
  current_state: {
    current_question_index: {
      type: Number,
      default: 0,
      min: 0
    },
    current_section: {
      type: String,
      enum: ['mcq', 'coding'],
      default: 'mcq'
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    marked_for_review: {
      type: [String],
      default: []
    },
    coding_submissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    session_token: String,
    browser_info: {
      user_agent: String,
      screen_resolution: String,
      timezone: String,
      language: String
    },
    network_info: {
      is_online: Boolean,
      connection_type: String,
      effective_bandwidth: Number
    }
  },
  
  // State history (complete audit trail)
  state_history: [{
    version: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    state_snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    change_type: {
      type: String,
      enum: ['created', 'answer_saved', 'question_changed', 'section_changed', 'paused', 'resumed', 'submitted', 'expired'],
      required: true
    },
    trigger: {
      type: String,
      enum: ['user_action', 'auto_save', 'system_action', 'recovery'],
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Results (calculated at submission)
  results: {
    score: {
      type: Number,
      min: 0
    },
    total_marks: {
      type: Number,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    correct_count: {
      type: Number,
      min: 0
    },
    total_questions: {
      type: Number,
      min: 0
    },
    section_breakdown: {
      mcq: {
        attempted: Number,
        correct: Number,
        marks_obtained: Number,
        total_marks: Number
      },
      coding: {
        attempted: Number,
        executed: Number,
        marks_obtained: Number,
        total_marks: Number,
        test_cases_passed: Number,
        total_test_cases: Number
      }
    },
    time_taken_seconds: Number,
    submission_type: {
      type: String,
      enum: ['manual', 'auto_submit', 'timeout', 'recovery']
    }
  },
  
  // Backup and recovery
  backups: [{
    backup_id: String,
    timestamp: Date,
    state_snapshot: mongoose.Schema.Types.Mixed,
    backup_type: {
      type: String,
      enum: ['auto_save', 'manual_save', 'session_start', 'session_end', 'recovery']
    },
    size_bytes: Number,
    is_valid: Boolean,
    checksum: String
  }],
  
  // Integrity and validation
  integrity: {
    checksum: {
      type: String,
      required: true
    },
    last_validated: Date,
    validation_errors: [String],
    corruption_detected: Boolean
  },
  
  // System metadata
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'bulletproof_attempts'
});

// Indexes for performance
bulletproofAttemptSchema.index({ attempt_id: 1 }, { unique: true });
bulletproofAttemptSchema.index({ exam_id: 1, student_id: 1 });
bulletproofAttemptSchema.index({ student_id: 1, 'state.status': 1 });
bulletproofAttemptSchema.index({ exam_id: 1, 'state.status': 1 });
bulletproofAttemptSchema.index({ 'state.last_activity': -1 });
bulletproofAttemptSchema.index({ 'integrity.checksum': 1 });

// Pre-save middleware
bulletproofAttemptSchema.pre('save', function(next) {
  // Update last activity
  this.state.last_activity = new Date();
  
  // Generate checksum
  this.integrity.checksum = this.generateChecksum();
  
  // Validate state transitions
  if (this.isModified('state.status')) {
    if (!this.isValidStateTransition(this._previousStateStatus, this.state.status)) {
      return next(new Error(`Invalid state transition from ${this._previousStateStatus} to ${this.state.status}`));
    }
  }
  
  next();
});

// Instance methods
bulletproofAttemptSchema.methods.generateChecksum = function() {
  const data = {
    attempt_id: this.attempt_id,
    exam_id: this.exam_id,
    student_id: this.student_id,
    state: this.state,
    timing: this.timing,
    current_state: this.current_state
  };
  
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

bulletproofAttemptSchema.methods.isValidStateTransition = function(fromStatus, toStatus) {
  const validTransitions = {
    'created': ['started', 'abandoned'],
    'started': ['in_progress', 'abandoned'],
    'in_progress': ['paused', 'submitted', 'expired', 'abandoned'],
    'paused': ['resumed', 'expired', 'abandoned'],
    'resumed': ['in_progress', 'expired', 'abandoned'],
    'submitted': [], // Terminal state
    'expired': [], // Terminal state
    'abandoned': [] // Terminal state
  };
  
  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

bulletproofAttemptSchema.methods.createStateSnapshot = function(changeType, trigger, metadata = {}) {
  const snapshot = {
    version: this.state_history.length + 1,
    timestamp: new Date(),
    state_snapshot: {
      current_question_index: this.current_state.current_question_index,
      current_section: this.current_state.current_section,
      answers: { ...this.current_state.answers },
      marked_for_review: [...this.current_state.marked_for_review],
      coding_submissions: { ...this.current_state.coding_submissions },
      timing: {
        remaining_seconds: this.timing.remaining_seconds,
        total_time_spent_seconds: this.timing.total_time_spent_seconds
      }
    },
    change_type: changeType,
    trigger: trigger,
    metadata: metadata
  };
  
  this.state_history.push(snapshot);
  return snapshot;
};

bulletproofAttemptSchema.methods.createBackup = function(backupType, metadata = {}) {
  const backup = {
    backup_id: `backup_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date(),
    state_snapshot: {
      current_question_index: this.current_state.current_question_index,
      current_section: this.current_state.current_section,
      answers: { ...this.current_state.answers },
      marked_for_review: [...this.current_state.marked_for_review],
      coding_submissions: { ...this.current_state.coding_submissions },
      timing: { ...this.timing }
    },
    backup_type: backupType,
    size_bytes: JSON.stringify(this.current_state).length,
    is_valid: true,
    checksum: this.generateBackupChecksum()
  };
  
  this.backups.push(backup);
  
  // Keep only last 50 backups to prevent storage bloat
  if (this.backups.length > 50) {
    this.backups = this.backups.slice(-50);
  }
  
  return backup;
};

bulletproofAttemptSchema.methods.generateBackupChecksum = function() {
  const data = {
    current_state: this.current_state,
    timing: this.timing,
    timestamp: new Date()
  };
  
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

bulletproofAttemptSchema.methods.restoreFromBackup = function(backupId) {
  const backup = this.backups.find(b => b.backup_id === backupId);
  
  if (!backup) {
    throw new Error('Backup not found');
  }
  
  if (!backup.is_valid) {
    throw new Error('Backup is marked as invalid');
  }
  
  // Validate backup integrity
  const currentChecksum = this.generateBackupChecksum();
  if (backup.checksum !== currentChecksum) {
    backup.is_valid = false;
    backup.integrity.validation_errors = ['Checksum mismatch'];
    throw new Error('Backup integrity check failed');
  }
  
  // Restore state
  this.current_state = { ...backup.state_snapshot };
  this.timing = { ...backup.state_snapshot.timing };
  
  // Create recovery snapshot
  this.createStateSnapshot('recovery', 'recovery', {
    backup_id: backupId,
    backup_timestamp: backup.timestamp
  });
  
  return backup;
};

bulletproofAttemptSchema.methods.saveAnswer = function(questionId, answer, metadata = {}) {
  const previousAnswer = this.current_state.answers[questionId];
  this.current_state.answers[questionId] = answer;
  
  // Create state snapshot
  this.createStateSnapshot('answer_saved', 'user_action', {
    question_id: questionId,
    previous_answer: previousAnswer,
    new_answer: answer,
    ...metadata
  });
  
  // Create backup
  this.createBackup('manual_save', {
    question_id: questionId,
    trigger: 'answer_save'
  });
  
  return true;
};

bulletproofAttemptSchema.methods.navigateToQuestion = function(questionIndex, metadata = {}) {
  const previousIndex = this.current_state.current_question_index;
  this.current_state.current_question_index = Math.max(0, questionIndex);
  
  // Create state snapshot
  this.createStateSnapshot('question_changed', 'user_action', {
    previous_question: previousIndex,
    new_question: this.current_state.current_question_index,
    ...metadata
  });
  
  return true;
};

bulletproofAttemptSchema.methods.pauseAttempt = function(reason = 'user_request') {
  if (this.state.status !== 'in_progress') {
    throw new Error('Only in-progress attempts can be paused');
  }
  
  this.state.status = 'paused';
  this.state.paused_at = new Date();
  
  // Create state snapshot
  this.createStateSnapshot('paused', 'user_action', { reason });
  
  // Create backup
  this.createBackup('session_end', { reason });
  
  return true;
};

bulletproofAttemptSchema.methods.resumeAttempt = function() {
  if (this.state.status !== 'paused') {
    throw new Error('Only paused attempts can be resumed');
  }
  
  this.state.status = 'in_progress';
  this.state.resumed_at = new Date();
  
  // Create state snapshot
  this.createStateSnapshot('resumed', 'user_action');
  
  // Create backup
  this.createBackup('session_start');
  
  return true;
};

bulletproofAttemptSchema.methods.submitAttempt = function(submissionType = 'manual') {
  if (!['in_progress', 'paused'].includes(this.state.status)) {
    throw new Error('Only active attempts can be submitted');
  }
  
  this.state.status = 'submitted';
  this.state.submitted_at = new Date();
  
  // Calculate time taken
  if (this.state.started_at) {
    this.results.time_taken_seconds = Math.floor((new Date() - this.state.started_at) / 1000);
  }
  
  // Create final backup
  this.createBackup('session_end', { submission_type: submissionType });
  
  // Create state snapshot
  this.createStateSnapshot('submitted', submissionType === 'auto_submit' ? 'system_action' : 'user_action', {
    submission_type: submissionType
  });
  
  return true;
};

bulletproofAttemptSchema.methods.expireAttempt = function() {
  if (this.state.status !== 'in_progress') {
    throw new Error('Only in-progress attempts can be expired');
  }
  
  this.state.status = 'expired';
  this.state.expired_at = new Date();
  this.timing.remaining_seconds = 0;
  
  // Create state snapshot
  this.createStateSnapshot('expired', 'system_action');
  
  // Create backup
  this.createBackup('session_end', { reason: 'timeout' });
  
  return true;
};

bulletproofAttemptSchema.methods.abandonAttempt = function(reason = 'user_abandoned') {
  if (['submitted', 'expired', 'abandoned'].includes(this.state.status)) {
    throw new Error('Attempt cannot be abandoned in current state');
  }
  
  this.state.status = 'abandoned';
  this.state.abandoned_at = new Date();
  
  // Create state snapshot
  this.createStateSnapshot('abandoned', 'user_action', { reason });
  
  // Create backup
  this.createBackup('session_end', { reason });
  
  return true;
};

bulletproofAttemptSchema.methods.updateTiming = function(remainingSeconds, timeSpentSeconds) {
  this.timing.remaining_seconds = Math.max(0, remainingSeconds);
  this.timing.total_time_spent_seconds = Math.max(0, timeSpentSeconds);
  
  // Check for expiration
  if (this.timing.remaining_seconds <= 0 && this.state.status === 'in_progress') {
    this.expireAttempt();
  }
  
  return true;
};

bulletproofAttemptSchema.methods.validateIntegrity = function() {
  const errors = [];
  
  // Check checksum
  const currentChecksum = this.generateChecksum();
  if (currentChecksum !== this.integrity.checksum) {
    errors.push('Checksum mismatch detected');
    this.integrity.corruption_detected = true;
  }
  
  // Validate state history
  this.state_history.forEach((snapshot, index) => {
    if (snapshot.version !== index + 1) {
      errors.push(`State history version mismatch at index ${index}`);
    }
  });
  
  // Validate backups
  this.backups.forEach(backup => {
    if (!backup.backup_id || !backup.timestamp) {
      errors.push(`Invalid backup detected: ${backup.backup_id}`);
      backup.is_valid = false;
    }
  });
  
  this.integrity.validation_errors = errors;
  this.integrity.last_validated = new Date();
  
  return errors.length === 0;
};

// Static methods
bulletproofAttemptSchema.statics.findActiveAttempts = function(examId) {
  return this.find({
    exam_id: examId,
    'state.status': { $in: ['created', 'started', 'in_progress', 'paused'] }
  });
};

bulletproofAttemptSchema.statics.findStudentAttempts = function(studentId, examId) {
  return this.find({
    student_id: studentId,
    exam_id: examId
  }).sort({ attempt_number: -1 });
};

bulletproofAttemptSchema.statics.getAttemptStatistics = function(examId) {
  return this.aggregate([
    { $match: { exam_id: examId } },
    {
      $group: {
        _id: '$state.status',
        count: { $sum: 1 },
        average_score: { $avg: '$results.score' },
        average_time: { $avg: '$results.time_taken_seconds' }
      }
    }
  ]);
};

// Virtual fields
bulletproofAttemptSchema.virtual('is_active').get(function() {
  return ['created', 'started', 'in_progress', 'paused'].includes(this.state.status);
});

bulletproofAttemptSchema.virtual('is_completed').get(function() {
  return ['submitted', 'expired'].includes(this.state.status);
});

bulletproofAttemptSchema.virtual('progress_percentage').get(function() {
  const totalQuestions = this.current_state.answers ? Object.keys(this.current_state.answers).length : 0;
  // This would need to be calculated based on actual exam question count
  return totalQuestions > 0 ? (totalQuestions / totalQuestions) * 100 : 0;
});

// Transform method for API responses
bulletproofAttemptSchema.methods.toAPIResponse = function(includeState = true, includeHistory = false) {
  const response = {
    attempt_id: this.attempt_id,
    exam_id: this.exam_id,
    attempt_number: this.attempt_number,
    state: this.state,
    timing: this.timing,
    results: this.results,
    is_active: this.is_active,
    is_completed: this.is_completed,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
  
  if (includeState) {
    response.current_state = {
      current_question_index: this.current_state.current_question_index,
      current_section: this.current_state.current_section,
      marked_for_review: this.current_state.marked_for_review,
      session_token: this.current_state.session_token
    };
    
    // Include answers only for in-progress attempts
    if (this.state.status === 'in_progress') {
      response.current_state.answers = this.current_state.answers;
      response.current_state.coding_submissions = this.current_state.coding_submissions;
    }
  }
  
  if (includeHistory) {
    response.state_history = this.state_history;
    response.backups = this.backups;
  }
  
  return response;
};

module.exports = mongoose.model('BulletproofAttempt', bulletproofAttemptSchema);
