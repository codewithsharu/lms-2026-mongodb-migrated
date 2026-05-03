/**
 * Teacher Profile Page
 * Enhanced profile page with comprehensive class and student management
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherProfile from '../../components/profile/TeacherProfile';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Will redirect
  }

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>View your class assignments and student management</p>
        </div>

        <div className="page-content">
          <TeacherProfile 
            teacherId={user.id}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
