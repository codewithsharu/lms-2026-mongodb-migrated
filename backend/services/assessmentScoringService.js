const normalizeQuestionList = (templateData) => {
  const list = Array.isArray(templateData?.questions) ? templateData.questions : [];
  return list.map(item => {
    const type = item?.type === 'blank' ? 'blank' : 'mcq';
    const question = String(item?.question || '').trim();
    if (!question) return null;
    if (type === 'blank') {
      const blankAnswer = String(item?.blankAnswer ?? item?.blank_answer ?? item?.answer ?? '').trim();
      if (!blankAnswer) return null;
      return { type: 'blank', question, options: ['','','',''], blankAnswer, marks: normalizePositiveMarks(item?.marks ?? item?.score ?? item?.points, 1) };
    }
    const options = Array.isArray(item?.options) ? item.options.map(o => String(o || '').trim()) : [];
    if (options.length !== 4 || options.some(o => !o)) return null;
    const rawCorrectOptions = Array.isArray(item?.correctOptions) ? item.correctOptions : (Number.isInteger(item?.correctOption) ? [item.correctOption] : []);
    const correctOptions = [...new Set(rawCorrectOptions.filter(v => Number.isInteger(v) && v >= 0 && v <= 3))];
    if (!correctOptions.length) return null;
    return { type: 'mcq', question, options, answerMode: item?.answerMode === 'multiple' || correctOptions.length > 1 ? 'multiple' : 'single', correctOptions, marks: normalizePositiveMarks(item?.marks ?? item?.score ?? item?.points, 1) };
  }).filter(Boolean);
};

const normalizePositiveMarks = (v, f = 1) => {
  const p = Number(v);
  return Number.isFinite(p) && p > 0 ? p : f;
};

const safeNumber = (v, f) => {
  const p = Number(v);
  return Number.isFinite(p) ? p : f;
};

const roundToTwo = (v) => Number(safeNumber(v, 0).toFixed(2));

const normalizeSubmittedAnswer = (q, raw) => {
  if (q.type === 'blank') return String(raw || '').trim();
  if (q.answerMode === 'multiple') {
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v <= 3))].sort((a, b) => a - b);
  }
  const s = Number(raw);
  return Number.isInteger(s) && s >= 0 && s <= 3 ? s : null;
};

const isAnswerCorrect = (q, a) => {
  if (q.type === 'blank') return String(a || '').toLowerCase() === String(q.blankAnswer || '').trim().toLowerCase();
  if (q.answerMode === 'multiple') {
    if (!Array.isArray(a)) return false;
    if (a.length !== q.correctOptions.length) return false;
    return a.every((v, i) => v === q.correctOptions[i]);
  }
  return Number(a) === Number(q.correctOptions[0]);
};

const sumScoreList = (s = []) => roundToTwo(s.reduce((sum, sc) => sum + safeNumber(sc, 0), 0));

class AssessmentScoringService {
  /**
   * Calculate comprehensive MCQ attempt summary
   */
  calculateAttemptSummary(questions, rawAnswers, configuredTotalMarks) {
    const answers = rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {};
    const totalQuestions = questions.length;
    const configuredMarks = safeNumber(configuredTotalMarks, 0);
    let correctCount = 0, score = 0, questionMarksTotal = 0;
    const normalizedAnswers = {};
    
    questions.forEach((q, i) => {
      const key = String(i);
      const normalized = normalizeSubmittedAnswer(q, answers[key]);
      const qm = normalizePositiveMarks(q?.marks, 1);
      questionMarksTotal += qm;
      normalizedAnswers[key] = normalized;
      if (isAnswerCorrect(q, normalized)) { 
        correctCount++; 
        score += qm; 
      }
    });
    
    const totalMarks = questionMarksTotal > 0 ? questionMarksTotal : (configuredMarks > 0 ? configuredMarks : totalQuestions);
    score = roundToTwo(score);
    
    return { 
      normalizedAnswers, 
      correctCount, 
      totalQuestions, 
      totalMarks: roundToTwo(totalMarks), 
      score, 
      percentage: totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0, 
      configuredTotalMarks: roundToTwo(configuredMarks > 0 ? configuredMarks : totalMarks) 
    };
  }

  /**
   * Calculate comprehensive coding section summary
   */
  async calculateCodingSummary({ codingSection, rawAnswers }) {
    const ncs = codingSection;
    if (!ncs || !ncs.enabled) return { score: 0, totalMarks: 0, passedQuestionCount: 0, totalQuestionCount: 0, challengeBreakdown: {} };
    
    const submissions = this.getCodingSubmissionMap(rawAnswers);
    const entries = ncs.challenge_ids.map((cid) => {
      const sub = submissions[cid] && typeof submissions[cid] === 'object' ? submissions[cid] : {};
      return [cid, this.calculateCodingChallengeSummary(sub)];
    });
    
    const bd = Object.fromEntries(entries);
    
    return { 
      score: roundToTwo(entries.reduce((s, [, v]) => s + safeNumber(v?.score, 0), 0)), 
      totalMarks: roundToTwo(entries.reduce((s, [, v]) => s + safeNumber(v?.totalPossibleScore, 0), 0)), 
      passedQuestionCount: entries.reduce((s, [, v]) => s + safeInt(v?.passedQuestionCount, 0), 0), 
      totalQuestionCount: entries.reduce((s, [, v]) => s + safeInt(v?.totalQuestionCount, 0), 0), 
      attemptedQuestionCount: entries.reduce((s, [, v]) => s + safeInt(v?.attemptedQuestionCount, 0), 0),
      challengeBreakdown: bd 
    };
  }

  /**
   * Calculate coding challenge summary with detailed test case tracking
   */
  calculateCodingChallengeSummary(submission) {
    const ss = submission && typeof submission === 'object' && !Array.isArray(submission) ? submission : {};
    const questionScores = this.normalizeQuestionScores(ss.questionScores);
    const testResults = ss.testResults || [];
    const passedTestCount = testResults.filter(t => t.passed === true).length;
    const totalTestCount = testResults.length;
    
    // Enhanced test case tracking
    const testCaseDetails = testResults.map((test, index) => ({
      testCaseId: test.testCaseId || `test_${index + 1}`,
      passed: test.passed === true,
      executionTime: test.executionTime || 0,
      memoryUsage: test.memoryUsage || 0,
      error: test.error || null,
      input: test.input || '',
      expectedOutput: test.expectedOutput || '',
      actualOutput: test.actualOutput || ''
    }));
    
    return {
      questionScores,
      testResults,
      testCaseDetails,
      passedTestCount,
      totalTestCount,
      totalPossibleScore: sumScoreList(questionScores),
      passedQuestionCount: questionScores.filter((score, idx) => {
        const testResult = testResults[idx];
        return testResult && testResult.passed === true;
      }).length,
      totalQuestionCount: questionScores.length,
      attemptedQuestionCount: this.getCodingSubmissionAttemptedCount(submission),
      executionTime: ss.executionTime || 0,
      memoryUsage: ss.memoryUsage || 0,
      lastSubmissionTime: ss.lastSubmissionTime || null
    };
  }

  /**
   * Get coding submission map from answers
   */
  getCodingSubmissionMap(answers) {
    if (!answers || typeof answers !== 'object') return {};
    const CODING_SUBMISSIONS_META_KEY = '__codingSubmissions';
    const s = answers[CODING_SUBMISSIONS_META_KEY];
    if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
    return Object.entries(s).reduce((acc, [k, v]) => {
      const nk = String(k || '').trim();
      if (nk && v && typeof v === 'object' && !Array.isArray(v)) acc[nk] = v;
      return acc;
    }, {});
  }

  /**
   * Normalize question scores from submission
   */
  normalizeQuestionScores(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => Number(entry))
      .map((entry) => (Number.isFinite(entry) && entry > 0 ? Number(entry.toFixed(2)) : 1));
  }

  /**
   * Get coding submission attempted count
   */
  getCodingSubmissionAttemptedCount(submission) {
    if (!submission || typeof submission !== 'object') return 0;
    if (Array.isArray(submission.attemptedQuestionIndexes)) {
      return this.normalizeAttemptedQuestionIndexes(submission.attemptedQuestionIndexes).length;
    }
    const explicitCount = this.toNonNegativeInteger(submission.attemptedQuestionCount, -1);
    if (explicitCount >= 0) return explicitCount;
    return submission.attempted ? 1 : 0;
  }

  /**
   * Normalize attempted question indexes
   */
  normalizeAttemptedQuestionIndexes(value) {
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value
          .map((entry) => this.toNonNegativeInteger(entry, -1))
          .filter((entry) => entry >= 0)
      )
    ).sort((left, right) => left - right);
  }

  /**
   * Convert to non-negative integer
   */
  toNonNegativeInteger(value, fallback = 0) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  /**
   * Safe integer conversion
   */
  safeInt(v, f) {
    const p = Number.parseInt(v, 10);
    return Number.isNaN(p) ? f : p;
  }

  /**
   * Calculate comprehensive section-wise results
   */
  async calculateSectionResults(questions, rawAnswers, codingSection, configuredTotalMarks) {
    const mcqSummary = this.calculateAttemptSummary(questions, rawAnswers, configuredTotalMarks);
    const codingSummary = await this.calculateCodingSummary({
      codingSection,
      rawAnswers
    });

    return {
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
        challenges: Object.entries(codingSummary.challengeBreakdown || {}).map(([challengeId, details]) => ({
          challenge_id: challengeId,
          attempted: details.totalQuestionCount > 0,
          executed: details.passedQuestionCount > 0,
          total_test_cases: details.totalQuestionCount,
          passed_test_cases: details.passedQuestionCount,
          marks_obtained: details.score,
          execution_time: details.executionTime || 0,
          last_submission: details.lastSubmissionTime || null,
        }))
      }
    };
  }

  /**
   * Calculate performance analytics for a student
   */
  calculatePerformanceAnalytics(scoreHistory) {
    if (!scoreHistory || scoreHistory.length < 2) {
      return {
        average_improvement: 0,
        best_improvement: 0,
        consistency_score: 100,
        learning_curve: [],
        trend: 'insufficient_data'
      };
    }

    const improvements = scoreHistory.slice(1).map((entry, index) => 
      entry.score - scoreHistory[index].score
    );

    const averageImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const bestImprovement = Math.max(...improvements);
    
    // Calculate consistency score
    const scores = scoreHistory.map(h => h.percentage);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 2));

    // Determine trend
    const recentScores = scores.slice(-3);
    const olderScores = scores.slice(0, Math.max(0, scores.length - 3));
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : recentAvg;
    
    let trend = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'improving';
    else if (recentAvg < olderAvg - 5) trend = 'declining';

    return {
      average_improvement: roundToTwo(averageImprovement),
      best_improvement: roundToTwo(bestImprovement),
      consistency_score: roundToTwo(consistencyScore),
      learning_curve: scoreHistory.map(entry => ({
        attempt_number: entry.attempt_number,
        score: entry.score,
        percentage: entry.percentage,
        timestamp: entry.achieved_at,
      })),
      trend
    };
  }

  /**
   * Generate achievement badges based on performance
   */
  generateAchievements(scoreHistory, currentScore, totalAttempts) {
    const achievements = [];

    // First attempt achievement
    if (totalAttempts === 1) {
      achievements.push({
        badge_type: 'first_attempt',
        badge_name: 'First Step',
        description: 'Completed your first attempt',
        badge_level: 'bronze'
      });
    }

    // Perfect score achievement
    if (currentScore.percentage === 100) {
      achievements.push({
        badge_type: 'perfect_score',
        badge_name: 'Perfect Score',
        description: 'Achieved 100% score',
        badge_level: 'platinum'
      });
    }

    // Improvement achievement
    if (scoreHistory.length > 1) {
      const previousScore = scoreHistory[scoreHistory.length - 2].score;
      const improvement = currentScore.score - previousScore;
      
      if (improvement > 0) {
        let level = 'bronze';
        if (improvement > 20) level = 'silver';
        if (improvement > 50) level = 'gold';
        
        achievements.push({
          badge_type: 'improvement',
          badge_name: 'Improvement',
          description: `Improved score by ${improvement} points`,
          badge_level: level
        });
      }
    }

    // Consistency achievement
    if (scoreHistory.length >= 3) {
      const analytics = this.calculatePerformanceAnalytics(scoreHistory);
      if (analytics.consistency_score >= 90) {
        achievements.push({
          badge_type: 'consistency',
          badge_name: 'Consistent Performer',
          description: 'Maintained consistent performance',
          badge_level: 'silver'
        });
      }
    }

    // Speed achievement (if time data available)
    if (currentScore.time_taken_minutes && currentScore.time_taken_minutes < 30) {
      achievements.push({
        badge_type: 'speed',
        badge_name: 'Speed Demon',
        description: 'Completed assessment in record time',
        badge_level: 'gold'
      });
    }

    return achievements;
  }
}

module.exports = new AssessmentScoringService();
