import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiClock,
  FiEye,
  FiUsers,
  FiUserCheck,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Modal from '../../components/ui/Modal';
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

const getStatusBadge = (status) => {
  switch (status) {
    case 'in_progress': return 'warning';
    case 'submitted': return 'success';
    case 'auto_submitted': return 'info';
    case 'expired': return 'error';
    default: return 'info';
  }
};

const ExamMonitoring = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examData, setExamData] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('started_at');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'auto_submitted', label: 'Auto Submitted' },
    { value: 'expired', label: 'Expired' }
  ];

  const sortOptions = [
    { value: 'started_at', label: 'Start Time' },
    { value: 'submitted_at', label: 'Submit Time' },
    { value: 'duration', label: 'Duration' },
    { value: 'score', label: 'Score' },
    { value: 'student_name', label: 'Student Name' }
  ];

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const response = await assessmentAPI.getHostedExam(examId);
      setExamData(response.data);
    } catch (error) {
      toast.error('Failed to load exam data');
      navigate('/teacher/hosted-exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const response = await assessmentAPI.getExamAttempts(examId);
      setAttempts(response.data.attempts || []);
      setLastRefreshed(new Date());
    } catch (error) {
      toast.error('Failed to load attempts');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchExamData(), fetchAttempts()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchExamData();
    fetchAttempts();
  }, [examId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAttempts, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, examId]);

  const filteredAttempts = useMemo(() => {
    let filtered = attempts;

    if (searchQuery) {
      filtered = filtered.filter(attempt => 
        attempt.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.student?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.student?.roll_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(attempt => attempt.status === statusFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'started_at':
          return new Date(b.started_at) - new Date(a.started_at);
        case 'submitted_at':
          return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
        case 'duration':
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'student_name':
          return (a.student?.full_name || '').localeCompare(b.student?.full_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [attempts, searchQuery, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = attempts.length;
    const inProgress = attempts.filter(a => a.status === 'in_progress').length;
    const submitted = attempts.filter(a => a.status === 'submitted').length;
    const autoSubmitted = attempts.filter(a => a.status === 'auto_submitted').length;
    const expired = attempts.filter(a => a.status === 'expired').length;
    const avgScore = attempts.filter(a => a.score).reduce((sum, a) => sum + a.score, 0) / attempts.filter(a => a.score).length || 0;
    const avgDuration = attempts.filter(a => a.duration_seconds).reduce((sum, a) => sum + a.duration_seconds, 0) / attempts.filter(a => a.duration_seconds).length || 0;

    return {
      total,
      inProgress,
      submitted,
      autoSubmitted,
      expired,
      avgScore: avgScore.toFixed(1),
      avgDuration: Math.round(avgDuration)
    };
  }, [attempts]);

  const isExamLive = examData?.publish_status === 'published' && 
    new Date() >= new Date(examData?.start_time || 0) && 
    new Date() <= new Date(examData?.end_time || Date.now() + 86400000);

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
            <h1>Exam Monitoring</h1>
            <p className="text-gray-500">
              {examData?.exam_title || 'Untitled Exam'} • {examData?.template?.subject || 'N/A'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`status-badge ${isExamLive ? 'success' : 'info'}`}>
                {isExamLive ? 'Live' : examData?.publish_status || 'Unknown'}
              </span>
              {examData?.start_time && (
                <span className="text-sm text-gray-500">
                  {formatTime(examData.start_time)} - {formatTime(examData.end_time)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <Button variant="secondary" onClick={refreshData} disabled={refreshing}>
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Last refreshed: {lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Never'}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FiUsers} label="Total Attempts" value={stats.total} iconColorClass="bg-blue-600" />
          <StatCard icon={FiActivity} label="In Progress" value={stats.inProgress} iconColorClass="bg-amber-600" />
          <StatCard icon={FiCheckCircle} label="Submitted" value={stats.submitted} iconColorClass="bg-emerald-600" />
          <StatCard icon={FiClock} label="Avg Duration" value={formatDuration(stats.avgDuration)} iconColorClass="bg-slate-600" />
        </div>

        <Card>
          <Card.Header>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FiFilter className="w-4 h-4" />
                <span>Filters</span>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <InputField
                  label="Search Students"
                  leftIcon={FiSearch}
                  placeholder="Name, email, or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <SelectField
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="lg:w-48"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="lg:w-48"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Duration</th>
                    <th>Progress</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>
                        <div>
                          <p className="font-medium">{attempt.student?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{attempt.student?.roll_number || 'N/A'}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(attempt.status)}`}>
                          {attempt.status?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="text-sm">
                        {attempt.started_at ? formatTime(attempt.started_at) : 'N/A'}
                      </td>
                      <td className="text-sm">
                        {attempt.duration_seconds ? formatDuration(attempt.duration_seconds) : 'N/A'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${attempt.progress_percentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {attempt.progress_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="font-medium">
                        {attempt.score !== null ? `${attempt.score}/${attempt.total_marks || 0}` : 'N/A'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAttempt(attempt)}
                          >
                            <FiEye className="w-4 h-4" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAttempts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No attempts found matching the current filters.
                </div>
              )}
            </div>
          </Card.Body>
        </Card>

        <Modal
          open={!!selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          title="Attempt Details"
          subtitle={selectedAttempt ? `${selectedAttempt.student?.full_name} • ${selectedAttempt.status}` : ''}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedAttempt(null)}>
                Close
              </Button>
              {selectedAttempt?.status === 'in_progress' && (
                <Button variant="danger">
                  Force Submit
                </Button>
              )}
            </div>
          }
        >
          {selectedAttempt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Student</p>
                  <p className="font-medium">{selectedAttempt.student?.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedAttempt.student?.roll_number}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`status-badge ${getStatusBadge(selectedAttempt.status)}`}>
                    {selectedAttempt.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Started</p>
                  <p className="font-medium">{formatTime(selectedAttempt.started_at)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {selectedAttempt.duration_seconds ? formatDuration(selectedAttempt.duration_seconds) : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${selectedAttempt.progress_percentage || 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{selectedAttempt.progress_percentage || 0}%</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Score</p>
                  <p className="font-medium">
                    {selectedAttempt.score !== null ? `${selectedAttempt.score}/${selectedAttempt.total_marks || 0}` : 'Not available'}
                  </p>
                </div>
              </div>

              {selectedAttempt.answers && (
                <div>
                  <p className="font-medium mb-2">Answer Summary</p>
                  <div className="bg-gray-50 p-3 rounded">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedAttempt.answers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default ExamMonitoring;
