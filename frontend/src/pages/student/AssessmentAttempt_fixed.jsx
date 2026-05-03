import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiArrowLeft, FiClock, FiLock, FiSend, FiShield, FiUser, FiWifi, FiWifiOff } from 'react-icons/fi';
import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import { assessmentAPI } from '../../services/api';

const AssessmentAttempt = () => {
  const navigate = useNavigate();
  const [attemptData, setAttemptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(null);
  const [resumingHere, setResumingHere] = useState(false);

  // Add all the existing state and functions here...
  // (This is a simplified version for demonstration)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <Card className="mx-auto max-w-3xl">
          <Card.Body className="py-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500">Loading assessment attempt...</p>
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
                <Button onClick={() => {}} disabled={resumingHere}>
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

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <Card className="mx-auto max-w-4xl">
        <Card.Header>
          <h1 className="section-title">Assessment Attempt</h1>
        </Card.Header>
        <Card.Body>
          <div className="text-center">
            <p className="text-lg text-slate-600">Assessment loaded successfully!</p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AssessmentAttempt;
