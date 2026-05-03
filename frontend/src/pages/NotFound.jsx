import { useNavigate } from 'react-router-dom';
import { FiHome, FiArrowLeft, FiSearch, FiAlertCircle } from 'react-icons/fi';
import Button from '../components/ui/Button';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12 text-center">
            <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <FiAlertCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-2">404</h1>
            <p className="text-xl text-slate-300 font-medium">Page Not Found</p>
          </div>

          {/* Content */}
          <div className="px-8 py-10">
            <div className="text-center mb-8">
              <p className="text-slate-600 text-lg mb-2">
                Oops! The page you're looking for doesn't exist.
              </p>
              <p className="text-slate-500 text-sm">
                It might have been moved, deleted, or you may have entered the wrong URL.
              </p>
            </div>

            {/* Error details */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FiSearch className="h-4 w-4" />
                What you can try:
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Check the URL for typos or errors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Go back to the previous page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Navigate to your dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span>Contact support if the problem persists</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
            <p className="text-center text-xs text-slate-500">
              Error Code: 404 • If you believe this is an error, please contact your administrator
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2026 EDU LMS Platform. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
