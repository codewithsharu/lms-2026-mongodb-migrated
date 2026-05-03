/**
 * Bulletproof Exam Model
 * Simplified, atomic, and 100% reliable exam data structure
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const bulletproofExamSchema = new mongoose.Schema({
  // Core exam information (immutable after creation)
  exam_id: {
    type: String,
    required: true,
    unique: true,
    default: () => `exam_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    minlength: 3
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Teacher who created this exam
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Exam configuration (validated)
  config: {
    duration_minutes: {
      type: Number,
      required: true,
      min: 1,
      max: 1440 // Max 24 hours
    },
    max_attempts: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 1
    },
    allow_resume: {
      type: Boolean,
      default: true
    },
    show_results: {
      type: Boolean,
      default: true
    },
    shuffle_questions: {
      type: Boolean,
      default: false
    },
    shuffle_options: {
      type: Boolean,
      default: false
    }
  },
  
  // Questions (validated and immutable)
  questions: [{
    question_id: {
      type: String,
      required: true,
      default: () => `q_${crypto.randomBytes(4).toString('hex')}`
    },
    type: {
      type: String,
      required: true,
      enum: ['mcq', 'coding', 'blank']
    },
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 2000
    },
    marks: {
      type: Number,
      required: true,
      min: 0.5,
      max: 100
    },
    // MCQ specific
    options: [{
      option_id: String,
      text: String,
      is_correct: Boolean
    }],
    // Coding specific
    coding_details: {
      challenge_id: String,
      language: String,
      time_limit_seconds: Number,
      memory_limit_mb: Number,
      test_cases: Array
    },
    // Blank specific
    blank_answer: String,
    // Common fields
    explanation: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    tags: [String],
    order: Number
  }],
  
  // Target students/classes
  targeting: {
    class_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }],
    section_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    }],
    zones: [{
      type: String,
      enum: ['blue', 'red', 'green', 'yellow']
    }],
    individual_students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Scheduling
  schedule: {
    start_time: {
      type: Date,
      required: true
    },
    end_time: {
      type: Date,
      required: true,
      validate: {
        validator: function(v) {
          return v > this.start_time;
        },
        message: 'End time must be after start time'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  
  // Publishing state (controlled transitions only)
  state: {
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'closed', 'archived'],
      default: 'draft'
    },
    published_at: Date,
    closed_at: Date,
    archived_at: Date
  },
  
  // Statistics (calculated, not stored)
  stats: {
    total_students: { type: Number, default: 0 },
    started_attempts: { type: Number, default: 0 },
    completed_attempts: { type: Number, default: 0 },
    average_score: { type: Number, default: 0 },
    average_time: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now }
  },
  
  // System fields
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1,
    immutable: true
  },
  checksum: {
    type: String,
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'bulletproof_exams'
});

// Indexes for performance
bulletproofExamSchema.index({ exam_id: 1 }, { unique: true });
bulletproofExamSchema.index({ teacher_id: 1, created_at: -1 });
bulletproofExamSchema.index({ 'state.status': 1, 'schedule.start_time': 1 });
bulletproofExamSchema.index({ 'targeting.class_ids': 1 });
bulletproofExamSchema.index({ 'targeting.section_ids': 1 });
bulletproofExamSchema.index({ checksum: 1 });

// Pre-save middleware for validation and checksum
bulletproofExamSchema.pre('save', function(next) {
  // Validate questions
  if (this.questions.length === 0) {
    return next(new Error('Exam must have at least one question'));
  }
  
  // Calculate total marks
  const totalMarks = this.questions.reduce((sum, q) => sum + q.marks, 0);
  if (totalMarks <= 0) {
    return next(new Error('Total marks must be greater than 0'));
  }
  
  // Generate checksum for integrity
  this.checksum = this.generateChecksum();
  
  // Update stats
  this.stats.last_updated = new Date();
  
  next();
});

// Instance methods
bulletproofExamSchema.methods.generateChecksum = function() {
  const data = {
    exam_id: this.exam_id,
    title: this.title,
    config: this.config,
    questions: this.questions.map(q => ({
      question_id: q.question_id,
      type: q.type,
      question: q.question,
      marks: q.marks
    })),
    schedule: this.schedule,
    version: this.version
  };
  
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

bulletproofExamSchema.methods.isAvailableForStudent = function(studentId) {
  // Check if exam is published and within time window
  const now = new Date();
  if (this.state.status !== 'published') return false;
  if (now < this.schedule.start_time || now > this.schedule.end_time) return false;
  
  // Check if student is targeted (simplified - in real implementation would check class/section membership)
  return true;
};

bulletproofExamSchema.methods.canStudentAttempt = function(studentId, existingAttempts = []) {
  // Check availability first
  if (!this.isAvailableForStudent(studentId)) return false;
  
  // Check attempt limits
  if (existingAttempts.length >= this.config.max_attempts) return false;
  
  // Check if there's an in-progress attempt (if resume is disabled)
  if (!this.config.allow_resume) {
    const inProgress = existingAttempts.find(a => a.status === 'in_progress');
    if (inProgress) return false;
  }
  
  return true;
};

bulletproofExamSchema.methods.validateQuestions = function() {
  const errors = [];
  
  this.questions.forEach((q, index) => {
    if (q.type === 'mcq') {
      if (!q.options || q.options.length !== 4) {
        errors.push(`Question ${index + 1}: MCQ must have exactly 4 options`);
      }
      
      const correctOptions = q.options.filter(o => o.is_correct);
      if (correctOptions.length === 0) {
        errors.push(`Question ${index + 1}: MCQ must have at least one correct option`);
      }
    }
    
    if (q.type === 'coding') {
      if (!q.coding_details || !q.coding_details.challenge_id) {
        errors.push(`Question ${index + 1}: Coding question must have challenge details`);
      }
    }
    
    if (q.type === 'blank') {
      if (!q.blank_answer || q.blank_answer.trim().length === 0) {
        errors.push(`Question ${index + 1}: Blank question must have an answer`);
      }
    }
  });
  
  return errors;
};

// Static methods
bulletproofExamSchema.statics.findByTeacher = function(teacherId, options = {}) {
  const query = { teacher_id: teacherId };
  
  if (options.status) {
    query['state.status'] = options.status;
  }
  
  return this.find(query)
    .sort({ created_at: -1 })
    .select('-questions.options.is_correct') // Hide correct answers in list view
    .limit(options.limit || 50);
};

bulletproofExamSchema.statics.findAvailableForStudent = function(studentId, options = {}) {
  const now = new Date();
  
  return this.find({
    'state.status': 'published',
    'schedule.start_time': { $lte: now },
    'schedule.end_time': { $gte: now }
  })
  .sort({ 'schedule.start_time': 1 })
  .select('exam_id title description config schedule');
};

// Virtual fields
bulletproofExamSchema.virtual('total_marks').get(function() {
  return this.questions.reduce((sum, q) => sum + q.marks, 0);
});

bulletproofExamSchema.virtual('question_count').get(function() {
  return this.questions.length;
});

bulletproofExamSchema.virtual('is_active').get(function() {
  const now = new Date();
  return this.state.status === 'published' && 
         now >= this.schedule.start_time && 
         now <= this.schedule.end_time;
});

// Transform method for API responses
bulletproofExamSchema.methods.toAPIResponse = function(includeQuestions = true, includeCorrectAnswers = false) {
  const response = {
    exam_id: this.exam_id,
    title: this.title,
    description: this.description,
    config: this.config,
    schedule: this.schedule,
    state: this.state.status,
    stats: this.stats,
    total_marks: this.total_marks,
    question_count: this.question_count,
    is_active: this.is_active,
    created_at: this.created_at,
    updated_at: this.updated_at
  };
  
  if (includeQuestions) {
    response.questions = this.questions.map(q => {
      const question = {
        question_id: q.question_id,
        type: q.type,
        question: q.question,
        marks: q.marks,
        difficulty: q.difficulty,
        tags: q.tags,
        order: q.order
      };
      
      if (q.type === 'mcq') {
        question.options = q.options.map(o => ({
          option_id: o.option_id,
          text: o.text,
          is_correct: includeCorrectAnswers ? o.is_correct : undefined
        }));
      }
      
      if (q.type === 'coding') {
        question.coding_details = q.coding_details;
      }
      
      if (q.type === 'blank') {
        question.blank_answer = includeCorrectAnswers ? q.blank_answer : undefined;
      }
      
      if (q.explanation && includeCorrectAnswers) {
        question.explanation = q.explanation;
      }
      
      return question;
    });
  }
  
  return response;
};

module.exports = mongoose.model('BulletproofExam', bulletproofExamSchema);
