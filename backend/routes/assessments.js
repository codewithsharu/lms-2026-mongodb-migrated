const express = require('express');
const AssessmentTemplate = require('../models/AssessmentTemplate');
const HostedAssessment = require('../models/HostedAssessment');
const HostedAssessmentStudentTarget = require('../models/HostedAssessmentStudentTarget');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const StudentDetail = require('../models/StudentDetail');
const TeacherAssignment = require('../models/TeacherAssignment');
const User = require('../models/User');
const { verifyToken, hasRole, isAdmin } = require('../middleware/auth');

const router = express.Router();
const getApiErrorMessage = (error, fallback) => (process.env.NODE_ENV === 'production' ? fallback : (error?.message || fallback));
const HOSTED_EXAM_ALLOWED_RESULT_MODES = ['after_end', 'immediate', 'manual'];
const HOSTED_EXAM_ALLOWED_PUBLISH_STATUSES = ['draft', 'published', 'closed'];
const EXAM_SESSION_HEADER = 'x-exam-session-token';
const EXAM_SESSION_META_KEY = '__sessionMeta';
const ATTEMPT_SECTION_META_KEY = '__sectionMeta';
const CODING_SUBMISSIONS_META_KEY = '__codingSubmissions';
const ONECOMPILER_API_BASE = 'https://api.onecompiler.com';
const ONECOMPILER_TIMEOUT_MS = Number.parseInt(process.env.ONECOMPILER_TIMEOUT_MS || '25000', 10);

const getOneCompilerApiKey = () => {
  const candidates = [process.env.ONECOMPILER_API_KEY, process.env.ONE_COMPILER_API_KEY, process.env.ONECOMPILER_ACCESS_TOKEN, process.env.ONECOMPILER_KEY];
  for (const c of candidates) { if (typeof c === 'string' && c.trim()) return c.trim(); }
  return '';
};
const readJsonOrText = async (response) => { const text = await response.text(); if (!text) return null; try { return JSON.parse(text); } catch { return text; } };
const callOneCompiler = async ({ url, method = 'GET', headers = {}, body }) => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), Number.isFinite(ONECOMPILER_TIMEOUT_MS) ? ONECOMPILER_TIMEOUT_MS : 25000);
  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    return { ok: response.ok, status: response.status, payload: await readJsonOrText(response) };
  } finally { clearTimeout(timeoutHandle); }
};
const safeInt = (v, f) => { const p = Number.parseInt(v, 10); return Number.isNaN(p) ? f : p; };
const safeNumber = (v, f) => { const p = Number(v); return Number.isFinite(p) ? p : f; };
const roundToTwo = (v) => Number(safeNumber(v, 0).toFixed(2));
const normalizePositiveMarks = (v, f = 1) => { const p = safeNumber(v, f); return Number((Number.isFinite(p) && p > 0 ? p : f).toFixed(2)); };
const parseBooleanInput = (v, f = false) => { if (v === undefined || v === null) return f; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v === 1; if (typeof v === 'string') { const n = v.trim().toLowerCase(); if (n === 'true' || n === '1') return true; if (n === 'false' || n === '0') return false; } return f; };
const normalizeIndexList = (r) => { if (!Array.isArray(r)) return []; return Array.from(new Set(r.map(e => safeInt(e, -1)).filter(e => Number.isFinite(e) && e >= 0))).sort((a, b) => a - b); };
const normalizeChallengeIdList = (r) => { if (!Array.isArray(r)) return []; return [...new Set(r.map(e => String(e || '').trim()).filter(Boolean))]; };
const normalizeQuestionScoreList = (r) => { if (!Array.isArray(r)) return []; return r.map(e => Number(e)).filter(e => Number.isFinite(e) && e > 0).map(e => Number(e.toFixed(2))); };
const sumScoreList = (s = []) => roundToTwo(s.reduce((sum, sc) => sum + safeNumber(sc, 0), 0));
const normalizeStudentIdList = (r) => {
  if (!Array.isArray(r)) return { normalized: [], invalid: [] };
  const sanitized = r.map(v => String(v || '').trim()).filter(Boolean);
  const isValidId = (v) => typeof v === 'string' && v.length >= 12;
  return { normalized: [...new Set(sanitized.filter(isValidId))], invalid: sanitized.filter(v => !isValidId(v)) };
};
const resolvePublishStatusByWindow = (s, e) => { if (s !== 'published') return s; if (!e || Number.isNaN(e.getTime())) return s; return e <= new Date() ? 'closed' : s; };

const normalizeCodingSection = (r) => {
  if (!r || typeof r !== 'object') return null;
  if (!parseBooleanInput(r.enabled, false)) return null;
  const ids = normalizeChallengeIdList(Array.isArray(r.challenge_ids) ? r.challenge_ids : []);
  if (!ids.length) return null;
  return { enabled: true, section_order: ['mcq', 'coding'], challenge_ids: ids, time_allocation_minutes: Math.max(0, safeInt(r.time_allocation_minutes, 0)) };
};
const validateCodingSectionInput = (r) => {
  if (r === undefined || r === null) return { normalized: null, error: null };
  if (typeof r !== 'object' || Array.isArray(r)) return { normalized: null, error: 'Invalid coding section payload' };
  if (!parseBooleanInput(r.enabled, false)) return { normalized: null, error: null };
  if (!Array.isArray(r.challenge_ids)) return { normalized: null, error: 'Coding challenges must be an array' };
  const ids = normalizeChallengeIdList(r.challenge_ids);
  if (!ids.length) return { normalized: null, error: 'Select at least one coding challenge' };
  let t = 0;
  if (r.time_allocation_minutes !== undefined && r.time_allocation_minutes !== null && String(r.time_allocation_minutes).trim() !== '') {
    const p = Number(r.time_allocation_minutes);
    if (!Number.isFinite(p) || p < 0) return { normalized: null, error: 'Coding time must be non-negative' };
    t = Math.floor(p);
  }
  return { normalized: { enabled: true, section_order: ['mcq', 'coding'], challenge_ids: ids, time_allocation_minutes: t }, error: null };
};

const getAttemptSectionState = (answers) => {
  if (!answers || typeof answers !== 'object') return { currentSection: 'mcq', mcqCompletedAt: null, codingEnteredAt: null };
  const m = answers[ATTEMPT_SECTION_META_KEY];
  if (!m || typeof m !== 'object') return { currentSection: 'mcq', mcqCompletedAt: null, codingEnteredAt: null };
  return { currentSection: m.currentSection === 'coding' ? 'coding' : 'mcq', mcqCompletedAt: m.mcqCompletedAt || null, codingEnteredAt: m.codingEnteredAt || null };
};
const applyAttemptSectionState = (answers, updates = {}) => {
  const c = getAttemptSectionState(answers);
  return { ...(answers && typeof answers === 'object' ? answers : {}), [ATTEMPT_SECTION_META_KEY]: { currentSection: updates.currentSection || c.currentSection, mcqCompletedAt: updates.mcqCompletedAt || c.mcqCompletedAt, codingEnteredAt: updates.codingEnteredAt || c.codingEnteredAt } };
};
const sanitizeCodingSectionForStudent = (cs, ss) => { const n = normalizeCodingSection(cs); if (!n) return null; const u = Boolean(ss?.mcqCompletedAt) || ss?.currentSection === 'coding'; return { ...n, unlocked: u, mcq_completed_at: ss?.mcqCompletedAt || null, coding_entered_at: ss?.codingEnteredAt || null }; };
const normalizeSessionTokenValue = (v) => { if (Array.isArray(v)) return v.find(e => typeof e === 'string' && e.trim()) || ''; return typeof v === 'string' ? v.trim() : ''; };
const getExamSessionToken = (req) => { const b = normalizeSessionTokenValue(req.body?.sessionToken); const q = normalizeSessionTokenValue(req.query?.sessionToken); const h = normalizeSessionTokenValue(req.get(EXAM_SESSION_HEADER)); return b || q || h || null; };
const getAttemptSessionMeta = (answers) => { if (!answers || typeof answers !== 'object') return { token: null, updatedAt: null }; const m = answers[EXAM_SESSION_META_KEY]; if (!m || typeof m !== 'object') return { token: null, updatedAt: null }; return { token: m.token || null, updatedAt: m.updatedAt || null }; };
const applyAttemptSessionMeta = (answers, sessionToken) => ({ ...(answers && typeof answers === 'object' ? answers : {}), [EXAM_SESSION_META_KEY]: { token: sessionToken, updatedAt: new Date().toISOString() } });
const buildSessionConflictResponse = (message, attemptId) => ({ error: message, sessionConflict: true, attemptId });

const normalizeQuestionList = (templateData) => {
  const list = templateData?.questions;
  if (!Array.isArray(list)) return [];
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
const sanitizeQuestionsForStudent = (questions) => questions.map((q, i) => ({ index: i, type: q.type, question: q.question, answerMode: q.answerMode || 'single', options: q.type === 'mcq' ? q.options : [] }));
const isWithinAttemptWindow = (exam) => { const now = new Date(); const s = exam.start_time ? new Date(exam.start_time) : null; const e = exam.end_time ? new Date(exam.end_time) : null; if (s && Number.isNaN(s.getTime())) return { allowed: false, reason: 'Invalid start time' }; if (e && Number.isNaN(e.getTime())) return { allowed: false, reason: 'Invalid end time' }; if (s && now < s) return { allowed: false, reason: 'Assessment has not started yet' }; if (e && now > e) return { allowed: false, reason: 'Assessment window has ended' }; return { allowed: true }; };
const isExamAssignedToStudent = (exam, sd, studentId, targetedIds = []) => { if (!exam || !sd) return false; const ts = new Set((targetedIds || []).filter(Boolean)); if (ts.size > 0) return ts.has(studentId); if (exam.class_id && exam.class_id.toString() !== sd.class_id?.toString()) return false; const sm = !exam.section_id || exam.section_id.toString() === sd.section_id?.toString(); const zm = !exam.zone || exam.zone === sd.zone; return sm && zm; };
const getRemainingSeconds = (attempt, exam) => { const s = attempt?.started_at ? new Date(attempt.started_at) : null; const d = safeInt(exam?.duration_minutes, 0); if (!s || Number.isNaN(s.getTime()) || d <= 0) return 0; const elapsed = Math.floor((Date.now() - s.getTime()) / 1000); return Math.max(0, d * 60 - Math.max(0, elapsed)); };
const normalizeSubmittedAnswer = (q, raw) => { if (q.type === 'blank') return String(raw || '').trim(); if (q.answerMode === 'multiple') { if (!Array.isArray(raw)) return []; return [...new Set(raw.map(v => Number(v)).filter(v => Number.isInteger(v) && v >= 0 && v <= 3))].sort((a, b) => a - b); } const s = Number(raw); return Number.isInteger(s) && s >= 0 && s <= 3 ? s : null; };
const isAnswerCorrect = (q, a) => { if (q.type === 'blank') return String(a || '').toLowerCase() === String(q.blankAnswer || '').trim().toLowerCase(); if (q.answerMode === 'multiple') { if (!Array.isArray(a)) return false; if (a.length !== q.correctOptions.length) return false; return a.every((v, i) => v === q.correctOptions[i]); } return Number(a) === Number(q.correctOptions[0]); };
const getCodingSubmissionMap = (answers) => { if (!answers || typeof answers !== 'object') return {}; const s = answers[CODING_SUBMISSIONS_META_KEY]; if (!s || typeof s !== 'object' || Array.isArray(s)) return {}; return Object.entries(s).reduce((acc, [k, v]) => { const nk = String(k || '').trim(); if (nk && v && typeof v === 'object' && !Array.isArray(v)) acc[nk] = v; return acc; }, {}); };
const normalizeChallengeProblemList = (p) => { if (!p || typeof p !== 'object') return []; if (Array.isArray(p.problems)) return p.problems; if (Array.isArray(p.challenge?.problems)) return p.challenge.problems; return []; };
const extractChallengeScoreProfile = (p) => { const problems = normalizeChallengeProblemList(p); const qs = problems.map(pr => normalizePositiveMarks(pr?.properties?.score ?? pr?.score ?? pr?.points, 1)); return { questionScores: qs, totalPossibleScore: sumScoreList(qs), questionCount: qs.length }; };
const fetchChallengeScoreProfile = async (challengeId, apiKey) => { if (!challengeId || !apiKey) return null; try { const u = await callOneCompiler({ url: `${ONECOMPILER_API_BASE}/v1/challenges/${encodeURIComponent(challengeId)}?access_token=${encodeURIComponent(apiKey)}` }); if (!u.ok) return null; return extractChallengeScoreProfile(u.payload); } catch { return null; } };

const calculateCodingChallengeSummary = (submission, fallbackProfile) => {
  const ss = submission && typeof submission === 'object' && !Array.isArray(submission) ? submission : {};
  const fScores = normalizeQuestionScoreList(fallbackProfile?.questionScores);
  const sScores = normalizeQuestionScoreList(ss.questionScores);
  const rqs = sScores.length > 0 ? sScores : fScores;
  const sTPS = safeNumber(ss.totalPossibleScore, 0); const fTPS = safeNumber(fallbackProfile?.totalPossibleScore, 0);
  let tps = sTPS > 0 ? roundToTwo(sTPS) : (fTPS > 0 ? roundToTwo(fTPS) : (rqs.length > 0 ? sumScoreList(rqs) : 0));
  let pqi = normalizeIndexList(ss.passedQuestionIndexes);
  const allPassed = parseBooleanInput(ss.allTestCasesPassed, false);
  if (allPassed && rqs.length > 0) pqi = Array.from({ length: rqs.length }, (_, i) => i);
  const hPC = Math.max(pqi.length, safeInt(ss.passedQuestionCount, 0));
  if (!pqi.length && hPC > 0 && rqs.length > 0) pqi = Array.from({ length: Math.min(hPC, rqs.length) }, (_, i) => i);
  if (rqs.length > 0) pqi = pqi.filter(i => i < rqs.length);
  const tqc = Math.max(rqs.length, safeInt(ss.totalQuestionCount, 0));
  let pqc = Math.max(pqi.length, hPC); if (allPassed && tqc > 0) pqc = tqc; if (tqc > 0) pqc = Math.min(tqc, pqc);
  const atp = tqc > 0 ? (allPassed || pqc >= tqc) : allPassed;
  let score = 0;
  if (rqs.length > 0 && pqi.length > 0) score = roundToTwo(pqi.reduce((sum, i) => sum + safeNumber(rqs[i], 0), 0));
  else if (atp && tps > 0) score = tps;
  if (tps <= 0 && rqs.length > 0) tps = sumScoreList(rqs); if (tps <= 0 && score > 0) tps = score; if (tps > 0) score = Math.min(score, tps);
  return { score: roundToTwo(score), totalPossibleScore: roundToTwo(tps), passedQuestionCount: pqc, totalQuestionCount: tqc, allTestCasesPassed: atp, questionScores: rqs };
};

const calculateCodingSummary = async ({ codingSection, rawAnswers }) => {
  const ncs = normalizeCodingSection(codingSection);
  if (!ncs) return { score: 0, totalMarks: 0, passedQuestionCount: 0, totalQuestionCount: 0, challengeBreakdown: {} };
  const submissions = getCodingSubmissionMap(rawAnswers);
  const apiKey = getOneCompilerApiKey();
  const entries = await Promise.all(ncs.challenge_ids.map(async (cid) => {
    const sub = submissions[cid] && typeof submissions[cid] === 'object' ? submissions[cid] : {};
    const shouldFetch = normalizeQuestionScoreList(sub.questionScores).length === 0;
    const fb = shouldFetch ? await fetchChallengeScoreProfile(cid, apiKey) : null;
    return [cid, calculateCodingChallengeSummary(sub, fb)];
  }));
  const bd = Object.fromEntries(entries);
  return { score: roundToTwo(entries.reduce((s, [, v]) => s + safeNumber(v?.score, 0), 0)), totalMarks: roundToTwo(entries.reduce((s, [, v]) => s + safeNumber(v?.totalPossibleScore, 0), 0)), passedQuestionCount: entries.reduce((s, [, v]) => s + safeInt(v?.passedQuestionCount, 0), 0), totalQuestionCount: entries.reduce((s, [, v]) => s + safeInt(v?.totalQuestionCount, 0), 0), challengeBreakdown: bd };
};

const calculateAttemptSummary = (questions, rawAnswers, configuredTotalMarks) => {
  const answers = rawAnswers && typeof rawAnswers === 'object' ? rawAnswers : {};
  const totalQuestions = questions.length;
  const configuredMarks = safeNumber(configuredTotalMarks, 0);
  let correctCount = 0, score = 0, questionMarksTotal = 0;
  const normalizedAnswers = {};
  questions.forEach((q, i) => {
    const key = String(i); const normalized = normalizeSubmittedAnswer(q, answers[key]);
    const qm = normalizePositiveMarks(q?.marks, 1); questionMarksTotal += qm; normalizedAnswers[key] = normalized;
    if (isAnswerCorrect(q, normalized)) { correctCount++; score += qm; }
  });
  const totalMarks = questionMarksTotal > 0 ? questionMarksTotal : (configuredMarks > 0 ? configuredMarks : totalQuestions);
  score = roundToTwo(score);
  return { normalizedAnswers, correctCount, totalQuestions, totalMarks: roundToTwo(totalMarks), score, percentage: totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0, configuredTotalMarks: roundToTwo(configuredMarks > 0 ? configuredMarks : totalMarks) };
};

const doesTeacherAssignmentMatchStudent = (a, sd) => { if (!a || !sd) return false; return (!a.class_id || a.class_id.toString() === sd.class_id?.toString()) && (!a.section_id || a.section_id.toString() === sd.section_id?.toString()) && (!a.zone || a.zone === sd.zone); };
const getTeacherAllowedStudentIdSet = async (teacherId) => {
  const scopes = await TeacherAssignment.find({ teacher_id: teacherId }).select('class_id section_id zone').lean();
  if (!scopes.length) return new Set();
  const classIds = [...new Set(scopes.map(a => a.class_id?.toString()).filter(Boolean))];
  if (!classIds.length) return new Set();
  const sds = await StudentDetail.find({ class_id: { $in: classIds } }).select('user_id class_id section_id zone').lean();
  const allowed = new Set();
  sds.forEach(sd => { if (scopes.some(a => doesTeacherAssignmentMatchStudent(a, sd)) && sd.user_id) allowed.add(sd.user_id.toString()); });
  return allowed;
};

const replaceHostedExamStudentTargets = async (hostedAssessmentId, studentIds = []) => {
  await HostedAssessmentStudentTarget.deleteMany({ hosted_assessment_id: hostedAssessmentId });
  if (!studentIds.length) return [];
  const rows = studentIds.map(sid => ({ hosted_assessment_id: hostedAssessmentId, student_id: sid }));
  const inserted = await HostedAssessmentStudentTarget.insertMany(rows);
  const result = await Promise.all(inserted.map(async (t) => {
    const student = await User.findById(t.student_id).select('_id full_name email').lean();
    return { hosted_assessment_id: t.hosted_assessment_id, student_id: t.student_id, student: student ? { id: student._id, full_name: student.full_name, email: student.email } : null };
  }));
  return result;
};

const getStudentTargetMapForHostedExams = async (hostedAssessmentIds = []) => {
  const uids = [...new Set((hostedAssessmentIds || []).filter(Boolean))];
  if (!uids.length) return { map: {}, setupRequired: false };
  const data = await HostedAssessmentStudentTarget.find({ hosted_assessment_id: { $in: uids } }).lean();
  const mapped = {};
  for (const row of data) {
    if (!row.hosted_assessment_id) continue;
    const key = row.hosted_assessment_id.toString();
    if (!mapped[key]) mapped[key] = [];
    const student = await User.findById(row.student_id).select('_id full_name email').lean();
    mapped[key].push({ student_id: row.student_id?.toString(), student: student ? { id: student._id, full_name: student.full_name, email: student.email } : null });
  }
  return { map: mapped, setupRequired: false };
};

const getAttemptStatsForHostedExams = async (hostedAssessmentIds = []) => {
  const uids = [...new Set((hostedAssessmentIds || []).filter(Boolean))];
  if (!uids.length) return { map: {}, setupRequired: false };
  const data = await AssessmentAttempt.find({ hosted_assessment_id: { $in: uids } }).select('hosted_assessment_id status').lean();
  const mapped = {};
  data.forEach(row => {
    const key = row.hosted_assessment_id?.toString(); if (!key) return;
    if (!mapped[key]) mapped[key] = { started: 0, in_progress: 0, submitted: 0 };
    mapped[key].started++; if (row.status === 'submitted' || row.status === 'auto_submitted') mapped[key].submitted++; if (row.status === 'in_progress') mapped[key].in_progress++;
  });
  return { map: mapped, setupRequired: false };
};

const getStudentDetail = async (userId) => {
  const detail = await StudentDetail.findOne({ user_id: userId }).select('class_id section_id zone').lean();
  if (!detail) return { detail: null, error: new Error('Student details not found') };
  return { detail, error: null };
};

const submitAttemptWithScoring = async ({ attempt, incomingAnswers = {}, forceAutoSubmit = false }) => {
  const questions = normalizeQuestionList(attempt?.hosted?.template?.template_data || attempt?.hosted?.template_data);
  if (!questions.length) { const e = new Error('Assessment questions are not configured'); e.statusCode = 400; throw e; }
  const safeIncoming = incomingAnswers && typeof incomingAnswers === 'object' ? incomingAnswers : {};
  const remainingSeconds = getRemainingSeconds(attempt, attempt.hosted);
  const submittedStatus = (parseBooleanInput(forceAutoSubmit, false) || remainingSeconds <= 0) ? 'auto_submitted' : 'submitted';
  const mergedAnswers = { ...(attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {}), ...safeIncoming };
  const mcqSummary = calculateAttemptSummary(questions, mergedAnswers, attempt.hosted?.template?.total_marks);
  const codingSummary = await calculateCodingSummary({ codingSection: attempt.hosted?.coding_section, rawAnswers: mergedAnswers });
  const finalScore = roundToTwo(mcqSummary.score + codingSummary.score);
  const finalTotalMarks = roundToTwo(mcqSummary.totalMarks + codingSummary.totalMarks);
  const finalPercentage = finalTotalMarks > 0 ? roundToTwo((finalScore / finalTotalMarks) * 100) : 0;
  const metadataAnswers = Object.fromEntries(Object.entries(mergedAnswers).filter(([key]) => key.startsWith('__')));
  const finalAnswers = { ...mcqSummary.normalizedAnswers, ...metadataAnswers };
  const codingSection = normalizeCodingSection(attempt.hosted?.coding_section);
  if (codingSection) {
    const nowIso = new Date().toISOString(); const ss = getAttemptSectionState(finalAnswers);
    finalAnswers[ATTEMPT_SECTION_META_KEY] = { currentSection: 'coding', mcqCompletedAt: ss.mcqCompletedAt || nowIso, codingEnteredAt: ss.codingEnteredAt || nowIso };
  }
  const updatedAttempt = await AssessmentAttempt.findByIdAndUpdate(attempt._id || attempt.id, {
    status: submittedStatus, answers: finalAnswers, score: finalScore, total_marks: finalTotalMarks, percentage: finalPercentage,
    correct_count: mcqSummary.correctCount + codingSummary.passedQuestionCount, total_questions: mcqSummary.totalQuestions + codingSummary.totalQuestionCount, submitted_at: new Date()
  }, { new: true }).lean();
  const resultVisible = attempt.hosted?.result_mode === 'immediate' || (attempt.hosted?.result_mode === 'after_end' && attempt.hosted?.end_time && new Date() >= new Date(attempt.hosted.end_time));
  return { updatedAttempt: { ...updatedAttempt, id: updatedAttempt._id }, resultVisible, resultMode: attempt.hosted?.result_mode };
};
// ==================== TEACHER: TEMPLATES ====================

router.post('/templates', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { title, subject, description, question_count = 0, total_marks = 100, passing_percentage = 40, template_data = {} } = req.body;
    if (!title || !subject) return res.status(400).json({ error: 'Title and subject are required' });
    const data = await AssessmentTemplate.create({ teacher_id: req.user.id, title: String(title).trim(), subject: String(subject).trim(), description: description ? String(description).trim() : null, question_count: safeInt(question_count, 0), total_marks: safeInt(total_marks, 100), passing_percentage: safeInt(passing_percentage, 40), template_data, is_active: true });
    res.status(201).json({ message: 'Template created successfully', template: { ...data.toObject(), id: data._id } });
  } catch (error) { console.error('Create template error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to create template') }); }
});

router.get('/templates', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const data = await AssessmentTemplate.find({ teacher_id: req.user.id, is_active: true }).sort({ created_at: -1 }).lean();
    res.json({ templates: (data || []).map(t => ({ ...t, id: t._id })) });
  } catch (error) { console.error('List templates error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch templates') }); }
});

router.put('/templates/:id', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { title, subject, description, question_count, total_marks, passing_percentage, template_data } = req.body;
    const ud = {};
    if (title !== undefined) ud.title = String(title).trim();
    if (subject !== undefined) ud.subject = String(subject).trim();
    if (description !== undefined) ud.description = description ? String(description).trim() : null;
    if (question_count !== undefined) ud.question_count = safeInt(question_count, 0);
    if (total_marks !== undefined) ud.total_marks = safeInt(total_marks, 100);
    if (passing_percentage !== undefined) ud.passing_percentage = safeInt(passing_percentage, 40);
    if (template_data !== undefined) ud.template_data = template_data;
    const data = await AssessmentTemplate.findOneAndUpdate({ _id: req.params.id, teacher_id: req.user.id }, ud, { new: true }).lean();
    if (!data) return res.status(404).json({ error: 'Template not found for this teacher' });
    res.json({ message: 'Template updated successfully', template: { ...data, id: data._id } });
  } catch (error) { console.error('Update template error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to update template') }); }
});

router.delete('/templates/:id', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const data = await AssessmentTemplate.findOneAndUpdate({ _id: req.params.id, teacher_id: req.user.id }, { is_active: false }, { new: true }).lean();
    if (!data) return res.status(404).json({ error: 'Template not found for this teacher' });
    res.json({ message: 'Template deleted successfully', templateId: data._id });
  } catch (error) { console.error('Delete template error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to delete template') }); }
});

// ==================== TEACHER: HOSTED EXAMS ====================

router.post('/hosted', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { template_id, class_id, section_id, zone, allow_resume, duration_minutes, max_attempts, result_mode, publish_status, start_time, end_time, exam_title, instructions, coding_section, assigned_student_ids = [] } = req.body;
    if (!template_id || !duration_minutes || !max_attempts || !result_mode || !publish_status) return res.status(400).json({ error: 'template_id, duration, attempts, result mode and publish status are required' });
    const { normalized: normalizedStudentIds, invalid: invalidStudentIds } = normalizeStudentIdList(assigned_student_ids);
    if (invalidStudentIds.length > 0) return res.status(400).json({ error: 'One or more assigned student IDs are invalid' });
    if (normalizedStudentIds.length > 0) { const allowed = await getTeacherAllowedStudentIdSet(req.user.id); const unauth = normalizedStudentIds.filter(sid => !allowed.has(sid)); if (unauth.length > 0) return res.status(403).json({ error: 'One or more students are outside your scope' }); }
    const pd = safeInt(duration_minutes, 0), pa = safeInt(max_attempts, 0), par = parseBooleanInput(allow_resume, true);
    if (pd <= 0) return res.status(400).json({ error: 'Duration must be greater than 0 minutes' });
    if (pa <= 0) return res.status(400).json({ error: 'Max attempts must be at least 1' });
    if (!HOSTED_EXAM_ALLOWED_RESULT_MODES.includes(result_mode)) return res.status(400).json({ error: 'Invalid result mode' });
    if (!HOSTED_EXAM_ALLOWED_PUBLISH_STATUSES.includes(publish_status)) return res.status(400).json({ error: 'Invalid publish status' });
    const pst = start_time ? new Date(start_time) : null, pet = end_time ? new Date(end_time) : null;
    if (pst && Number.isNaN(pst.getTime())) return res.status(400).json({ error: 'Invalid start time' });
    if (pet && Number.isNaN(pet.getTime())) return res.status(400).json({ error: 'Invalid end time' });
    if (pst && pet && pet <= pst) return res.status(400).json({ error: 'End time must be after start time' });
    if (publish_status === 'published' && (!pst || !pet)) return res.status(400).json({ error: 'Start and end time are required to publish' });
    const { normalized: ncs, error: cse } = validateCodingSectionInput(coding_section);
    if (cse) return res.status(400).json({ error: cse });
    const fps = resolvePublishStatusByWindow(String(publish_status), pet);
    const template = await AssessmentTemplate.findOne({ _id: template_id, teacher_id: req.user.id }).select('_id teacher_id question_count template_data').lean();
    if (!template) return res.status(404).json({ error: 'Template not found for this teacher' });
    const vq = normalizeQuestionList(template.template_data);
    if (!vq.length || safeInt(template.question_count, 0) <= 0) return res.status(400).json({ error: 'Template has zero valid questions' });
    const data = await HostedAssessment.create({ template_id, host_id: req.user.id, class_id: class_id || null, section_id: section_id || null, zone: zone || null, allow_resume: par, duration_minutes: pd, max_attempts: pa, result_mode, publish_status: fps, start_time: pst, end_time: pet, coding_section: ncs, exam_title: String(exam_title || '').trim() || null, instructions: instructions ? String(instructions).trim() : null });
    const targetRows = await replaceHostedExamStudentTargets(data._id, normalizedStudentIds);
    const specificStudents = targetRows.map(i => ({ id: i.student?.id || i.student_id, full_name: i.student?.full_name || null, email: i.student?.email || null }));
    res.status(201).json({ message: publish_status === 'published' && fps === 'closed' ? 'Exam window is already over, saved as Closed' : 'Exam hosted successfully', hostedExam: { ...data.toObject(), id: data._id, specific_students: specificStudents } });
  } catch (error) { console.error('Host exam error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to host exam') }); }
});

router.get('/hosted', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const data = await HostedAssessment.find({ host_id: req.user.id }).sort({ created_at: -1 }).lean();
    const hostedExams = data || [];
    const ids = hostedExams.map(e => e._id);
    const enriched = await Promise.all(hostedExams.map(async (exam) => {
      const template = await AssessmentTemplate.findById(exam.template_id).select('_id title subject question_count total_marks').lean();
      const cls = exam.class_id ? await (require('../models/Class')).findById(exam.class_id).select('_id name').lean() : null;
      const sec = exam.section_id ? await (require('../models/Section')).findById(exam.section_id).select('_id name').lean() : null;
      const targets = await HostedAssessmentStudentTarget.find({ hosted_assessment_id: exam._id }).lean();
      const targetStudents = await Promise.all(targets.map(async t => { const u = await User.findById(t.student_id).select('_id full_name email').lean(); return { id: u?._id || t.student_id, full_name: u?.full_name || null, email: u?.email || null }; }));
      const attemptStats = await AssessmentAttempt.aggregate([{ $match: { hosted_assessment_id: exam._id } }, { $group: { _id: null, started: { $sum: 1 }, submitted: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'auto_submitted']] }, 1, 0] } }, in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } } } }]);
      const stats = attemptStats[0] || { started: 0, submitted: 0, in_progress: 0 };
      return { ...exam, id: exam._id, template: template ? { ...template, id: template._id } : null, class: cls ? { ...cls, id: cls._id } : null, section: sec ? { ...sec, id: sec._id } : null, coding_section: normalizeCodingSection(exam.coding_section), specific_students: targetStudents, attempts_started_count: stats.started, attempts_submitted_count: stats.submitted, attempts_in_progress_count: stats.in_progress, is_locked_for_coding_section_edit: stats.started > 0 };
    }));
    res.json({ hostedExams: enriched });
  } catch (error) { console.error('List hosted exams error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch hosted exams') }); }
});

router.put('/hosted/:id', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await HostedAssessment.findOne({ _id: id, host_id: req.user.id }).lean();
    if (!existing) return res.status(404).json({ error: 'Hosted exam not found for this teacher' });
    const { template_id, class_id, section_id, zone, allow_resume, duration_minutes, max_attempts, result_mode, publish_status, start_time, end_time, exam_title, instructions, coding_section, assigned_student_ids } = req.body;
    const rd = duration_minutes !== undefined ? safeInt(duration_minutes, 0) : safeInt(existing.duration_minutes, 0);
    const ra = max_attempts !== undefined ? safeInt(max_attempts, 0) : safeInt(existing.max_attempts, 0);
    const rar = allow_resume !== undefined ? parseBooleanInput(allow_resume, true) : existing.allow_resume !== false;
    const rtid = template_id !== undefined ? String(template_id || '').trim() : existing.template_id?.toString();
    const rrm = result_mode !== undefined ? String(result_mode) : existing.result_mode;
    const rps = publish_status !== undefined ? String(publish_status) : existing.publish_status;
    if (!rtid) return res.status(400).json({ error: 'template_id is required' });
    if (rd <= 0) return res.status(400).json({ error: 'Duration must be greater than 0' });
    if (ra <= 0) return res.status(400).json({ error: 'Max attempts must be at least 1' });
    if (!HOSTED_EXAM_ALLOWED_RESULT_MODES.includes(rrm)) return res.status(400).json({ error: 'Invalid result mode' });
    if (!HOSTED_EXAM_ALLOWED_PUBLISH_STATUSES.includes(rps)) return res.status(400).json({ error: 'Invalid publish status' });
    const si = start_time !== undefined ? (start_time || null) : existing.start_time;
    const ei = end_time !== undefined ? (end_time || null) : existing.end_time;
    const pst = si ? new Date(si) : null, pet = ei ? new Date(ei) : null;
    if (pst && Number.isNaN(pst.getTime())) return res.status(400).json({ error: 'Invalid start time' });
    if (pet && Number.isNaN(pet.getTime())) return res.status(400).json({ error: 'Invalid end time' });
    if (pst && pet && pet <= pst) return res.status(400).json({ error: 'End time must be after start time' });
    if (rps === 'published' && (!pst || !pet)) return res.status(400).json({ error: 'Start and end time required to publish' });
    const fps = resolvePublishStatusByWindow(rps, pet);
    const template = await AssessmentTemplate.findOne({ _id: rtid, teacher_id: req.user.id }).select('_id question_count template_data').lean();
    if (!template) return res.status(404).json({ error: 'Linked template not found' });
    const vq = normalizeQuestionList(template.template_data);
    if (!vq.length || safeInt(template.question_count, 0) <= 0) return res.status(400).json({ error: 'Template has zero valid questions' });
    const templateChanged = rtid !== existing.template_id?.toString();
    const csu = coding_section !== undefined ? validateCodingSectionInput(coding_section) : { normalized: normalizeCodingSection(existing.coding_section), error: null };
    if (csu.error) return res.status(400).json({ error: csu.error });
    const csChanged = JSON.stringify(csu.normalized || null) !== JSON.stringify(normalizeCodingSection(existing.coding_section) || null);
    if (csChanged || templateChanged) { const ac = await AssessmentAttempt.countDocuments({ hosted_assessment_id: id }); if (ac > 0) return res.status(409).json({ error: templateChanged ? 'Template cannot be changed after attempts started' : 'Coding section cannot be changed after attempts started' }); }
    let normalizedStudentIds = null;
    if (assigned_student_ids !== undefined) { const { normalized, invalid } = normalizeStudentIdList(assigned_student_ids); if (invalid.length) return res.status(400).json({ error: 'Invalid student IDs' }); if (normalized.length) { const allowed = await getTeacherAllowedStudentIdSet(req.user.id); const unauth = normalized.filter(s => !allowed.has(s)); if (unauth.length) return res.status(403).json({ error: 'Students outside your scope' }); } normalizedStudentIds = normalized; }
    const up = { template_id: rtid, class_id: class_id !== undefined ? (class_id || null) : existing.class_id, section_id: section_id !== undefined ? (section_id || null) : existing.section_id, zone: zone !== undefined ? (zone || null) : existing.zone, allow_resume: rar, duration_minutes: rd, max_attempts: ra, result_mode: rrm, publish_status: fps, start_time: pst, end_time: pet, coding_section: csu.normalized, exam_title: exam_title !== undefined ? (String(exam_title || '').trim() || null) : existing.exam_title, instructions: instructions !== undefined ? (instructions ? String(instructions).trim() : null) : existing.instructions };
    const updated = await HostedAssessment.findByIdAndUpdate(id, up, { new: true }).lean();
    let specificStudents = [];
    if (normalizedStudentIds !== null) { const tr = await replaceHostedExamStudentTargets(id, normalizedStudentIds); specificStudents = tr.map(i => ({ id: i.student?.id || i.student_id, full_name: i.student?.full_name || null, email: i.student?.email || null })); } else { const { map } = await getStudentTargetMapForHostedExams([id]); specificStudents = (map[id] || []).map(i => ({ id: i.student?.id || i.student_id, full_name: i.student?.full_name || null, email: i.student?.email || null })); }
    res.json({ message: rps === 'published' && fps === 'closed' ? 'Exam window over, saved as Closed' : 'Hosted exam updated', hostedExam: { ...updated, id: updated._id, specific_students: specificStudents } });
  } catch (error) { console.error('Update hosted exam error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to update hosted exam') }); }
});

router.post('/hosted/:id/release-results', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const exam = await HostedAssessment.findOne({ _id: req.params.id, host_id: req.user.id }).lean();
    if (!exam) return res.status(404).json({ error: 'Hosted exam not found' });
    if (exam.publish_status === 'draft') return res.status(400).json({ error: 'Publish the exam first' });
    if (exam.result_mode !== 'manual') return res.status(400).json({ error: 'Results already released' });
    const updated = await HostedAssessment.findByIdAndUpdate(req.params.id, { result_mode: 'immediate' }, { new: true }).lean();
    res.json({ message: 'Results released. Submissions now visible immediately.', hostedExam: { ...updated, id: updated._id } });
  } catch (error) { console.error('Release results error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to release results') }); }
});

router.delete('/hosted/:id', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await HostedAssessment.findOne({ _id: id, host_id: req.user.id }).lean();
    if (!exam) return res.status(404).json({ error: 'Hosted exam not found' });
    const deletedAttempts = await AssessmentAttempt.deleteMany({ hosted_assessment_id: id });
    const deletedTargets = await HostedAssessmentStudentTarget.deleteMany({ hosted_assessment_id: id });
    await HostedAssessment.findByIdAndDelete(id);
    res.json({ message: 'Scheduled exam deleted successfully', hostedExamId: id, unassignedStudentCount: deletedTargets.deletedCount || 0, deletedAttemptCount: deletedAttempts.deletedCount || 0 });
  } catch (error) { console.error('Delete hosted exam error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to delete hosted exam') }); }
});
// ==================== METRICS ====================

router.get('/metrics/teacher', verifyToken, hasRole('teacher'), async (req, res) => {
  try {
    const [templateCount, hostedCount, publishedCount] = await Promise.all([
      AssessmentTemplate.countDocuments({ teacher_id: req.user.id, is_active: true }),
      HostedAssessment.countDocuments({ host_id: req.user.id }),
      HostedAssessment.countDocuments({ host_id: req.user.id, publish_status: 'published' })
    ]);
    res.json({ templates: templateCount, hosted: hostedCount, published: publishedCount });
  } catch (error) { console.error('Teacher metrics error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch metrics') }); }
});

router.get('/metrics/admin', verifyToken, isAdmin, async (req, res) => {
  try {
    const [templateCount, hostedCount, publishedCount] = await Promise.all([
      AssessmentTemplate.countDocuments({ is_active: true }),
      HostedAssessment.countDocuments({}),
      HostedAssessment.countDocuments({ publish_status: 'published' })
    ]);
    res.json({ templates: templateCount, hosted: hostedCount, published: publishedCount });
  } catch (error) { console.error('Admin metrics error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch metrics') }); }
});

// ==================== STUDENT ROUTES ====================

router.get('/student/available', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { detail: sd, error: se } = await getStudentDetail(req.user.id);
    if (se || !sd) return res.status(404).json({ error: 'Student details not found' });
    const hostedExams = await HostedAssessment.find({ publish_status: { $in: ['published', 'closed'] } }).sort({ created_at: -1 }).lean();
    const { map: targetMap } = await getStudentTargetMapForHostedExams(hostedExams.map(e => e._id));
    const filtered = hostedExams.filter(exam => {
      const tids = (targetMap[exam._id.toString()] || []).map(i => i.student_id);
      return isExamAssignedToStudent(exam, sd, req.user.id, tids);
    });
    const hostedIds = filtered.map(e => e._id);
    let attemptsByHosted = {};
    if (hostedIds.length > 0) {
      const attempts = await AssessmentAttempt.find({ student_id: req.user.id, hosted_assessment_id: { $in: hostedIds } }).sort({ created_at: -1 }).select('_id hosted_assessment_id status attempt_number score percentage submitted_at').lean();
      attemptsByHosted = attempts.reduce((acc, a) => { const k = a.hosted_assessment_id?.toString(); if (!acc[k]) acc[k] = []; acc[k].push({ ...a, id: a._id }); return acc; }, {});
    }
    const enriched = await Promise.all(filtered.map(async (exam) => {
      const template = await AssessmentTemplate.findById(exam.template_id).select('_id title subject question_count total_marks passing_percentage').lean();
      const attempts = attemptsByHosted[exam._id.toString()] || [];
      const inProgress = attempts.find(a => a.status === 'in_progress') || null;
      const attemptsUsed = attempts.length;
      const maxAttempts = safeInt(exam.max_attempts, 1);
      return { ...exam, id: exam._id, template: template ? { ...template, id: template._id } : null, title: exam.exam_title || template?.title || 'Assessment', subject: template?.subject || 'N/A', coding_section: normalizeCodingSection(exam.coding_section), attemptsUsed, remainingAttempts: Math.max(0, maxAttempts - attemptsUsed), hasInProgressAttempt: Boolean(inProgress), inProgressAttemptId: inProgress?.id || null, latestSubmittedAttempt: attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted')[0] || null, canResume: inProgress ? exam.allow_resume !== false : false, canAttempt: inProgress ? (exam.allow_resume !== false) : attemptsUsed < maxAttempts };
    }));
    res.json({ exams: enriched });
  } catch (error) { console.error('Student available exams error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch exams') }); }
});

router.post('/student/hosted/:hostedAssessmentId/start', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { hostedAssessmentId } = req.params;
    const { detail: sd, error: se } = await getStudentDetail(req.user.id);
    if (se || !sd) return res.status(404).json({ error: 'Student details not found' });
    const hostedExam = await HostedAssessment.findById(hostedAssessmentId).lean();
    if (!hostedExam) return res.status(404).json({ error: 'Hosted assessment not found' });
    if (hostedExam.publish_status !== 'published') return res.status(400).json({ error: 'Assessment is not published' });
    const template = await AssessmentTemplate.findById(hostedExam.template_id).select('_id title subject total_marks passing_percentage template_data').lean();
    hostedExam.template = template;
    const { map: tm } = await getStudentTargetMapForHostedExams([hostedAssessmentId]);
    const tids = (tm[hostedAssessmentId] || []).map(i => i.student_id);
    if (!isExamAssignedToStudent(hostedExam, sd, req.user.id, tids)) return res.status(403).json({ error: 'Not assigned to your scope' });
    const ws = isWithinAttemptWindow(hostedExam); if (!ws.allowed) return res.status(400).json({ error: ws.reason });
    const questions = normalizeQuestionList(template?.template_data);
    if (!questions.length) return res.status(400).json({ error: 'Questions not configured' });
    let activeAttempt = await AssessmentAttempt.findOne({ hosted_assessment_id: hostedAssessmentId, student_id: req.user.id, status: 'in_progress' }).sort({ created_at: -1 }).lean();
    if (activeAttempt && hostedExam.allow_resume === false) {
      try {
        const { updatedAttempt, resultVisible, resultMode } = await submitAttemptWithScoring({ attempt: { ...activeAttempt, hosted: hostedExam }, forceAutoSubmit: true });
        return res.status(409).json({ error: 'Resume disabled. Previous attempt auto-submitted.', autoSubmittedAttempt: { id: updatedAttempt.id, status: updatedAttempt.status, score: updatedAttempt.score, total_marks: updatedAttempt.total_marks, percentage: updatedAttempt.percentage, correct_count: updatedAttempt.correct_count, total_questions: updatedAttempt.total_questions, submitted_at: updatedAttempt.submitted_at, attempt_number: updatedAttempt.attempt_number }, resultVisible, resultMode });
      } catch (e) { if (e?.statusCode === 400) return res.status(400).json({ error: e.message }); throw e; }
    }
    if (!activeAttempt) {
      const usedAttempts = await AssessmentAttempt.countDocuments({ hosted_assessment_id: hostedAssessmentId, student_id: req.user.id });
      const maxAttempts = safeInt(hostedExam.max_attempts, 1);
      if (usedAttempts >= maxAttempts) return res.status(400).json({ error: 'Maximum attempts reached' });
      const totalQuestions = questions.length;
      const configuredTotalMarks = safeNumber(template?.total_marks, totalQuestions);
      const created = await AssessmentAttempt.create({ hosted_assessment_id: hostedAssessmentId, student_id: req.user.id, attempt_number: usedAttempts + 1, status: 'in_progress', answers: applyAttemptSectionState({}, { currentSection: 'mcq' }), total_questions: totalQuestions, total_marks: configuredTotalMarks });
      activeAttempt = created.toObject();
    }
    const remainingSeconds = getRemainingSeconds(activeAttempt, hostedExam);
    const sectionState = getAttemptSectionState(activeAttempt.answers);
    if (remainingSeconds <= 0) return res.status(400).json({ error: 'Attempt already timed out' });
    res.json({
      hostedAssessment: { id: hostedExam._id, title: hostedExam.exam_title || template?.title || 'Assessment', subject: template?.subject || 'N/A', instructions: hostedExam.instructions || '', allow_resume: hostedExam.allow_resume !== false, result_mode: hostedExam.result_mode, start_time: hostedExam.start_time, end_time: hostedExam.end_time, duration_minutes: hostedExam.duration_minutes, max_attempts: hostedExam.max_attempts, coding_section: sanitizeCodingSectionForStudent(hostedExam.coding_section, sectionState) },
      attempt: { id: activeAttempt._id, attempt_number: activeAttempt.attempt_number, status: activeAttempt.status, started_at: activeAttempt.started_at, answers: activeAttempt.answers || {}, current_section: sectionState.currentSection, section_completion_order: { mcq_completed_at: sectionState.mcqCompletedAt, coding_entered_at: sectionState.codingEnteredAt }, remaining_seconds: remainingSeconds },
      questions: sanitizeQuestionsForStudent(questions)
    });
  } catch (error) { console.error('Start student attempt error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to start attempt') }); }
});

router.get('/student/attempts/:attemptId', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const forceTakeover = String(req.query?.forceTakeover || '').toLowerCase() === 'true';
    const sessionToken = getExamSessionToken(req);
    let attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    const hostedExam = await HostedAssessment.findById(attempt.hosted_assessment_id).lean();
    const template = hostedExam ? await AssessmentTemplate.findById(hostedExam.template_id).lean() : null;
    const hosted = { ...hostedExam, template };
    const sessionMeta = getAttemptSessionMeta(attempt.answers);
    const hasDifferentSession = Boolean(sessionMeta.token && sessionToken && sessionMeta.token !== sessionToken);
    if (attempt.status === 'in_progress' && hasDifferentSession && !forceTakeover) return res.status(409).json(buildSessionConflictResponse('This attempt is active in another browser session.', attempt._id));
    if (attempt.status === 'in_progress' && sessionToken && (!sessionMeta.token || forceTakeover)) {
      const updated = await AssessmentAttempt.findByIdAndUpdate(attempt._id, { answers: applyAttemptSessionMeta(attempt.answers, sessionToken) }, { new: true }).lean();
      attempt = updated;
    }
    const questions = normalizeQuestionList(template?.template_data);
    if (!questions.length) return res.status(400).json({ error: 'Questions not configured' });
    const remainingSeconds = getRemainingSeconds(attempt, hostedExam);
    const sectionState = getAttemptSectionState(attempt.answers);
    res.json({
      hostedAssessment: { id: hostedExam?._id, title: hostedExam?.exam_title || template?.title || 'Assessment', subject: template?.subject || 'N/A', instructions: hostedExam?.instructions || '', allow_resume: hostedExam?.allow_resume !== false, result_mode: hostedExam?.result_mode, start_time: hostedExam?.start_time, end_time: hostedExam?.end_time, duration_minutes: hostedExam?.duration_minutes, max_attempts: hostedExam?.max_attempts, coding_section: sanitizeCodingSectionForStudent(hostedExam?.coding_section, sectionState) },
      attempt: { id: attempt._id, attempt_number: attempt.attempt_number, status: attempt.status, started_at: attempt.started_at, submitted_at: attempt.submitted_at, answers: attempt.answers || {}, score: attempt.score, total_marks: attempt.total_marks, percentage: attempt.percentage, correct_count: attempt.correct_count, total_questions: attempt.total_questions, current_section: sectionState.currentSection, section_completion_order: { mcq_completed_at: sectionState.mcqCompletedAt, coding_entered_at: sectionState.codingEnteredAt }, remaining_seconds: remainingSeconds },
      questions: sanitizeQuestionsForStudent(questions)
    });
  } catch (error) { console.error('Get student attempt error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch attempt') }); }
});
// Student: mark MCQ complete
router.post('/student/attempts/:attemptId/mark-mcq-complete', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const sessionToken = getExamSessionToken(req);
    if (!sessionToken) return res.status(400).json({ error: 'Session token is required' });
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status !== 'in_progress') return res.status(400).json({ error: 'Only in-progress attempts can transition' });
    const hosted = await HostedAssessment.findById(attempt.hosted_assessment_id).lean();
    const cs = normalizeCodingSection(hosted?.coding_section);
    if (!cs) return res.status(400).json({ error: 'Coding section not enabled' });
    const activeToken = getAttemptSessionMeta(attempt.answers).token;
    if (activeToken && activeToken !== sessionToken) return res.status(409).json(buildSessionConflictResponse('Active in another session', attempt._id));
    const ess = getAttemptSectionState(attempt.answers);
    const nowIso = new Date().toISOString();
    const answersWithSection = applyAttemptSectionState(attempt.answers, { currentSection: 'coding', mcqCompletedAt: ess.mcqCompletedAt || nowIso, codingEnteredAt: ess.codingEnteredAt || nowIso });
    const nextAnswers = applyAttemptSessionMeta(answersWithSection, sessionToken);
    const updated = await AssessmentAttempt.findByIdAndUpdate(attempt._id, { answers: nextAnswers }, { new: true }).lean();
    const nss = getAttemptSectionState(updated.answers);
    res.json({ message: 'MCQ section complete. Coding unlocked.', coding_section: sanitizeCodingSectionForStudent(cs, nss), attempt: { id: updated._id, current_section: nss.currentSection, section_completion_order: { mcq_completed_at: nss.mcqCompletedAt, coding_entered_at: nss.codingEnteredAt } }, remaining_seconds: getRemainingSeconds(updated, hosted) });
  } catch (error) { console.error('Mark MCQ complete error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to unlock coding section') }); }
});

// Student: submit attempt
router.post('/student/attempts/:attemptId/submit', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers = {}, forceAutoSubmit: rawForce = false } = req.body || {};
    const forceAutoSubmit = parseBooleanInput(rawForce, false);
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      return res.json({ message: 'Attempt already submitted', attempt: { id: attempt._id, status: attempt.status, score: attempt.score, total_marks: attempt.total_marks, percentage: attempt.percentage, correct_count: attempt.correct_count, total_questions: attempt.total_questions, submitted_at: attempt.submitted_at } });
    }
    const hosted = await HostedAssessment.findById(attempt.hosted_assessment_id).lean();
    const template = hosted ? await AssessmentTemplate.findById(hosted.template_id).lean() : null;
    let result;
    try { result = await submitAttemptWithScoring({ attempt: { ...attempt, hosted: { ...hosted, template } }, incomingAnswers: answers, forceAutoSubmit }); }
    catch (e) { if (e?.statusCode === 400) return res.status(400).json({ error: e.message }); throw e; }
    const { updatedAttempt, resultVisible, resultMode } = result;
    res.json({ message: 'Attempt submitted successfully', resultVisible, resultMode, attempt: { id: updatedAttempt.id, status: updatedAttempt.status, score: updatedAttempt.score, total_marks: updatedAttempt.total_marks, percentage: updatedAttempt.percentage, correct_count: updatedAttempt.correct_count, total_questions: updatedAttempt.total_questions, submitted_at: updatedAttempt.submitted_at, attempt_number: updatedAttempt.attempt_number } });
  } catch (error) { console.error('Submit attempt error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to submit attempt') }); }
});

// Student: autosave
router.post('/student/attempts/:attemptId/autosave', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { attemptId } = req.params;
    const incomingAnswers = req.body?.answers;
    const incomingCodingSubmissions = req.body?.codingSubmissions;
    const sessionToken = getExamSessionToken(req);
    if (!sessionToken) return res.status(400).json({ error: 'Session token is required' });
    const attempt = await AssessmentAttempt.findOne({ _id: attemptId, student_id: req.user.id }).lean();
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status !== 'in_progress') return res.status(400).json({ error: 'Only in-progress attempts can be autosaved' });
    const activeSession = getAttemptSessionMeta(attempt.answers).token;
    if (activeSession && activeSession !== sessionToken) return res.status(409).json(buildSessionConflictResponse('Active in another session', attempt._id));
    const safeIncoming = (incomingAnswers && typeof incomingAnswers === 'object') ? incomingAnswers : {};
    const safeCoding = (incomingCodingSubmissions && typeof incomingCodingSubmissions === 'object') ? incomingCodingSubmissions : null;
    const mergedAnswers = { ...(attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {}), ...safeIncoming, ...(safeCoding !== null ? { [CODING_SUBMISSIONS_META_KEY]: safeCoding } : {}) };
    const hosted = await HostedAssessment.findById(attempt.hosted_assessment_id).select('duration_minutes').lean();
    const updated = await AssessmentAttempt.findByIdAndUpdate(attempt._id, { answers: applyAttemptSessionMeta(mergedAnswers, sessionToken) }, { new: true }).lean();
    res.json({ message: 'Autosaved successfully', autosavedAt: updated.updated_at, remaining_seconds: getRemainingSeconds(updated, hosted), attempt: { id: updated._id, status: updated.status, updated_at: updated.updated_at } });
  } catch (error) { console.error('Autosave error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to autosave') }); }
});

// Student: results
router.get('/student/results', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { detail: sd, error: se } = await getStudentDetail(req.user.id);
    if (se || !sd) return res.status(404).json({ error: 'Student details not found' });
    const hostedExams = await HostedAssessment.find({ publish_status: { $in: ['published', 'closed'] } }).sort({ created_at: -1 }).lean();
    const { map: targetMap } = await getStudentTargetMapForHostedExams(hostedExams.map(e => e._id));
    const scopedExams = hostedExams.filter(exam => { const tids = (targetMap[exam._id.toString()] || []).map(i => i.student_id); return isExamAssignedToStudent(exam, sd, req.user.id, tids); });
    const hostedIds = scopedExams.map(e => e._id);
    let attempts = [];
    if (hostedIds.length > 0) {
      attempts = await AssessmentAttempt.find({ student_id: req.user.id, hosted_assessment_id: { $in: hostedIds } }).select('_id hosted_assessment_id attempt_number status score total_marks percentage correct_count total_questions submitted_at created_at').sort({ created_at: -1 }).lean();
    }
    const attemptsByExam = attempts.reduce((acc, a) => { const k = a.hosted_assessment_id?.toString(); if (!acc[k]) acc[k] = []; acc[k].push({ ...a, id: a._id }); return acc; }, {});
    const now = new Date();
    const results = await Promise.all(scopedExams.map(async (exam) => {
      const template = await AssessmentTemplate.findById(exam.template_id).select('_id title subject question_count total_marks passing_percentage').lean();
      const examAttempts = attemptsByExam[exam._id.toString()] || [];
      const submittedAttempts = examAttempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted');
      const latestAttempt = submittedAttempts[0] || null;
      const bestAttempt = submittedAttempts.reduce((best, curr) => !best ? curr : (safeNumber(curr.score, 0) > safeNumber(best.score, 0) ? curr : best), null);
      const visible = exam.result_mode === 'immediate' || (exam.result_mode === 'after_end' && exam.end_time && now >= new Date(exam.end_time));
      return { examId: exam._id, title: exam.exam_title || template?.title || 'Assessment', subject: template?.subject || 'N/A', result_mode: exam.result_mode, start_time: exam.start_time, end_time: exam.end_time, attemptsUsed: examAttempts.length, latestAttempt, bestAttempt, resultVisible: visible };
    }));
    res.json({ results });
  } catch (error) { console.error('Student results error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch results') }); }
});

// Student metrics
router.get('/metrics/student', verifyToken, hasRole('student'), async (req, res) => {
  try {
    const { detail: sd, error: se } = await getStudentDetail(req.user.id);
    if (se || !sd) return res.status(404).json({ error: 'Student details not found' });
    const hostedExams = await HostedAssessment.find({ publish_status: { $in: ['published', 'closed'] } }).select('_id class_id section_id zone publish_status start_time end_time').lean();
    const { map: targetMap } = await getStudentTargetMapForHostedExams(hostedExams.map(e => e._id));
    const now = new Date();
    const exams = hostedExams.filter(e => { const tids = (targetMap[e._id.toString()] || []).map(i => i.student_id); return isExamAssignedToStudent(e, sd, req.user.id, tids); });
    const published = exams.filter(e => e.publish_status === 'published');
    const inProgress = published.filter(e => e.start_time && e.end_time && new Date(e.start_time) <= now && now <= new Date(e.end_time)).length;
    const upcoming = published.filter(e => e.start_time && now < new Date(e.start_time)).length;
    let completed = 0;
    const hostedIds = exams.map(e => e._id);
    if (hostedIds.length > 0) {
      const submitted = await AssessmentAttempt.find({ student_id: req.user.id, hosted_assessment_id: { $in: hostedIds }, status: { $in: ['submitted', 'auto_submitted'] } }).select('hosted_assessment_id').lean();
      completed = new Set(submitted.map(a => a.hosted_assessment_id?.toString())).size;
    }
    res.json({ assigned: exams.length, inProgress, upcoming, completed });
  } catch (error) { console.error('Student metrics error:', error); res.status(500).json({ error: getApiErrorMessage(error, 'Failed to fetch metrics') }); }
});

module.exports = router;
