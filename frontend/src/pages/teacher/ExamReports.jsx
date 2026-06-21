import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiDownload,
  FiFileText,
  FiBarChart2,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiFilter,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import { assessmentAPI } from '../../services/api';

const formatTime = (isoValue) => new Date(isoValue).toLocaleString();
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${secs}s`;
};

const ExamReports = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [reportType, setReportType] = useState('summary');
  const [reportFormat, setReportFormat] = useState('json');
  const [generating, setGenerating] = useState(false);

  const reportTypes = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'detailed', label: 'Detailed Report' },
    { value: 'analytics', label: 'Analytics Report' },
    { value: 'performance', label: 'Performance Report' }
  ];

  const reportFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'pdf', label: 'PDF' }
  ];

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const response = await assessmentAPI.getHostedExam(examId);
      setExamData(response.data);
    } catch (error) {
      toast.error('Failed to load exam data');
      navigate('/teacher/assessments/host');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const response = await assessmentAPI.getExamAttempts(examId);
      setAttempts(response.data.attempts || []);
    } catch (error) {
      toast.error('Failed to load attempts');
    }
  };

  useEffect(() => {
    fetchExamData();
    fetchAttempts();
  }, [examId]);

  const stats = useMemo(() => {
    const total = attempts.length;
    const submitted = attempts.filter(a => a.status === 'submitted' || a.status === 'auto_submitted').length;
    const inProgress = attempts.filter(a => a.status === 'in_progress').length;
    const expired = attempts.filter(a => a.status === 'expired').length;
    
    const scoredAttempts = attempts.filter(a => a.score !== null && a.total_marks);
    const avgScore = scoredAttempts.length > 0 
      ? scoredAttempts.reduce((sum, a) => sum + a.score, 0) / scoredAttempts.length 
      : 0;
    const highestScore = scoredAttempts.length > 0 
      ? Math.max(...scoredAttempts.map(a => a.score)) 
      : 0;
    const lowestScore = scoredAttempts.length > 0 
      ? Math.min(...scoredAttempts.map(a => a.score)) 
      : 0;
    
    const avgDuration = attempts.filter(a => a.duration_seconds).length > 0
      ? attempts.filter(a => a.duration_seconds).reduce((sum, a) => sum + a.duration_seconds, 0) / attempts.filter(a => a.duration_seconds).length
      : 0;

    const scoreDistribution = {
      excellent: scoredAttempts.filter(a => (a.score / a.total_marks) >= 0.9).length,
      good: scoredAttempts.filter(a => (a.score / a.total_marks) >= 0.7 && (a.score / a.total_marks) < 0.9).length,
      average: scoredAttempts.filter(a => (a.score / a.total_marks) >= 0.5 && (a.score / a.total_marks) < 0.7).length,
      poor: scoredAttempts.filter(a => (a.score / a.total_marks) < 0.5).length
    };

    return {
      total,
      submitted,
      inProgress,
      expired,
      avgScore: avgScore.toFixed(1),
      highestScore,
      lowestScore,
      avgDuration: Math.round(avgDuration),
      submissionRate: total > 0 ? ((submitted / total) * 100).toFixed(1) : 0,
      scoreDistribution
    };
  }, [attempts]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const reportData = {
        exam: {
          id: examData?.id,
          title: examData?.exam_title,
          subject: examData?.template?.subject,
          duration: examData?.duration_minutes,
          startTime: examData?.start_time,
          endTime: examData?.end_time,
          publishStatus: examData?.publish_status
        },
        stats,
        attempts: attempts.map(attempt => ({
          student: {
            id: attempt.student?.id,
            name: attempt.student?.full_name,
            email: attempt.student?.email,
            rollNumber: attempt.student?.roll_number
          },
          status: attempt.status,
          startedAt: attempt.started_at,
          submittedAt: attempt.submitted_at,
          duration: attempt.duration_seconds,
          score: attempt.score,
          totalMarks: attempt.total_marks,
          percentage: attempt.total_marks ? ((attempt.score / attempt.total_marks) * 100).toFixed(1) : 0,
          progress: attempt.progress_percentage
        })),
        generatedAt: new Date().toISOString()
      };

      if (reportFormat === 'json') {
        downloadJSON(reportData, `exam-report-${examId}-${Date.now()}.json`);
      } else if (reportFormat === 'csv') {
        downloadCSV(reportData, `exam-report-${examId}-${Date.now()}.csv`);
      } else if (reportFormat === 'pdf') {
        // For PDF, we'll create a simple text representation
        downloadPDF(reportData, `exam-report-${examId}-${Date.now()}.txt`);
      }

      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (data, filename) => {
    const headers = ['Student Name', 'Roll Number', 'Email', 'Status', 'Started At', 'Submitted At', 'Duration', 'Score', 'Total Marks', 'Percentage'];
    const rows = data.attempts.map(attempt => [
      attempt.student.name,
      attempt.student.rollNumber,
      attempt.student.email,
      attempt.status,
      attempt.startedAt || '',
      attempt.submittedAt || '',
      attempt.duration ? formatDuration(attempt.duration) : '',
      attempt.score || '',
      attempt.totalMarks || '',
      attempt.percentage + '%'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (data, filename) => {
    const content = `
EXAM REPORT
================

Exam: ${data.exam.title}
Subject: ${data.exam.subject}
Duration: ${data.exam.duration} minutes
Start Time: ${formatTime(data.exam.startTime)}
End Time: ${formatTime(data.exam.endTime)}

SUMMARY STATISTICS
==================
Total Attempts: ${data.stats.total}
Submitted: ${data.stats.submitted}
In Progress: ${data.stats.inProgress}
Expired: ${data.stats.expired}
Submission Rate: ${data.stats.submissionRate}%
Average Score: ${data.stats.avgScore}
Highest Score: ${data.stats.highestScore}
Lowest Score: ${data.stats.lowestScore}
Average Duration: ${formatDuration(data.stats.avgDuration)}

SCORE DISTRIBUTION
==================
Excellent (90%+): ${data.stats.scoreDistribution.excellent}
Good (70-89%): ${data.stats.scoreDistribution.good}
Average (50-69%): ${data.stats.scoreDistribution.average}
Poor (<50%): ${data.stats.scoreDistribution.poor}

DETAILED RESULTS
================
${data.attempts.map(attempt => `
${attempt.student.name} (${attempt.student.rollNumber})
Status: ${attempt.status}
Score: ${attempt.score}/${attempt.totalMarks} (${attempt.percentage}%)
Duration: ${attempt.duration ? formatDuration(attempt.duration) : 'N/A'}
Started: ${attempt.startedAt ? formatTime(attempt.startedAt) : 'N/A'}
Submitted: ${attempt.submittedAt ? formatTime(attempt.submittedAt) : 'N/A'}
---`).join('\n')}

Generated at: ${formatTime(data.generatedAt)}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="app-page">
          <div className="space-y-4">
            <div className="h-8 animate-pulse rounded bg-slate-100" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1>Exam Reports</h1>
            <p className="text-gray-500">
              {examData?.exam_title || 'Untitled Exam'} • {examData?.template?.subject || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SelectField
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-48"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value)}
              className="w-32"
            >
              {reportFormats.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </SelectField>
            <Button onClick={generateReport} disabled={generating}>
              <FiDownload className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FiUsers} label="Total Attempts" value={stats.total} iconColorClass="bg-blue-600" />
          <StatCard icon={FiCheckCircle} label="Submitted" value={stats.submitted} iconColorClass="bg-emerald-600" />
          <StatCard icon={FiTrendingUp} label="Avg Score" value={`${stats.avgScore}%`} iconColorClass="bg-amber-600" />
          <StatCard icon={FiActivity} label="Submission Rate" value={`${stats.submissionRate}%`} iconColorClass="bg-purple-600" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <Card.Header>
              <h2 className="section-title">Performance Overview</h2>
            </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-semibold text-lg">{stats.avgScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Highest Score</span>
                  <span className="font-semibold text-lg text-green-600">{stats.highestScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Lowest Score</span>
                  <span className="font-semibold text-lg text-red-600">{stats.lowestScore}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Duration</span>
                  <span className="font-semibold text-lg">{formatDuration(stats.avgDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Still In Progress</span>
                  <span className="font-semibold text-lg text-amber-600">{stats.inProgress}</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h2 className="section-title">Score Distribution</h2>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Excellent (90%+)</span>
                    <span className="text-sm font-semibold">{stats.scoreDistribution.excellent}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(stats.scoreDistribution.excellent / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Good (70-89%)</span>
                    <span className="text-sm font-semibold">{stats.scoreDistribution.good}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(stats.scoreDistribution.good / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Average (50-69%)</span>
                    <span className="text-sm font-semibold">{stats.scoreDistribution.average}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full"
                      style={{ width: `${(stats.scoreDistribution.average / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Poor (&lt;50%)</span>
                    <span className="text-sm font-semibold">{stats.scoreDistribution.poor}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(stats.scoreDistribution.poor / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <Card>
          <Card.Header>
            <h2 className="section-title">Report Options</h2>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Available Report Types</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiFileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Summary Report - Key statistics and overview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiBarChart2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Detailed Report - Complete attempt data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiPieChart className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Analytics Report - Performance analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiTrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-sm">Performance Report - Score distribution</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">Export Formats</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiDownload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">JSON - Machine-readable format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiDownload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">CSV - Spreadsheet compatible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiDownload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">PDF - Printable format (text-based)</span>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Layout>
  );
};

export default ExamReports;
