import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEye,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiDownload,
  FiRefreshCw,
  FiUser,
  FiCalendar,
  FiBarChart2,
  FiCode,
  FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { assessmentAPI } from '../../services/api';

const formatTime = (isoValue) => new Date(isoValue).toLocaleString();
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const StudentAttemptDetails = () => {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attemptData, setAttemptData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttemptData = async () => {
    try {
      setLoading(true);
      const response = await assessmentAPI.getStudentAttemptDetails(attemptId);
      setAttemptData(response.data);
    } catch (error) {
      toast.error('Failed to load attempt details');
      navigate(`/teacher/exam-monitoring/${examId}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamData = async () => {
    try {
      const response = await assessmentAPI.getHostedExam(examId);
      setExamData(response.data);
    } catch (error) {
      toast.error('Failed to load exam data');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchAttemptData(), fetchExamData()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAttemptData();
    fetchExamData();
  }, [examId, attemptId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress': return 'warning';
      case 'submitted': return 'success';
      case 'auto_submitted': return 'info';
      case 'expired': return 'error';
      default: return 'info';
    }
  };

  const getAnswerStatus = (questionIndex, answers, correctAnswers) => {
    const userAnswer = answers?.[questionIndex];
    const correctAnswer = correctAnswers?.[questionIndex];
    
    if (!userAnswer) return { status: 'unanswered', icon: FiXCircle, color: 'text-gray-500' };
    
    if (Array.isArray(correctAnswer)) {
      const isCorrect = Array.isArray(userAnswer) && 
        userAnswer.length === correctAnswer.length &&
        userAnswer.every(ans => correctAnswer.includes(ans));
      return {
        status: isCorrect ? 'correct' : 'incorrect',
        icon: isCorrect ? FiCheckCircle : FiXCircle,
        color: isCorrect ? 'text-green-600' : 'text-red-600'
      };
    }
    
    const isCorrect = userAnswer === correctAnswer;
    return {
      status: isCorrect ? 'correct' : 'incorrect',
      icon: isCorrect ? FiCheckCircle : FiXCircle,
      color: isCorrect ? 'text-green-600' : 'text-red-600'
    };
  };

  const questionStats = useMemo(() => {
    if (!attemptData?.answers || !examData?.template?.template_data?.questions) {
      return { total: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }

    const questions = examData.template.template_data.questions;
    const answers = attemptData.answers;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((question, index) => {
      const status = getAnswerStatus(index + 1, answers, question.correctOptions || question.correctOption);
      if (status.status === 'correct') correct++;
      else if (status.status === 'incorrect') incorrect++;
      else unanswered++;
    });

    return { total: questions.length, correct, incorrect, unanswered };
  }, [attemptData, examData]);

  if (loading) {
    return (
      <Layout>
        <div className="app-page">
          <div className="space-y-4">
            <div className="h-8 animate-pulse rounded bg-slate-100" />
            <div className="h-96 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => navigate(`/teacher/exam-monitoring/${examId}`)}
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Monitoring
            </Button>
            <div>
              <h1>Student Attempt Details</h1>
              <p className="text-gray-500">
                {attemptData?.student?.full_name} • {examData?.exam_title}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={refreshData} disabled={refreshing}>
            <FiRefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Card>
            <Card.Body className="text-center">
              <FiUser className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-500">Student</p>
              <p className="font-semibold">{attemptData?.student?.full_name}</p>
              <p className="text-sm text-gray-500">{attemptData?.student?.roll_number}</p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="text-center">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${
                attemptData?.status === 'submitted' ? 'bg-green-100' :
                attemptData?.status === 'in_progress' ? 'bg-amber-100' :
                'bg-gray-100'
              }`}>
                {attemptData?.status === 'submitted' ? <FiCheckCircle className="w-4 h-4 text-green-600" /> :
                 attemptData?.status === 'in_progress' ? <FiClock className="w-4 h-4 text-amber-600" /> :
                 <FiAlertTriangle className="w-4 h-4 text-gray-600" />}
              </span>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`status-badge ${getStatusBadge(attemptData?.status)}`}>
                {attemptData?.status?.replace('_', ' ') || 'Unknown'}
              </span>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="text-center">
              <FiBarChart2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-500">Score</p>
              <p className="font-semibold text-lg">
                {attemptData?.score !== null ? `${attemptData?.score}/${attemptData?.total_marks}` : 'Not graded'}
              </p>
              {attemptData?.total_marks && (
                <p className="text-sm text-gray-500">
                  {attemptData?.score !== null ? 
                    `${((attemptData.score / attemptData.total_marks) * 100).toFixed(1)}%` : 
                    '0%'}
                </p>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="text-center">
              <FiClock className="w-8 h-8 mx-auto mb-2 text-amber-600" />
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-semibold">
                {attemptData?.duration_seconds ? formatDuration(attemptData.duration_seconds) : 'N/A'}
              </p>
            </Card.Body>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-6">
          <StatCard icon={FiCheckCircle} label="Correct" value={questionStats.correct} iconColorClass="bg-green-600" />
          <StatCard icon={FiXCircle} label="Incorrect" value={questionStats.incorrect} iconColorClass="bg-red-600" />
          <StatCard icon={FiAlertTriangle} label="Unanswered" value={questionStats.unanswered} iconColorClass="bg-gray-600" />
          <StatCard icon={FiFileText} label="Total Questions" value={questionStats.total} iconColorClass="bg-blue-600" />
        </div>

        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Question Details</h2>
              <Button variant="secondary" size="sm">
                <FiDownload className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-6">
              {examData?.template?.template_data?.questions?.map((question, index) => {
                const questionNumber = index + 1;
                const answerStatus = getAnswerStatus(questionNumber, attemptData?.answers, question.correctOptions || question.correctOption);
                const userAnswer = attemptData?.answers?.[questionNumber];

                return (
                  <div key={questionNumber} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Question {questionNumber}</span>
                        <span className={`status-badge ${question.type === 'mcq' ? 'info' : 'warning'}`}>
                          {question.type === 'mcq' ? 'MCQ' : 'Fill in the blank'}
                        </span>
                        <answerStatus.icon className={`w-5 h-5 ${answerStatus.color}`} />
                      </div>
                      <div className="text-sm text-gray-500">
                        Marks: {question.marks || 1}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="font-medium text-gray-800">{question.question}</p>
                    </div>

                    {question.type === 'mcq' && (
                      <div className="space-y-2 mb-3">
                        {question.options?.map((option, optIndex) => {
                          const isCorrect = (question.correctOptions || [question.correctOption]).includes(optIndex);
                          const isSelected = Array.isArray(userAnswer) ? userAnswer.includes(optIndex) : userAnswer === optIndex;
                          
                          return (
                            <div
                              key={optIndex}
                              className={`p-2 rounded border ${
                                isCorrect ? 'bg-green-50 border-green-200' : 
                                isSelected && !isCorrect ? 'bg-red-50 border-red-200' : 
                                isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span>
                                <span>{option}</span>
                                {isCorrect && <FiCheckCircle className="w-4 h-4 text-green-600 ml-auto" />}
                                {isSelected && !isCorrect && <FiXCircle className="w-4 h-4 text-red-600 ml-auto" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'blank' && (
                      <div className="mb-3">
                        <div className="p-3 bg-gray-50 rounded border">
                          <p className="text-sm text-gray-600">Student Answer:</p>
                          <p className="font-medium">{userAnswer || 'Not answered'}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded border mt-2">
                          <p className="text-sm text-gray-600">Correct Answer:</p>
                          <p className="font-medium">{question.correctAnswer || 'Not specified'}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-medium ${answerStatus.color}`}>
                          {answerStatus.status.charAt(0).toUpperCase() + answerStatus.status.slice(1)}
                        </span>
                      </div>
                      {answerStatus.status === 'correct' && (
                        <span className="text-green-600 font-medium">+{question.marks || 1} marks</span>
                      )}
                      {answerStatus.status === 'incorrect' && (
                        <span className="text-red-600 font-medium">0 marks</span>
                      )}
                      {answerStatus.status === 'unanswered' && (
                        <span className="text-gray-600 font-medium">Not attempted</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card.Body>
        </Card>

        {attemptData?.coding_submissions && Object.keys(attemptData.coding_submissions).length > 0 && (
          <Card>
            <Card.Header>
              <h2 className="section-title">Coding Submissions</h2>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                {Object.entries(attemptData.coding_submissions).map(([challengeId, submission]) => (
                  <div key={challengeId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Challenge {challengeId}</h3>
                      <span className={`status-badge ${submission.submitted ? 'success' : 'warning'}`}>
                        {submission.submitted ? 'Submitted' : 'In Progress'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Questions Attempted:</span>
                        <span className="ml-2 font-medium">{submission.attemptedQuestions || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Questions:</span>
                        <span className="ml-2 font-medium">{submission.totalQuestions || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Time Spent:</span>
                        <span className="ml-2 font-medium">
                          {submission.duration ? formatDuration(submission.duration) : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Activity:</span>
                        <span className="ml-2 font-medium">
                          {submission.lastActivity ? formatTime(submission.lastActivity) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default StudentAttemptDetails;
