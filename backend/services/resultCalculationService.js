const mongoose = require('mongoose');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const HostedAssessment = require('../models/HostedAssessment');
const AssessmentTemplate = require('../models/AssessmentTemplate');
const AssessmentScoringService = require('./assessmentScoringService');

/**
 * Calculate detailed results for an assessment attempt
 */
const calculateAttemptResults = async (attemptId) => {
  try {
    const attempt = await AssessmentAttempt.findById(attemptId)
      .populate('hosted_assessment_id')
      .populate('student_id', 'email full_name')
      .lean();

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const hostedAssessment = attempt.hosted_assessment_id;
    const template = await AssessmentTemplate.findById(hostedAssessment.template_id).lean();
    
    if (!template) {
      throw new Error('Assessment template not found');
    }

    const answers = attempt.answers || {};
    const templateData = template.template_data || {};
    const questions = templateData.questions || [];
    const codingSection = hostedAssessment.coding_section;
    const scoringService = new AssessmentScoringService();

    // Initialize section results
    const sectionResults = {
      mcq: {
        attempted: 0,
        correct: 0,
        wrong: 0,
        total: questions.length,
        marks_obtained: 0,
        total_marks: 0
      },
      coding: {
        attempted: 0,
        executed: 0,
        total_test_cases: 0,
        passed_test_cases: 0,
        total: codingSection?.challenge_ids?.length || 0,
        marks_obtained: 0,
        total_marks: 0,
        challenges: []
      }
    };

    // Calculate MCQ results
    let mcqTotalMarks = 0;
    questions.forEach((question, index) => {
      const questionMarks = question.marks || 1;
      mcqTotalMarks += questionMarks;
      
      const userAnswer = answers[String(index)] ?? answers[`q${index}`];
      if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
        sectionResults.mcq.attempted++;
        
        const isCorrect = checkMCQAnswer(question, userAnswer);
        if (isCorrect) {
          sectionResults.mcq.correct++;
          sectionResults.mcq.marks_obtained += questionMarks;
        } else {
          sectionResults.mcq.wrong++;
        }
      }
    });
    sectionResults.mcq.total_marks = mcqTotalMarks;

    // Calculate Coding results
    if (codingSection && codingSection.enabled) {
      const codingSummary = await scoringService.calculateCodingSummary({
        codingSection,
        rawAnswers: answers
      });

      sectionResults.coding.attempted = codingSummary.attemptedQuestionCount;
      sectionResults.coding.executed = codingSummary.attemptedQuestionCount;
      sectionResults.coding.total_test_cases = codingSummary.totalQuestionCount;
      sectionResults.coding.passed_test_cases = codingSummary.passedQuestionCount;
      sectionResults.coding.total = codingSummary.totalQuestionCount;
      sectionResults.coding.marks_obtained = codingSummary.score;
      sectionResults.coding.total_marks = codingSummary.totalMarks;
      sectionResults.coding.challenges = Object.entries(codingSummary.challengeBreakdown || {}).map(([challengeId, details]) => ({
        challenge_id: challengeId,
        attempted: (details.attemptedQuestionCount || 0) > 0,
        executed: (details.passedQuestionCount || 0) > 0,
        total_test_cases: details.totalQuestionCount || 0,
        passed_test_cases: details.passedQuestionCount || 0,
        marks_obtained: details.score || 0,
        execution_time: details.executionTime || 0,
        last_submission: details.lastSubmissionTime ? new Date(details.lastSubmissionTime) : null
      }));
    }

    // Calculate overall results
    const totalMarks = sectionResults.mcq.total_marks + sectionResults.coding.total_marks;
    const obtainedMarks = sectionResults.mcq.marks_obtained + sectionResults.coding.marks_obtained;
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;

    // Update attempt with detailed results
    await AssessmentAttempt.findByIdAndUpdate(attemptId, {
      score: obtainedMarks,
      total_marks: totalMarks,
      percentage: percentage,
      correct_count: sectionResults.mcq.correct,
      total_questions: sectionResults.mcq.total,
      section_results: sectionResults
    });

    return {
      attemptId,
      student: attempt.student_id,
      sectionResults,
      overall: {
        score: obtainedMarks,
        total_marks: totalMarks,
        percentage: percentage,
        status: percentage >= (template.passing_percentage || 40) ? 'PASS' : 'FAIL'
      }
    };

  } catch (error) {
    console.error('Error calculating attempt results:', error);
    throw error;
  }
};

/**
 * Check if MCQ answer is correct
 */
const checkMCQAnswer = (question, userAnswer) => {
  if (question.type === 'mcq') {
    const correctOptions = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer 
      : [question.correctAnswer];
    
    if (Array.isArray(userAnswer)) {
      // Multiple correct answers case
      return userAnswer.length === correctOptions.length && 
             userAnswer.every(answer => correctOptions.includes(answer));
    } else {
      // Single answer case
      return correctOptions.includes(userAnswer);
    }
  } else if (question.type === 'blank') {
    // For fill-in-the-blank, check against correct answer(s)
    const correctAnswers = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer.map(ans => ans.toLowerCase().trim())
      : [question.correctAnswer.toLowerCase().trim()];
    
    return correctAnswers.includes(userAnswer.toLowerCase().trim());
  }
  
  return false;
};

/**
 * Calculate marks for coding challenge based on test case pass percentage
 */
const calculateCodingChallengeMarks = (passPercentage, totalQuestionMarks) => {
  if (passPercentage >= 100) return totalQuestionMarks;
  if (passPercentage >= 80) return totalQuestionMarks * 0.8;
  if (passPercentage >= 60) return totalQuestionMarks * 0.6;
  if (passPercentage >= 40) return totalQuestionMarks * 0.4;
  if (passPercentage >= 20) return totalQuestionMarks * 0.2;
  return 0;
};

/**
 * Calculate total marks for coding section
 */
const calculateTotalCodingMarks = (codingSection, mcqQuestionCount) => {
  // Default: 50% of total marks for coding if enabled
  // This can be configured based on assessment settings
  const baseMarks = mcqQuestionCount * 2; // Assuming 2 marks per MCQ question
  return codingSection.enabled ? baseMarks : 0;
};

/**
 * Get student's detailed results
 */
const getStudentResults = async (studentId, hostedAssessmentId) => {
  try {
    const attempts = await AssessmentAttempt.find({
      student_id: studentId,
      hosted_assessment_id: hostedAssessmentId
    })
    .populate('hosted_assessment_id')
    .sort({ attempt_number: 1 })
    .lean();

    if (!attempts.length) {
      throw new Error('No attempts found for this student');
    }

    return attempts.map(attempt => ({
      attempt_number: attempt.attempt_number,
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      section_results: attempt.section_results,
      overall: {
        score: attempt.score,
        total_marks: attempt.total_marks,
        percentage: attempt.percentage,
        status: attempt.percentage >= 40 ? 'PASS' : 'FAIL' // Can be made configurable
      }
    }));
  } catch (error) {
    console.error('Error getting student results:', error);
    throw error;
  }
};

/**
 * Get dashboard analytics for all students
 */
const getDashboardAnalytics = async (hostedAssessmentId) => {
  try {
    const attempts = await AssessmentAttempt.find({
      hosted_assessment_id: hostedAssessmentId,
      status: { $in: ['submitted', 'auto_submitted'] }
    })
    .populate('student_id', 'email full_name')
    .lean();

    const analytics = {
      total_students: attempts.length,
      passed_students: 0,
      failed_students: 0,
      average_score: 0,
      average_percentage: 0,
      section_analytics: {
        mcq: {
          average_attempted: 0,
          average_correct: 0,
          average_marks: 0
        },
        coding: {
          average_attempted: 0,
          average_executed: 0,
          average_test_case_pass_rate: 0,
          average_marks: 0
        }
      },
      student_results: []
    };

    let totalScore = 0;
    let totalPercentage = 0;
    let mcqTotalAttempted = 0;
    let mcqTotalCorrect = 0;
    let mcqTotalMarks = 0;
    let codingTotalAttempted = 0;
    let codingTotalExecuted = 0;
    let codingTotalPassedTests = 0;
    let codingTotalTests = 0;
    let codingTotalMarks = 0;

    attempts.forEach(attempt => {
      const passed = attempt.percentage >= 40;
      if (passed) {
        analytics.passed_students++;
      } else {
        analytics.failed_students++;
      }

      totalScore += attempt.score || 0;
      totalPercentage += attempt.percentage || 0;

      const sectionResults = attempt.section_results || {};
      
      // MCQ analytics
      if (sectionResults.mcq) {
        mcqTotalAttempted += sectionResults.mcq.attempted || 0;
        mcqTotalCorrect += sectionResults.mcq.correct || 0;
        mcqTotalMarks += sectionResults.mcq.marks_obtained || 0;
      }

      // Coding analytics
      if (sectionResults.coding) {
        codingTotalAttempted += sectionResults.coding.attempted || 0;
        codingTotalExecuted += sectionResults.coding.executed || 0;
        codingTotalPassedTests += sectionResults.coding.passed_test_cases || 0;
        codingTotalTests += sectionResults.coding.total_test_cases || 0;
        codingTotalMarks += sectionResults.coding.marks_obtained || 0;
      }

      // Add to student results
      analytics.student_results.push({
        student: attempt.student_id,
        attempt_number: attempt.attempt_number,
        score: attempt.score,
        total_marks: attempt.total_marks,
        percentage: attempt.percentage,
        status: passed ? 'PASS' : 'FAIL',
        section_results: sectionResults
      });
    });

    // Calculate averages
    const studentCount = attempts.length;
    analytics.average_score = studentCount > 0 ? totalScore / studentCount : 0;
    analytics.average_percentage = studentCount > 0 ? totalPercentage / studentCount : 0;
    
    analytics.section_analytics.mcq.average_attempted = studentCount > 0 ? mcqTotalAttempted / studentCount : 0;
    analytics.section_analytics.mcq.average_correct = studentCount > 0 ? mcqTotalCorrect / studentCount : 0;
    analytics.section_analytics.mcq.average_marks = studentCount > 0 ? mcqTotalMarks / studentCount : 0;
    
    analytics.section_analytics.coding.average_attempted = studentCount > 0 ? codingTotalAttempted / studentCount : 0;
    analytics.section_analytics.coding.average_executed = studentCount > 0 ? codingTotalExecuted / studentCount : 0;
    analytics.section_analytics.coding.average_test_case_pass_rate = codingTotalTests > 0 ? (codingTotalPassedTests / codingTotalTests) * 100 : 0;
    analytics.section_analytics.coding.average_marks = studentCount > 0 ? codingTotalMarks / studentCount : 0;

    return analytics;
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    throw error;
  }
};

module.exports = {
  calculateAttemptResults,
  getStudentResults,
  getDashboardAnalytics,
  checkMCQAnswer,
  calculateCodingChallengeMarks
};
