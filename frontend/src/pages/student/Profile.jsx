/**
 * Student Profile Page
 * Enhanced profile page with comprehensive teacher assignments display
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentProfile from '../../components/profile/StudentProfile';
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

  console.log('Profile page - user object:', user);
  console.log('Profile page - user.id:', user.id);
  console.log('Profile page - user._id:', user._id);

  // Handle both id and _id for MongoDB compatibility
  const studentId = user.id || user._id;

  console.log('Profile page - using studentId:', studentId);

  return (
    <Layout>
      <div className="app-page">
        <div className="page-header">
          <h1>My Profile</h1>
          <p>View your academic information and assigned teachers</p>
        </div>

        <div className="page-content">
          <StudentProfile 
            studentId={studentId}
            currentUserId={studentId}
            currentUserRole={user.role}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
