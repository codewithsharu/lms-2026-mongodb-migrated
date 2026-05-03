import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiClock, FiCode, FiEye, FiEyeOff, FiFlag, FiInfo, FiLock, FiSend, FiShield, FiTarget, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { assessmentAPI, compilerAPI } from '../../services/api';
import { getExamSessionToken } from '../../utils/examSession';
import { useAuth } from '../../context/AuthContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const formatTimer = (seconds) => {
  const safe = Math.max(0, Number(seconds || 0));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const normalizeAnswerForQuestion = (question, rawAnswer) => {
  if (question.type === 'blank') {
    return String(rawAnswer || '');
  }

  if (question.answerMode === 'multiple') {
    return Array.isArray(rawAnswer) ? rawAnswer : [];
  }

  return Number.isInteger(rawAnswer) ? rawAnswer : null;
};

const getDefaultAnswerForQuestion = (question) => {
  if (!question) return null;
  if (question.type === 'blank') return '';
  if (question.answerMode === 'multiple') return [];
  return null;
};

const hasAnswerValue = (question, value) => {
  if (!question) return false;
  if (question.type === 'blank') return String(value || '').trim().length > 0;
  if (question.answerMode === 'multiple') return Array.isArray(value) && value.length > 0;
  return Number.isInteger(value);
};

const stripDuplicateQuestionPrefix = (questionText, questionNumber) => {
  const text = String(questionText || '').trim();

  if (!text) {
    return '';
  }

  const prefixPattern = new RegExp(`^(?:question|q)\\s*${questionNumber}\\s*[:.)-]?\\s*`, 'i');
  return text.replace(prefixPattern, '').trim();
};

const clampNumber = (value, min, max, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
};

const parseBooleanFlag = (value) => {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
};

const parseChallengeIds = (value) => {
  return String(value || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
};

const extractChallengeQuestionCount = (payload) => {
  if (Array.isArray(payload?.problems)) {
    return payload.problems.length;
  }

  if (Array.isArray(payload?.challenge?.problems)) {
    return payload.challenge.problems.length;
  }

  return 0;
};

const EMBEDDED_CODING_PROGRESS_EVENT = 'challengeRunnerProgress';

const toNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const normalizeAttemptedQuestionIndexes = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => toNonNegativeInteger(entry, -1))
        .filter((entry) => entry >= 0)
    )
  ).sort((left, right) => left - right);
};

const normalizeQuestionScores = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => Number(entry))
    .map((entry) => (Number.isFinite(entry) && entry > 0 ? Number(entry.toFixed(2)) : 1));
};

const sumQuestionScores = (scores = []) => Number(
  (scores || []).reduce((sum, score) => sum + Number(score || 0), 0).toFixed(2)
);

const getCodingSubmissionAttemptedCount = (submission) => {
  if (!submission || typeof submission !== 'object') {
    return 0;
  }

  if (Array.isArray(submission.attemptedQuestionIndexes)) {
    return normalizeAttemptedQuestionIndexes(submission.attemptedQuestionIndexes).length;
  }

  const explicitCount = toNonNegativeInteger(submission.attemptedQuestionCount, -1);
  if (explicitCount >= 0) {
    return explicitCount;
  }

  return submission.attempted ? 1 : 0;
};

const getCodingSubmissionTotalCount = (submission) => {
  if (!submission || typeof submission !== 'object') {
    return 0;
  }

  const explicitTotal = toNonNegativeInteger(
    submission.totalQuestionCount ?? submission.totalQuestions,
    -1
  );

  if (explicitTotal >= 0) {
    return explicitTotal;
  }

  return 0;
};

const buildPreviewQuestions = (count = 20) => {
  const safeCount = clampNumber(count, 1, 120, 20);

  return Array.from({ length: safeCount }, (_, index) => {
    const questionNumber = index + 1;

    if (questionNumber % 5 === 0) {
      return {
        index: questionNumber,
        type: 'blank',
        answerMode: 'single',
        question: `Question ${questionNumber}: Write one key edge case you would validate for this problem.`
      };
    }

    if (questionNumber % 4 === 0) {
      return {
        index: questionNumber,
        type: 'mcq',
        answerMode: 'multiple',
        question: `Question ${questionNumber}: Select all valid practices for exam coding submissions.`,
        options: [
          'Validate input constraints before coding',
          'Skip sample tests to save time',
          'Use meaningful variable names',
          'Never review corner cases'
        ]
      };
    }

    return {
      index: questionNumber,
      type: 'mcq',
      answerMode: 'single',
      question: `Question ${questionNumber}: Which approach is best for solving the given problem efficiently?`,
      options: [
        'Brute force for all input sizes',
        'Choose algorithm based on constraints',
        'Avoid handling edge cases',
        'Hard-code output for samples'
      ]
    };
  });
};

const normalizeTemplateQuestionsForPreview = (templateData) => {
  const list = Array.isArray(templateData?.questions) ? templateData.questions : [];

  return list
    .map((item) => {
      const type = item?.type === 'blank' ? 'blank' : 'mcq';
      const question = String(item?.question || '').trim();

      if (!question) {
        return null;
      }

      if (type === 'blank') {
        return {
          type: 'blank',
          question,
          answerMode: 'single',
          options: []
        };
      }

      const options = Array.isArray(item?.options)
        ? item.options.map((option) => String(option || '').trim())
        : [];

      if (options.length !== 4 || options.some((option) => !option)) {
        return null;
      }

      const rawCorrectOptions = Array.isArray(item?.correctOptions)
        ? item.correctOptions
        : (Number.isInteger(item?.correctOption) ? [item.correctOption] : []);
      const validCorrectOptions = [...new Set(
        rawCorrectOptions.filter((value) => Number.isInteger(value) && value >= 0 && value <= 3)
      )];

      if (validCorrectOptions.length === 0) {
        return null;
      }

      return {
        type: 'mcq',
        question,
        answerMode: item?.answerMode === 'multiple' || validCorrectOptions.length > 1 ? 'multiple' : 'single',
        options
      };
    })
    .filter(Boolean)
    .map((question, index) => ({
      index: index + 1,
      ...question
    }));
};

const buildPreviewAttemptPayload = ({
  mcqCount,
  timerMinutes,
  enableCoding,
  challengeIds,
  startSection,
  examTitle,
  examSubject,
  previewQuestions
}) => {
  const questions = Array.isArray(previewQuestions) && previewQuestions.length > 0
    ? previewQuestions
    : buildPreviewQuestions(mcqCount);
  const startedAt = new Date().toISOString();
  const startInCoding = enableCoding && startSection === 'coding';

  return {
    attempt: {
      id: 'preview-attempt',
      attempt_number: 1,
      status: 'in_progress',
      remaining_seconds: clampNumber(timerMinutes, 5, 300, 60) * 60,
      answers: {
        __sectionMeta: {
          currentSection: startInCoding ? 'coding' : 'mcq',
          mcqCompletedAt: startInCoding ? startedAt : null,
          codingEnteredAt: startInCoding ? startedAt : null
        },
        __uiSavedResponses: {},
        __uiMarkedForReview: {},
        __codingSubmissions: {}
      },
      current_section: startInCoding ? 'coding' : 'mcq',
      section_completion_order: {
        mcq_completed_at: startInCoding ? startedAt : null,
        coding_entered_at: startInCoding ? startedAt : null
      }
    },
    hostedAssessment: {
      title: String(examTitle || 'Assessment'),
      subject: String(examSubject || 'General Subject'),
      result_mode: 'after_end',
      coding_section: {
        enabled: Boolean(enableCoding),
        unlocked: Boolean(enableCoding),
        challenge_ids: enableCoding ? challengeIds : []
      }
    },
    questions
  };
};

const AssessmentAttempt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { attemptId } = useParams();
  const { user } = useAuth();

  const previewConfig = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const previewFromPath = location.pathname.includes('/preview-lab/run');
    const previewFromQuery = parseBooleanFlag(searchParams.get('preview'));
    const enabled = previewFromPath || previewFromQuery;
    const requestedCoding = parseBooleanFlag(searchParams.get('coding'));
    const challengeIds = parseChallengeIds(searchParams.get('challenges'));
    const enableCoding = requestedCoding && challengeIds.length > 0;
    const requestedStart = String(searchParams.get('start') || 'mcq').toLowerCase();
    const examTitle = String(searchParams.get('title') || '').trim() || 'Assessment';
    const examSubject = String(searchParams.get('subject') || '').trim() || 'General Subject';
    const templateId = String(searchParams.get('templateId') || '').trim();

    return {
      enabled,
      mcqCount: clampNumber(searchParams.get('mcq'), 1, 120, 20),
      timerMinutes: clampNumber(searchParams.get('timer'), 5, 300, 60),
      enableCoding,
      challengeIds,
      startSection: enableCoding && requestedStart === 'coding' ? 'coding' : 'mcq',
      examTitle,
      examSubject,
      templateId
    };
  }, [location.pathname, location.search]);

  const isPreviewMode = previewConfig.enabled;
  const disableFullscreenLock = parseBooleanFlag(import.meta.env.VITE_DISABLE_FULLSCREEN_LOCK);
  const fullscreenEnforced = !isPreviewMode && !disableFullscreenLock;

  const shouldAutoTakeoverOnConflict = Boolean(location.state?.autoTakeoverOnConflict);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptData, setAttemptData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [savedResponses, setSavedResponses] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [submittedSummary, setSubmittedSummary] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showFullscreenLock, setShowFullscreenLock] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(null);
  const [resumingHere, setResumingHere] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState(null);
  const [currentSection, setCurrentSection] = useState('mcq');
  const [sectionCompletionOrder, setSectionCompletionOrder] = useState({});
  const [codingSubmissions, setCodingSubmissions] = useState({});
  const [codingQuestionTotalByChallenge, setCodingQuestionTotalByChallenge] = useState({});
  const [selectedCodingChallengeIndex, setSelectedCodingChallengeIndex] = useState(0);
  const [switchingToCoding, setSwitchingToCoding] = useState(false);
  const [showMcqQuestionPanel, setShowMcqQuestionPanel] = useState(true);
  const [codingFrameHeight, setCodingFrameHeight] = useState(0);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  const hasAutoSubmittedRef = useRef(false);
  const sessionTokenRef = useRef(getExamSessionToken());
  const skipNextAutosaveRef = useRef(true);
  const exitAutoSubmitTriggeredRef = useRef(false);
  const hasBootstrapAttemptRef = useRef(false);
  const codingFrameRef = useRef(null);
  const codingFramePollingRef = useRef(null);
  const loadAttemptRef = useRef(null);
  const handleSubmitRef = useRef(null);

  const buildAutosavePayload = (
    questionList,
    currentAnswers,
    currentSaved,
    currentMarked,
    currentSectionValue,
    completionOrder,
    codingSubmissionState
  ) => {
    const payload = {};

    questionList.forEach((question) => {
      const key = String(question.index);
      payload[key] = currentAnswers[key] ?? getDefaultAnswerForQuestion(question);
    });

    payload.__uiSavedResponses = currentSaved;
    payload.__uiMarkedForReview = currentMarked;
    payload.__sectionMeta = {
      currentSection: currentSectionValue,
      mcqCompletedAt: completionOrder?.mcq_completed_at || null,
      codingEnteredAt: completionOrder?.coding_entered_at || null
    };
    payload.__codingSubmissions = (
      codingSubmissionState && typeof codingSubmissionState === 'object'
    ) ? codingSubmissionState : {};

    return payload;
  };

  const hydrateAttemptState = (payload) => {
    // Enhanced validation with detailed logging
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload provided to hydrateAttemptState:', payload);
      return false;
    }

    const attempt = payload?.attempt;
    const hostedAssessment = payload?.hostedAssessment;
    const questionList = Array.isArray(payload?.questions) ? payload.questions : [];

    // Validate required fields
    const validationErrors = [];
    
    if (!attempt || typeof attempt !== 'object') {
      validationErrors.push('Missing or invalid attempt data');
    } else {
      // Validate critical attempt fields
      if (!attempt.id && !attempt._id) validationErrors.push('Attempt ID missing');
      if (!attempt.status) validationErrors.push('Attempt status missing');
      if (typeof attempt.remaining_seconds !== 'number') validationErrors.push('Invalid remaining time');
    }

    if (!hostedAssessment || typeof hostedAssessment !== 'object') {
      validationErrors.push('Missing or invalid hosted assessment data');
    }

    if (!questionList.length) {
      validationErrors.push('No questions available');
    }

    if (validationErrors.length > 0) {
      console.error('Attempt state validation failed:', validationErrors.join(', '), payload);
      return false;
    }

    // Validate attempt status for resume scenarios
    const validStatuses = ['in_progress', 'submitted', 'auto_submitted'];
    if (!validStatuses.includes(attempt.status)) {
      console.error('Invalid attempt status for resume:', attempt.status);
      return false;
    }

    // Check if attempt is still active for resume
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      console.log('Attempt already submitted, showing results');
    } else if (attempt.status === 'in_progress') {
      // Check if time is still valid
      if (attempt.remaining_seconds <= 0) {
        console.error('Attempt has expired but still marked as in_progress');
        return false;
      }
    }

    setAttemptData({ attempt, hostedAssessment });
    setQuestions(questionList);

    const initialAnswers = {};
    const initialSaved = {};
    const persistedSaved = attempt.answers?.__uiSavedResponses;
    const persistedMarked = attempt.answers?.__uiMarkedForReview;
    const persistedSectionMeta = attempt.answers?.__sectionMeta;
    const persistedCodingSubmissions = attempt.answers?.__codingSubmissions;
    const fallbackSection = persistedSectionMeta?.currentSection === 'coding' ? 'coding' : 'mcq';
    const resolvedSection = attempt.current_section === 'coding' ? 'coding' : fallbackSection;
    const resolvedCompletionOrder = {
      mcq_completed_at: attempt.section_completion_order?.mcq_completed_at
        || persistedSectionMeta?.mcqCompletedAt
        || null,
      coding_entered_at: attempt.section_completion_order?.coding_entered_at
        || persistedSectionMeta?.codingEnteredAt
        || null
    };

    questionList.forEach((question) => {
      const key = String(question.index);
      const normalized = normalizeAnswerForQuestion(question, attempt.answers?.[key]);
      initialAnswers[key] = normalized;
      initialSaved[key] = typeof persistedSaved?.[key] === 'boolean'
        ? persistedSaved[key]
        : hasAnswerValue(question, normalized);
    });

    setAnswers(initialAnswers);
    setSavedResponses(initialSaved);
    setMarkedForReview(
      persistedMarked && typeof persistedMarked === 'object'
        ? persistedMarked
        : {}
    );
    setCurrentSection(hostedAssessment?.coding_section?.enabled ? resolvedSection : 'mcq');
    setSectionCompletionOrder(resolvedCompletionOrder);
    setCodingSubmissions(
      persistedCodingSubmissions && typeof persistedCodingSubmissions === 'object'
        ? persistedCodingSubmissions
        : {}
    );
    setCodingQuestionTotalByChallenge({});
    setSelectedCodingChallengeIndex(0);
    setTimeLeft(Math.max(0, Number(attempt.remaining_seconds || 0)));
    skipNextAutosaveRef.current = true;

    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      // Redirect submitted users to assessments page
      toast.success('This attempt has been submitted. Redirecting to assessments...', {
        duration: 3000
      });
      setTimeout(() => {
        navigate('/student/assessments');
      }, 1000);
      return false; // Don't load the attempt
    }

    return true;
  };

  const loadAttempt = async ({ forceTakeover = false, silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setSessionConflict(null);
      const response = await assessmentAPI.getStudentAttempt(attemptId, {
        sessionToken: sessionTokenRef.current,
        forceTakeover
      });

      // Check if attempt is submitted and redirect immediately
      const attempt = response.data?.attempt;
      if (attempt && (attempt.status === 'submitted' || attempt.status === 'auto_submitted')) {
        toast.success('This attempt has been submitted. Redirecting to assessments...', {
          duration: 3000
        });
        setTimeout(() => {
          navigate('/student/assessments');
        }, 1000);
        return;
      }

      if (!hydrateAttemptState(response.data)) {
        const errorMessage = 'Attempt data not available or invalid';
        toast.error(errorMessage);
        
        // If coming from resume list, show specific message
        if (location.state?.fromResumeList) {
          toast.error('This attempt is no longer available. It may have been submitted or expired.');
        }
        
        if (!hasBootstrapAttemptRef.current) {
          navigate('/student/assessments');
        }
        return;
      }
    } catch (error) {
      // Handle session conflict
      if (error.response?.status === 409 && error.response?.data?.sessionConflict) {
        if (shouldAutoTakeoverOnConflict && !forceTakeover) {
          await loadAttempt({ forceTakeover: true, silent });
          return;
        }

        setShowSubmitModal(false);
        setSessionConflict({
          message: error.response?.data?.error || 'This attempt is active in another session.',
          attemptId: error.response?.data?.attemptId || attemptId
        });
        return;
      }

      // Handle various error scenarios with better user feedback
      let errorMessage = 'Failed to load attempt';
      let shouldRedirect = true;

      if (error.response?.status === 404) {
        errorMessage = 'Assessment attempt not found';
        shouldRedirect = true;
        
        // If coming from resume list, show specific message
        if (location.state?.fromResumeList) {
          errorMessage = 'This attempt was not found. It may have been deleted or expired.';
        }
      } else if (error.response?.status === 400) {
        const backendMessage = error.response?.data?.error;
        const errorType = error.response?.data?.type;
        
        if (errorType === 'submitted') {
          // Handle submitted attempt - redirect to assessments
          toast.success('This attempt has been submitted. Redirecting to assessments...', {
            duration: 3000
          });
          setTimeout(() => {
            navigate('/student/assessments');
          }, 1000);
          return; // Don't show error toast
        } else if (backendMessage?.includes('timed out')) {
          errorMessage = 'Assessment time has expired';
          
          // If coming from resume list, show specific message
          if (location.state?.fromResumeList) {
            errorMessage = 'Your attempt has expired due to time limit. The assessment has been auto-submitted.';
          }
        } else if (backendMessage?.includes('Maximum attempts')) {
          errorMessage = 'Maximum attempts reached';
        } else if (backendMessage?.includes('window has ended')) {
          errorMessage = 'Assessment window has ended';
          
          // If coming from resume list, show specific message
          if (location.state?.fromResumeList) {
            errorMessage = 'The assessment window has ended. No further attempts can be made.';
          }
        } else {
          errorMessage = backendMessage || 'Assessment no longer available';
        }
        shouldRedirect = true;
      } else if (error.response?.status === 403) {
        errorMessage = 'You are not authorized to access this assessment';
        shouldRedirect = true;
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection issue. Please check your internet connection';
        shouldRedirect = false;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        shouldRedirect = true;
      }

      // Show error toast
      toast.error(errorMessage);

      // Handle navigation logic
      if (!hasBootstrapAttemptRef.current) {
        if (shouldRedirect) {
          navigate('/student/assessments');
        }
        // If not redirecting (e.g., network error), let the fallback UI handle it
      } else {
        console.error('Attempt refresh failed, using bootstrap payload:', errorMessage);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  loadAttemptRef.current = loadAttempt;

  useEffect(() => {
    document.documentElement.classList.add('exam-page-scrollbar-hidden');
    document.body.classList.add('exam-page-scrollbar-hidden');

    return () => {
      document.documentElement.classList.remove('exam-page-scrollbar-hidden');
      document.body.classList.remove('exam-page-scrollbar-hidden');
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const initializeAttempt = async () => {
      if (isPreviewMode) {
        let resolvedPreviewConfig = { ...previewConfig };

        if (resolvedPreviewConfig.templateId) {
          try {
            const templateResponse = await assessmentAPI.getTemplates();
            const templates = Array.isArray(templateResponse.data?.templates) ? templateResponse.data.templates : [];
            const selectedTemplate = templates.find((template) => template.id === resolvedPreviewConfig.templateId) || null;

            if (selectedTemplate) {
              const previewQuestions = normalizeTemplateQuestionsForPreview(selectedTemplate.template_data);

              if (previewQuestions.length > 0) {
                resolvedPreviewConfig = {
                  ...resolvedPreviewConfig,
                  mcqCount: previewQuestions.length,
                  examTitle: String(selectedTemplate.title || resolvedPreviewConfig.examTitle || 'Assessment'),
                  examSubject: String(selectedTemplate.subject || resolvedPreviewConfig.examSubject || 'General Subject'),
                  previewQuestions
                };
              }
            }
          } catch (error) {
            console.error('Failed to load selected template for preview:', error);
          }
        }

        if (cancelled) {
          return;
        }

        const previewPayload = buildPreviewAttemptPayload(resolvedPreviewConfig);
        hasBootstrapAttemptRef.current = false;
        hydrateAttemptState(previewPayload);
        setSessionConflict(null);
        setShowSubmitModal(false);
        setShowFullscreenLock(false);
        setLoading(false);
        return;
      }

      const bootstrapPayload = location.state?.attemptBootstrap;

      if (hydrateAttemptState(bootstrapPayload)) {
        hasBootstrapAttemptRef.current = true;
        setLoading(false);
        // Silent refresh to get latest data
        loadAttemptRef.current?.({ silent: true });
        return;
      }

      hasBootstrapAttemptRef.current = false;

      // Retry mechanism for loading attempts
      const attemptLoadWithRetry = async () => {
        while (retryCount < maxRetries && !cancelled) {
          try {
            await loadAttemptRef.current?.();
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.error(`Attempt load failed (attempt ${retryCount}/${maxRetries}):`, error);
            
            if (retryCount >= maxRetries) {
              // Final retry failed, show error state
              console.error('All retry attempts exhausted');
              toast.error('Failed to load assessment after multiple attempts. Please refresh the page.');
              break;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          }
        }
      };

      await attemptLoadWithRetry();
    };

    initializeAttempt();

    return () => {
      cancelled = true;
    };
  }, [attemptId, isPreviewMode, previewConfig, location.state]);

  useEffect(() => {
    exitAutoSubmitTriggeredRef.current = false;
  }, [attemptData?.attempt?.id]);

  useEffect(() => {
    if (!fullscreenEnforced) {
      return undefined;
    }

    const onFullScreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);

      if (!fullscreenActive && !submittedSummary && attemptData) {
        setShowFullscreenLock(true);
        document.documentElement.requestFullscreen().catch(() => {
          setShowFullscreenLock(true);
        });
      }

      if (fullscreenActive) {
        setShowFullscreenLock(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, [submittedSummary, attemptData, fullscreenEnforced]);

  useEffect(() => {
    if (!fullscreenEnforced) return;
    if (!attemptData || submittedSummary) return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setShowFullscreenLock(true);
      });
    }
  }, [attemptData, submittedSummary, location.state, fullscreenEnforced]);

  useEffect(() => {
    if (isPreviewMode) return;
    if (!attemptData || submittedSummary) return;

    const shouldAutoSubmitOnExit = (
      attemptData?.attempt?.status === 'in_progress' &&
      attemptData?.hostedAssessment?.allow_resume === false
    );
    const currentAttemptId = attemptData?.attempt?.id;

    const triggerExitAutoSubmit = () => {
      if (!shouldAutoSubmitOnExit || !currentAttemptId || exitAutoSubmitTriggeredRef.current) {
        return;
      }

      exitAutoSubmitTriggeredRef.current = true;

      const endpoint = `${API_URL}/assessments/student/attempts/${encodeURIComponent(currentAttemptId)}/submit`;
      const payload = {
        answers: buildAutosavePayload(
          questions,
          answers,
          savedResponses,
          markedForReview,
          currentSection,
          sectionCompletionOrder,
          codingSubmissions
        ),
        forceAutoSubmit: true,
        sessionToken: sessionTokenRef.current
      };

      try {
        const request = fetch(endpoint, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (request && typeof request.catch === 'function') {
          request.catch(() => {});
        }
      } catch {
        // Best-effort exit submit should not block browser navigation.
      }

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const beaconPayload = new URLSearchParams({
            forceAutoSubmit: 'true',
            sessionToken: sessionTokenRef.current || ''
          });

          navigator.sendBeacon(endpoint, beaconPayload);
        }
      } catch {
        // Ignore beacon errors; submit is also attempted via keepalive fetch.
      }
    };

    const onBeforeUnload = (event) => {
      triggerExitAutoSubmit();
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    const onPageHide = () => {
      triggerExitAutoSubmit();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [
    attemptData,
    submittedSummary,
    isPreviewMode,
    questions,
    answers,
    savedResponses,
    markedForReview,
    currentSection,
    sectionCompletionOrder,
    codingSubmissions
  ]);

  useEffect(() => {
    if (!attemptData || submittedSummary) return;

    if (timeLeft <= 0) {
      if (!hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        handleSubmitRef.current?.(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, attemptData, submittedSummary]);

  useEffect(() => {
    if (isPreviewMode) return;
    if (!attemptData || submittedSummary) return;
    if (!attemptData?.attempt?.id) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await assessmentAPI.autosaveStudentAttempt(
          attemptData.attempt.id,
          {
            answers: buildAutosavePayload(
              questions,
              answers,
              savedResponses,
              markedForReview,
              currentSection,
              sectionCompletionOrder,
              codingSubmissions
            )
          },
          {
            sessionToken: sessionTokenRef.current
          }
        );

        setLastAutoSavedAt(new Date());
      } catch (error) {
        if (error.response?.status === 409 && error.response?.data?.sessionConflict) {
          setSessionConflict({
            message: error.response?.data?.error || 'This attempt is active in another session.',
            attemptId: error.response?.data?.attemptId || attemptId
          });
          return;
        }

        console.error('Autosave failed:', error);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    answers,
    savedResponses,
    markedForReview,
    attemptData,
    submittedSummary,
    questions,
    attemptId,
    currentSection,
    sectionCompletionOrder,
    codingSubmissions,
    isPreviewMode
  ]);

  const answeredCount = useMemo(() => {
    return questions.filter((question) => Boolean(savedResponses[String(question.index)])).length;
  }, [questions, savedResponses]);

  const markedCount = useMemo(() => {
    return questions.filter((question) => Boolean(markedForReview[String(question.index)])).length;
  }, [questions, markedForReview]);

  const unansweredCount = useMemo(() => Math.max(0, questions.length - answeredCount), [questions.length, answeredCount]);

  const currentQuestion = questions[currentIndex] || null;
  const currentQuestionText = useMemo(
    () => stripDuplicateQuestionPrefix(currentQuestion?.question, currentIndex + 1),
    [currentQuestion?.question, currentIndex]
  );
  const codingSection = attemptData?.hostedAssessment?.coding_section || null;
  const codingChallengeIds = useMemo(
    () => (Array.isArray(codingSection?.challenge_ids) ? codingSection.challenge_ids : []),
    [codingSection]
  );
  const hasCodingSection = Boolean(codingSection?.enabled && codingChallengeIds.length > 0);
  const isCodingSectionUnlocked = Boolean(codingSection?.unlocked || sectionCompletionOrder?.mcq_completed_at);
  const currentCodingChallengeId = codingChallengeIds[selectedCodingChallengeIndex] || null;
  const codingTotalQuestionCount = useMemo(
    () => codingChallengeIds.reduce((total, challengeId) => {
      const knownTotal = toNonNegativeInteger(codingQuestionTotalByChallenge?.[challengeId], -1);
      if (knownTotal > 0) {
        return total + knownTotal;
      }

      const submissionTotal = getCodingSubmissionTotalCount(codingSubmissions?.[challengeId]);
      if (submissionTotal > 0) {
        return total + submissionTotal;
      }

      return total + Math.max(knownTotal, 0);
    }, 0),
    [codingChallengeIds, codingQuestionTotalByChallenge, codingSubmissions]
  );
  const codingAttemptedQuestionCount = useMemo(
    () => codingChallengeIds.reduce((total, challengeId) => {
      const submission = codingSubmissions?.[challengeId];
      const attempted = getCodingSubmissionAttemptedCount(submission);
      const knownTotal = toNonNegativeInteger(
        codingQuestionTotalByChallenge?.[challengeId] ?? getCodingSubmissionTotalCount(submission),
        -1
      );

      return total + (knownTotal > 0 ? Math.min(attempted, knownTotal) : attempted);
    }, 0),
    [codingChallengeIds, codingQuestionTotalByChallenge, codingSubmissions]
  );
  const mcqTotalQuestionCount = questions.length;
  const mcqPendingQuestionCount = Math.max(0, mcqTotalQuestionCount - answeredCount);
  const mcqCompletionPercent = Math.round((answeredCount / Math.max(1, mcqTotalQuestionCount)) * 100);
  const normalizedCodingTotalQuestionCount = hasCodingSection
    ? Math.max(codingTotalQuestionCount, codingAttemptedQuestionCount)
    : 0;
  const codingPendingQuestionCount = hasCodingSection
    ? Math.max(0, normalizedCodingTotalQuestionCount - codingAttemptedQuestionCount)
    : 0;
  const codingCompletionPercent = hasCodingSection
    ? Math.round((codingAttemptedQuestionCount / Math.max(1, normalizedCodingTotalQuestionCount)) * 100)
    : 100;
  const overallTotalQuestionCount = mcqTotalQuestionCount + (hasCodingSection ? normalizedCodingTotalQuestionCount : 0);
  const overallAttemptedQuestionCount = answeredCount + (hasCodingSection ? codingAttemptedQuestionCount : 0);
  const overallCompletionPercent = Math.round((overallAttemptedQuestionCount / Math.max(1, overallTotalQuestionCount)) * 100);
  const hasPendingUnattemptedQuestions = mcqPendingQuestionCount > 0 || codingPendingQuestionCount > 0;
  const unresolvedCodingTotalChallengeIds = useMemo(
    () => codingChallengeIds.filter((challengeId) => toNonNegativeInteger(codingQuestionTotalByChallenge?.[challengeId], -1) < 0),
    [codingChallengeIds, codingQuestionTotalByChallenge]
  );

  useEffect(() => {
    if (!hasCodingSection && currentSection !== 'mcq') {
      setCurrentSection('mcq');
    }
  }, [hasCodingSection, currentSection]);

  useEffect(() => {
    if (codingChallengeIds.length === 0 && selectedCodingChallengeIndex !== 0) {
      setSelectedCodingChallengeIndex(0);
      return;
    }

    if (selectedCodingChallengeIndex >= codingChallengeIds.length && codingChallengeIds.length > 0) {
      setSelectedCodingChallengeIndex(0);
    }
  }, [codingChallengeIds, selectedCodingChallengeIndex]);

  useEffect(() => {
    if (unresolvedCodingTotalChallengeIds.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const loadCodingQuestionTotals = async () => {
      const settled = await Promise.all(
        unresolvedCodingTotalChallengeIds.map(async (challengeId) => {
          try {
            const response = await compilerAPI.getChallenge(challengeId);
            return {
              challengeId,
              count: extractChallengeQuestionCount(response.data)
            };
          } catch {
            return {
              challengeId,
              count: 0
            };
          }
        })
      );

      if (cancelled) {
        return;
      }

      setCodingQuestionTotalByChallenge((prev) => {
        const next = { ...(prev || {}) };
        let changed = false;

        settled.forEach(({ challengeId, count }) => {
          const normalizedCount = toNonNegativeInteger(count, 0);

          if (toNonNegativeInteger(next[challengeId], -1) !== normalizedCount) {
            next[challengeId] = normalizedCount;
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    };

    loadCodingQuestionTotals();

    return () => {
      cancelled = true;
    };
  }, [unresolvedCodingTotalChallengeIds]);

  useEffect(() => {
    if (!hasCodingSection) {
      return undefined;
    }

    const onCodingRunnerProgress = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data;
      if (!payload || typeof payload !== 'object') {
        return;
      }

      if (payload.type !== EMBEDDED_CODING_PROGRESS_EVENT || payload.source !== 'challenge-runner') {
        return;
      }

      const challengeId = String(payload.challengeId || '').trim();
      if (!challengeId || !codingChallengeIds.includes(challengeId)) {
        return;
      }

      const incomingIndexes = normalizeAttemptedQuestionIndexes(payload.attemptedQuestionIndexes);
      const incomingAttempted = Math.max(
        incomingIndexes.length,
        toNonNegativeInteger(payload.attemptedQuestionCount, 0)
      );
      const incomingTotal = toNonNegativeInteger(payload.totalQuestionCount, 0);
      const incomingQuestionScores = normalizeQuestionScores(payload.questionScores);
      const incomingTotalPossibleScore = Number(payload.totalPossibleScore);
      const incomingPassedIndexesRaw = normalizeAttemptedQuestionIndexes(payload.passedQuestionIndexes);
      const incomingPassedCountRaw = Math.max(
        incomingPassedIndexesRaw.length,
        toNonNegativeInteger(payload.passedQuestionCount, 0)
      );

      setCodingSubmissions((prev) => {
        const previousState = prev && typeof prev === 'object' ? prev : {};
        const previousEntry = previousState[challengeId] && typeof previousState[challengeId] === 'object'
          ? previousState[challengeId]
          : {};
        const previousIndexes = normalizeAttemptedQuestionIndexes(previousEntry.attemptedQuestionIndexes);
        const mergedIndexes = Array.from(new Set([...previousIndexes, ...incomingIndexes])).sort((left, right) => left - right);
        const mergedAttempted = Math.max(
          getCodingSubmissionAttemptedCount(previousEntry),
          incomingAttempted,
          mergedIndexes.length
        );
        const mergedTotal = Math.max(
          getCodingSubmissionTotalCount(previousEntry),
          incomingTotal
        );

        const resolvedQuestionScores = incomingQuestionScores.length > 0
          ? incomingQuestionScores
          : normalizeQuestionScores(previousEntry.questionScores);

        let resolvedPassedIndexes = incomingPassedIndexesRaw;
        if (payload.allTestCasesPassed && resolvedQuestionScores.length > 0) {
          resolvedPassedIndexes = resolvedQuestionScores.map((_, index) => index);
        }

        if (resolvedPassedIndexes.length === 0 && incomingPassedCountRaw > 0 && resolvedQuestionScores.length > 0) {
          resolvedPassedIndexes = Array.from({ length: Math.min(incomingPassedCountRaw, resolvedQuestionScores.length) }, (_, index) => index);
        }

        const resolvedPassedCount = Math.max(
          resolvedPassedIndexes.length,
          incomingPassedCountRaw
        );

        const resolvedTotalPossibleScore = Number.isFinite(incomingTotalPossibleScore) && incomingTotalPossibleScore > 0
          ? Number(incomingTotalPossibleScore.toFixed(2))
          : (resolvedQuestionScores.length > 0
            ? sumQuestionScores(resolvedQuestionScores)
            : Number(previousEntry.totalPossibleScore || 0));

        return {
          ...previousState,
          [challengeId]: {
            ...previousEntry,
            attempted: mergedAttempted > 0,
            attemptedQuestionIndexes: mergedIndexes,
            attemptedQuestionCount: mergedAttempted,
            totalQuestionCount: mergedTotal,
            passedQuestionIndexes: resolvedPassedIndexes,
            passedQuestionCount: resolvedPassedCount,
            allTestCasesPassed: Boolean(
              payload.allTestCasesPassed
              || (resolvedQuestionScores.length > 0 && resolvedPassedIndexes.length === resolvedQuestionScores.length)
            ),
            questionScores: resolvedQuestionScores,
            totalPossibleScore: resolvedTotalPossibleScore,
            updatedAt: new Date().toISOString()
          }
        };
      });

      if (incomingTotal > 0) {
        setCodingQuestionTotalByChallenge((prev) => {
          const current = toNonNegativeInteger(prev?.[challengeId], 0);
          if (current >= incomingTotal) {
            return prev;
          }

          return {
            ...(prev || {}),
            [challengeId]: incomingTotal
          };
        });
      }
    };

    window.addEventListener('message', onCodingRunnerProgress);
    return () => {
      window.removeEventListener('message', onCodingRunnerProgress);
    };
  }, [hasCodingSection, codingChallengeIds]);

  const syncCodingFrameHeight = () => {
    const frame = codingFrameRef.current;

    if (!frame) {
      return;
    }

    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) {
        return;
      }

      const nextHeight = Math.max(
        Number(doc.body?.scrollHeight || 0),
        Number(doc.documentElement?.scrollHeight || 0),
        900
      );

      setCodingFrameHeight((prev) => (Math.abs(prev - nextHeight) > 8 ? nextHeight : prev));
    } catch {
      setCodingFrameHeight((prev) => (prev > 0 ? prev : 1000));
    }
  };

  const stopCodingFramePolling = () => {
    if (codingFramePollingRef.current) {
      window.clearInterval(codingFramePollingRef.current);
      codingFramePollingRef.current = null;
    }
  };

  const handleCodingFrameLoad = () => {
    syncCodingFrameHeight();
    stopCodingFramePolling();
    codingFramePollingRef.current = window.setInterval(syncCodingFrameHeight, 700);
  };

  useEffect(() => {
    if (currentSection !== 'coding' || !currentCodingChallengeId) {
      stopCodingFramePolling();
      return;
    }

    syncCodingFrameHeight();

    return () => {
      stopCodingFramePolling();
    };
  }, [currentSection, currentCodingChallengeId]);

  useEffect(() => {
    return () => {
      stopCodingFramePolling();
    };
  }, []);

  const setSingleChoice = (questionIndex, optionIndex) => {
    const key = String(questionIndex);
    setAnswers((prev) => ({ ...prev, [key]: optionIndex }));
    setSavedResponses((prev) => ({ ...prev, [key]: true }));
  };

  const toggleMultipleChoice = (questionIndex, optionIndex) => {
    const key = String(questionIndex);

    setAnswers((prev) => {
      const existing = Array.isArray(prev[key]) ? prev[key] : [];
      const selected = new Set(existing);

      if (selected.has(optionIndex)) selected.delete(optionIndex);
      else selected.add(optionIndex);

      const nextSelection = Array.from(selected).sort((a, b) => a - b);
      setSavedResponses((savedPrev) => ({ ...savedPrev, [key]: nextSelection.length > 0 }));

      return {
        ...prev,
        [key]: nextSelection
      };
    });
  };

  const setBlankAnswer = (questionIndex, value) => {
    const key = String(questionIndex);
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setSavedResponses((prev) => ({ ...prev, [key]: String(value || '').trim().length > 0 }));
  };

  const handleSubmit = async (forceAutoSubmit = false) => {
    if (!attemptData || submitting || submittedSummary) return;

    if (isPreviewMode) {
      const previewPercentage = Math.round((answeredCount / Math.max(1, questions.length)) * 100);

      setSubmittedSummary({
        status: forceAutoSubmit ? 'auto_submitted' : 'submitted',
        score: answeredCount,
        total_marks: questions.length,
        percentage: previewPercentage,
        correct_count: answeredCount,
        total_questions: questions.length,
        resultVisible: true,
        resultMode: 'preview'
      });

      toast.success(forceAutoSubmit ? 'Preview timer ended. Attempt auto-submitted.' : 'Preview submitted successfully');
      return;
    }

    try {
      setSubmitting(true);
      const response = await assessmentAPI.submitStudentAttempt(attemptId, {
        answers: buildAutosavePayload(
          questions,
          answers,
          savedResponses,
          markedForReview,
          currentSection,
          sectionCompletionOrder,
          codingSubmissions
        ),
        forceAutoSubmit
      }, {
        sessionToken: sessionTokenRef.current
      });

      const attempt = response.data?.attempt;
      setSubmittedSummary({
        ...attempt,
        resultVisible: Boolean(response.data?.resultVisible),
        resultMode: response.data?.resultMode
      });

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      toast.success(forceAutoSubmit ? 'Time is up. Attempt auto-submitted.' : 'Assessment submitted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  const moveToCodingSection = async () => {
    if (!attemptData?.attempt?.id || !hasCodingSection || switchingToCoding) return;

    const hasUnanswered = unansweredCount > 0;
    if (hasUnanswered && !isPreviewMode) {
      const proceed = window.confirm(
        `You still have ${unansweredCount} unanswered MCQ question(s). Submit MCQ section and continue to coding?`
      );

      if (!proceed) {
        return;
      }
    }

    try {
      setSwitchingToCoding(true);

      if (isPreviewMode) {
        const timestamp = new Date().toISOString();
        const nextCompletionOrder = {
          mcq_completed_at: sectionCompletionOrder?.mcq_completed_at || timestamp,
          coding_entered_at: timestamp
        };

        setSectionCompletionOrder(nextCompletionOrder);
        setCurrentSection('coding');
        setAttemptData((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            hostedAssessment: {
              ...prev.hostedAssessment,
              coding_section: {
                ...prev.hostedAssessment?.coding_section,
                unlocked: true
              }
            },
            attempt: {
              ...prev.attempt,
              current_section: 'coding',
              section_completion_order: nextCompletionOrder
            }
          };
        });

        toast.success('Moved to coding section.');
        return;
      }

      await assessmentAPI.autosaveStudentAttempt(
        attemptData.attempt.id,
        {
          answers: buildAutosavePayload(
            questions,
            answers,
            savedResponses,
            markedForReview,
            currentSection,
            sectionCompletionOrder,
            codingSubmissions
          )
        },
        {
          sessionToken: sessionTokenRef.current
        }
      );

      const response = await assessmentAPI.markMcqSectionComplete(
        attemptData.attempt.id,
        {},
        { sessionToken: sessionTokenRef.current }
      );

      const nextCompletionOrder = response.data?.attempt?.section_completion_order || {
        mcq_completed_at: new Date().toISOString(),
        coding_entered_at: new Date().toISOString()
      };

      setSectionCompletionOrder(nextCompletionOrder);
      setCurrentSection('coding');

      setAttemptData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          hostedAssessment: {
            ...prev.hostedAssessment,
            coding_section: response.data?.coding_section || prev.hostedAssessment?.coding_section
          },
          attempt: {
            ...prev.attempt,
            current_section: 'coding',
            section_completion_order: nextCompletionOrder
          }
        };
      });

      toast.success('MCQ section submitted. Coding section unlocked.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to continue to coding section');
    } finally {
      setSwitchingToCoding(false);
    }
  };

  const reEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowFullscreenLock(false);
    } catch {
      setShowFullscreenLock(true);
    }
  };

  const confirmSubmitFromModal = async () => {
    setShowSubmitModal(false);
    await handleSubmit(false);
  };

  const handleSessionTakeover = async () => {
    try {
      setResumingHere(true);
      await loadAttempt({ forceTakeover: true });
      toast.success('Session moved to this browser safely.');
    } finally {
      setResumingHere(false);
    }
  };

  const clearCurrentResponse = () => {
    if (!currentQuestion) return;
    const key = String(currentQuestion.index);
    setAnswers((prev) => ({
      ...prev,
      [key]: getDefaultAnswerForQuestion(currentQuestion)
    }));
    setSavedResponses((prev) => ({ ...prev, [key]: false }));
  };

  const toggleReviewForCurrent = () => {
    if (!currentQuestion) return;
    const key = String(currentQuestion.index);
    setMarkedForReview((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveAndNext = () => {
    if (!currentQuestion) return;

    const key = String(currentQuestion.index);
    const currentValue = answers[key];
    const hasValue = hasAnswerValue(currentQuestion, currentValue);

    setSavedResponses((prev) => ({
      ...prev,
      [key]: hasValue
    }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
    } else {
      toast.success(hasValue ? 'Answer saved for current question' : 'No answer selected for current question');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <Card className="mx-auto max-w-3xl">
          <Card.Body className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">
              {!isOnline ? 'Waiting for network connection...' : 'Loading assessment attempt...'}
            </p>
            {!isOnline && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <div className="flex items-center justify-center gap-2">
                  <FiWifiOff className="h-4 w-4" />
                  <span>You appear to be offline. Please check your internet connection.</span>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (!attemptData) {
    if (sessionConflict) {
      return (
        <div className="min-h-screen bg-slate-100 px-4 py-8">
          <Card className="mx-auto max-w-2xl">
            <Card.Header>
              <h2 className="section-title">Resume Here Safely</h2>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {sessionConflict.message || 'This attempt is active in another session.'}
              </div>
              <p className="text-sm text-slate-600">
                To prevent conflicts, only one browser session can save answers at a time.
                Continue here to safely move this attempt to your current browser.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => navigate('/student/assessments')}>
                  Back to Assessments
                </Button>
                <Button onClick={handleSessionTakeover} disabled={resumingHere}>
                  <FiLock className="h-4 w-4" />
                  {resumingHere ? 'Resuming Here...' : 'Resume Here & Logout Other Session'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      );
    }

    // Show error fallback instead of blank page
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <Card className="mx-auto max-w-2xl">
          <Card.Header>
            <h2 className="section-title">Assessment Unavailable</h2>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              This assessment attempt is currently unavailable or has encountered an error.
            </div>
            <p className="text-sm text-slate-600">
              This could be due to:
            </p>
            <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
              <li>The attempt has expired</li>
              <li>The attempt has already been submitted</li>
              <li>There was a system error loading the attempt</li>
              <li>The assessment is no longer available</li>
            </ul>
            <div className="flex flex-wrap justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => navigate('/student/assessments')}>
                Back to Assessments
              </Button>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Render beautiful thank you page after submission
  if (submittedSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <Card className="border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center">
              <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <FiCheckCircle className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Exam Submitted Successfully!</h1>
              <p className="text-blue-100 text-lg">Thank you for completing your assessment</p>
            </div>
            
            <Card.Body className="px-8 py-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-gray-600 font-medium">Assessment</span>
                  <span className="text-gray-900 font-semibold">{attemptData?.hostedAssessment?.title || 'Assessment'}</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {submittedSummary.status === 'auto_submitted' ? 'Auto Submitted' : 'Submitted'}
                  </span>
                </div>

                {submittedSummary.resultVisible && submittedSummary.resultMode !== 'preview' && (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-gray-600 font-medium">Score</span>
                      <span className="text-gray-900 font-semibold text-xl">{submittedSummary.score || 0} / {submittedSummary.total_marks || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <span className="text-gray-600 font-medium">Percentage</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                        (submittedSummary.percentage || 0) >= 60 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {submittedSummary.percentage || 0}%
                      </span>
                    </div>
                  </>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <FiInfo className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">What happens next?</p>
                      <p>Your answers have been submitted successfully. Your results will be available once the assessment is graded by your instructor.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button 
                    onClick={() => window.location.href = '/student/assessments'}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <FiArrowLeft className="mr-2 h-4 w-4" />
                    Back to Assessments
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/student/dashboard'}
                    className="flex-1"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>© 2026 EDU LMS Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`exam-attempt-shell min-h-screen w-full bg-slate-100 ${
      currentSection === 'coding'
        ? 'p-1.5 pb-[88px] sm:p-2 sm:pb-[92px] lg:p-2.5 lg:pb-[96px]'
        : 'p-2 pb-28 sm:p-3 sm:pb-32 lg:p-4 lg:pb-32'
    }`}>
      <div className="flex w-full flex-col ${currentSection === 'coding' ? 'gap-2' : 'gap-3'}">
        {/* Enterprise-style Header with Exam Info, Student Info, and Controls */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-3 shadow-sm sm:p-4 mb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Left side - Exam Info */}
            <div className="min-w-0 lg:flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <FiCode className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-white truncate sm:text-lg">
                    {attemptData?.hostedAssessment?.title || 'Assessment'}
                  </h1>
                </div>
              </div>
            </div>

            {/* Middle - Section Switcher and Challenge Selector */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-1 lg:justify-center">
              {currentSection === 'coding' && codingChallengeIds.length > 1 && (
                <select
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  value={selectedCodingChallengeIndex}
                  onChange={(event) => setSelectedCodingChallengeIndex(Number(event.target.value) || 0)}
                >
                  {codingChallengeIds.map((challengeId, index) => (
                    <option key={challengeId} value={index}>Challenge {index + 1}</option>
                  ))}
                </select>
              )}

              {hasCodingSection && (
                <div className="exam-section-switcher inline-flex items-stretch p-1 bg-white rounded-lg border border-slate-200">
                  <button
                    type="button"
                    className={`exam-section-btn ${currentSection === 'mcq' ? 'is-active' : ''}`}
                    onClick={() => setCurrentSection('mcq')}
                  >
                    <span className={`section-index ${currentSection === 'mcq' ? 'is-active' : ''}`}
                    >
                      1
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="section-caption">Section</span>
                      <span className="section-main">
                        <span className="section-name">MCQ</span>
                        <span className="section-count">{answeredCount}/{questions.length}</span>
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`exam-section-btn ${currentSection === 'coding' ? 'is-active' : ''}`}
                    onClick={() => {
                      if (switchingToCoding) return;
                      if (isCodingSectionUnlocked) {
                        setCurrentSection('coding');
                        return;
                      }
                      moveToCodingSection();
                    }}
                    disabled={switchingToCoding}
                  >
                    <span className={`section-index ${currentSection === 'coding' ? 'is-active' : ''}`}
                    >
                      2
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="section-caption">Section</span>
                      <span className="section-main">
                        <span className="section-name">Coding</span>
                        <span className="section-count">{codingAttemptedQuestionCount}/{codingTotalQuestionCount}</span>
                      </span>
                    </span>
                    {!isCodingSectionUnlocked && <FiLock className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Student Info */}
            <div className="flex items-center gap-3 lg:flex-1 lg:justify-end">
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-slate-200">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600">
                  <FiUser className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || 'Student'}</p>
                  <p className="text-[10px] text-slate-600">
                    Roll: {user?.roll_number || user?.student?.roll_number || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {fullscreenEnforced && !isFullscreen && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <FiLock className="mt-0.5 h-4 w-4" />
              <p>Fullscreen is mandatory during the assessment. Re-entering fullscreen automatically.</p>
            </div>
          </div>
        )}

        {currentSection === 'mcq' ? (
          <>
            {!showMcqQuestionPanel && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowMcqQuestionPanel(true)}
                  className="px-3 py-1.5"
                >
                  <FiEye className="h-4 w-4" />
                  Show Questions
                </Button>
              </div>
            )}

            <div className={`grid min-h-[calc(100vh-190px)] grid-cols-1 gap-3 ${showMcqQuestionPanel ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
              {showMcqQuestionPanel && (
                <Card className="order-2 flex h-full min-h-105 flex-col lg:order-2">
                  <Card.Header>
                    <div className="flex items-center justify-between">
                      <h2 className="section-title text-base">Questions</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{answeredCount}/{questions.length}</span>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowMcqQuestionPanel(false)}
                          className="px-2.5 py-1 text-xs"
                        >
                          <FiEyeOff className="h-3.5 w-3.5" />
                          Hide
                        </Button>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body className="hide-scrollbar flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                    {questions.map((question, index) => {
                      const key = String(question.index);
                      const isSaved = Boolean(savedResponses[key]);
                      const isMarked = Boolean(markedForReview[key]);

                      return (
                        <button
                          key={question.index}
                          type="button"
                          onClick={() => setCurrentIndex(index)}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                            currentIndex === index
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : isMarked
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium">Q{index + 1}</span>
                          <span className="flex items-center gap-1.5">
                            {isMarked && <FiFlag className="h-4 w-4 text-amber-600" />}
                            {isSaved ? <FiCheckCircle className="h-4 w-4 text-green-600" /> : <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />}
                          </span>
                        </button>
                      );
                    })}
                    </div>
                  </Card.Body>
                </Card>
              )}

              <Card className="order-1 flex h-full min-h-105 flex-col lg:order-1">
                <Card.Header>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="section-title text-base">Question {currentIndex + 1} of {questions.length}</h2>
                    <span className="text-xs text-slate-500 capitalize">{currentQuestion?.type} {currentQuestion?.answerMode === 'multiple' ? '(multiple correct)' : ''}</span>
                  </div>
                </Card.Header>
                <Card.Body className="hide-scrollbar flex-1 overflow-y-auto">
                  {currentQuestion ? (
                    <div className="space-y-5">
                      <p className="text-lg font-medium leading-relaxed text-slate-800">{currentQuestionText || currentQuestion.question}</p>

                      {currentQuestion.type === 'blank' ? (
                        <input
                          type="text"
                          className="form-input text-base"
                          placeholder="Type your answer"
                          value={String(answers[String(currentQuestion.index)] || '')}
                          onChange={(event) => setBlankAnswer(currentQuestion.index, event.target.value)}
                        />
                      ) : (
                        <div className="space-y-3">
                          {currentQuestion.options.map((option, optionIndex) => {
                            const key = String(currentQuestion.index);
                            const value = answers[key];
                            const selected = currentQuestion.answerMode === 'multiple'
                              ? (Array.isArray(value) && value.includes(optionIndex))
                              : (Number.isInteger(value) && value === optionIndex);

                            return (
                              <button
                                key={`${currentQuestion.index}-${optionIndex}`}
                                type="button"
                                onClick={() => {
                                  if (currentQuestion.answerMode === 'multiple') {
                                    toggleMultipleChoice(currentQuestion.index, optionIndex);
                                  } else {
                                    setSingleChoice(currentQuestion.index, optionIndex);
                                  }
                                }}
                                className={`w-full rounded-lg border p-3.5 text-left text-[15px] transition-colors ${
                                  selected
                                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="font-medium">{String.fromCharCode(65 + optionIndex)}.</span> {option}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs text-slate-500">
                        Use the bottom exam action dock for navigation and answer controls.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <div className="flex items-start gap-2">
                        <FiAlertTriangle className="mt-0.5 h-4 w-4" />
                        <p>No question found. Please refresh and try again.</p>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>

            <div className="fixed bottom-3 left-2 right-2 z-30 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:left-3 sm:right-3 sm:p-3.5 lg:left-4 lg:right-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button variant="danger" onClick={clearCurrentResponse}>
                    Clear Response
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={toggleReviewForCurrent}
                    className={currentQuestion && markedForReview[String(currentQuestion.index)] ? 'border-amber-300 bg-amber-50 text-amber-700' : ''}
                  >
                    <FiFlag className="h-4 w-4" />
                    {currentQuestion && markedForReview[String(currentQuestion.index)] ? 'Marked for Review' : 'Mark for Review'}
                  </Button>
                  <Button
                    variant="success"
                    onClick={saveAndNext}
                    disabled={!currentQuestion}
                    className="px-5"
                  >
                    {currentIndex >= questions.length - 1 ? 'Save' : 'Save & Next'}
                  </Button>
                </div>

                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold ${timeLeft <= 60 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    <FiClock className="h-4 w-4" />
                    <span>Time Left: {formatTimer(timeLeft)}</span>
                  </div>

                  {hasCodingSection ? (
                    <Button
                      onClick={moveToCodingSection}
                      disabled={switchingToCoding || submitting}
                      variant="danger"
                      className="btn-exam-finish"
                    >
                      <FiSend className="h-4 w-4" />
                      {switchingToCoding ? 'Submitting MCQ...' : 'Next Section'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSubmitModal(true)}
                      disabled={submitting}
                      variant="danger"
                      className="btn-exam-finish"
                    >
                      <FiCheckCircle className="h-4 w-4" />
                      {submitting ? 'Submitting...' : 'Finish Test'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-full">
              {currentCodingChallengeId ? (
                <iframe
                  ref={codingFrameRef}
                  title={`coding-challenge-${currentCodingChallengeId}`}
                  src={`/compiler/challenges/run/${encodeURIComponent(currentCodingChallengeId)}?embedded=1`}
                  onLoad={handleCodingFrameLoad}
                  className="block w-full border-0 bg-transparent"
                  style={{ height: codingFrameHeight > 0 ? `${codingFrameHeight}px` : '1200px' }}
                />
              ) : (
                <p className="p-2 text-sm text-slate-500">No coding challenge available for this exam.</p>
              )}
            </div>
          </>
        )}

        {currentSection === 'coding' && (
          <div className="fixed bottom-3 left-2 right-2 z-30 rounded-xl border border-slate-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur sm:left-3 sm:right-3 sm:px-4 lg:left-4 lg:right-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className={`exam-metric-chip ${isOnline ? 'exam-metric-chip--network-online' : 'exam-metric-chip--network-offline'}`}>
                {isOnline ? <FiWifi className="h-4 w-4" /> : <FiWifiOff className="h-4 w-4" />}
                <span className="chip-label">Network</span>
                <span className="chip-value">{isOnline ? 'Connected' : 'Offline'}</span>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-semibold ${timeLeft <= 60 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                  <FiClock className="h-4 w-4" />
                  <span>Time Left: {formatTimer(timeLeft)}</span>
                </div>

                <Button
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitting}
                  variant="danger"
                  className="btn-exam-finish"
                >
                  <FiCheckCircle className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Finish Test'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Modal
          open={Boolean(sessionConflict)}
          onClose={() => navigate('/student/assessments')}
          title="Resume Here Safely"
          subtitle="Another browser session is active for this attempt"
          maxWidth="max-w-xl"
          footer={(
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/student/assessments')}>
                Back
              </Button>
              <Button onClick={handleSessionTakeover} disabled={resumingHere}>
                <FiLock className="h-4 w-4" />
                {resumingHere ? 'Resuming Here...' : 'Resume Here & Logout Other Session'}
              </Button>
            </div>
          )}
        >
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {sessionConflict?.message || 'This attempt is active in another browser session.'}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            To prevent conflicts, only one active session can write answers. Continuing here will safely end access from the other browser.
          </p>
        </Modal>

        <Modal
          open={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title="Confirm Submission"
          subtitle="Review your attempt summary before final submit"
          maxWidth="max-w-2xl"
          footer={(
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
                Continue Attempt
              </Button>
              <Button onClick={confirmSubmitFromModal} disabled={submitting} className="px-5 shadow-sm">
                <FiCheckCircle className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Confirm Final Submit'}
              </Button>
            </div>
          )}
        >
          <div className="rounded-md border border-slate-300 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-slate-700">
                <FiShield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Submission Readiness</p>
                <p className="mt-1 text-sm text-slate-600">Review MCQ and coding progress separately before final submission.</p>
              </div>
            </div>
          </div>

          <div className={`mt-4 grid grid-cols-1 gap-3 ${hasCodingSection ? 'lg:grid-cols-2' : ''}`}>
            <div className="rounded-md border border-slate-300 bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-slate-900">MCQ Section</p>
                <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${mcqPendingQuestionCount === 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {mcqCompletionPercent}%
                </span>
              </div>
              <div className="p-3.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Attempted</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{answeredCount}</p>
                  </div>
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">{mcqTotalQuestionCount}</p>
                  </div>
                  <div className={`rounded-sm border px-2 py-1 ${mcqPendingQuestionCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50'}`}>
                    <p className={`text-[10px] uppercase tracking-wide ${mcqPendingQuestionCount > 0 ? 'text-rose-600' : 'text-blue-600'}`}>Pending</p>
                    <p className={`mt-0.5 text-sm font-semibold ${mcqPendingQuestionCount > 0 ? 'text-rose-700' : 'text-blue-700'}`}>{mcqPendingQuestionCount}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-sm bg-slate-200">
                  <div
                    className="h-full rounded-sm bg-blue-700 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, mcqCompletionPercent))}%` }}
                  />
                </div>
              </div>
            </div>

            {hasCodingSection && (
              <div className="rounded-md border border-slate-300 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">Coding Section</p>
                  <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${codingPendingQuestionCount === 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {codingCompletionPercent}%
                  </span>
                </div>
                <div className="p-3.5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Attempted</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{codingAttemptedQuestionCount}</p>
                    </div>
                    <div className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{normalizedCodingTotalQuestionCount}</p>
                    </div>
                    <div className={`rounded-sm border px-2 py-1 ${codingPendingQuestionCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-blue-200 bg-blue-50'}`}>
                      <p className={`text-[10px] uppercase tracking-wide ${codingPendingQuestionCount > 0 ? 'text-rose-600' : 'text-blue-600'}`}>Pending</p>
                      <p className={`mt-0.5 text-sm font-semibold ${codingPendingQuestionCount > 0 ? 'text-rose-700' : 'text-blue-700'}`}>{codingPendingQuestionCount}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-sm bg-slate-200">
                    <div
                      className="h-full rounded-sm bg-blue-700 transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, codingCompletionPercent))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasPendingUnattemptedQuestions ? (
            <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
              <div className="flex items-start gap-2">
                <FiAlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Unattempted questions detected</p>
                  <p className="mt-1">
                    MCQ pending: <span className="font-semibold">{mcqPendingQuestionCount}</span>
                    {hasCodingSection ? (
                      <>
                        {' '}• Coding pending: <span className="font-semibold">{codingPendingQuestionCount}</span>
                      </>
                    ) : ''}
                    . Submitting now will finalize these as unanswered.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <FiCheckCircle className="mt-0.5 h-4 w-4" />
                <p>All available questions are attempted. You can submit confidently.</p>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <FiFlag className="mt-0.5 h-4 w-4 text-amber-600" />
                <p>Marked for review: <span className="font-semibold">{markedCount}</span></p>
              </div>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <FiTarget className="mt-0.5 h-4 w-4" />
                <p>
                  Overall completion: <span className="font-semibold">{overallCompletionPercent}%</span>
                  {' '}({overallAttemptedQuestionCount}/{overallTotalQuestionCount})
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            After submission, you cannot edit your answers. Fullscreen lock will be released only after submit.
          </div>
        </Modal>

        {fullscreenEnforced && showFullscreenLock && !submittedSummary && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <FiLock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Fullscreen Required</h3>
              <p className="mt-2 text-sm text-slate-600">
                This assessment must stay in fullscreen mode. Fullscreen will be re-enabled to continue. You can exit only after submission.
              </p>
              <div className="mt-5 flex justify-end">
                <Button onClick={reEnterFullscreen}>Continue Exam</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentAttempt;
