/**
 * Student Profile Component
 * Shows student's academic info, assigned teachers, and recent activity
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Button, Alert } from 'react-bootstrap';
import { FiUser, FiMail, FiPhone, FiBook, FiUsers, FiActivity, FiClock } from 'react-icons/fi';
import profileApi from '../../services/profileApi';

const StudentProfile = ({ studentId, currentUserId, currentUserRole }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getStudentProfile(studentId);
      
      if (response.success) {
        setProfile(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <FiUser className="me-2" />
        {error}
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert variant="info">
        <FiUser className="me-2" />
        Profile not found
      </Alert>
    );
  }

  const getZoneColor = (zone) => {
    const colors = {
      blue: 'primary',
      red: 'danger',
      green: 'success',
      unassigned: 'secondary'
    };
    return colors[zone] || 'secondary';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="student-profile">
      {/* User Information */}
      <Card className="mb-4">
        <CardHeader className="bg-primary text-white">
          <h5 className="mb-0">
            <FiUser className="me-2" />
            Student Profile
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={4} className="text-center mb-3">
              {profile.user.profile_photo ? (
                <img 
                  src={profile.user.profile_photo} 
                  alt={profile.user.full_name}
                  className="rounded-circle mb-3"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mb-3"
                     style={{ width: '120px', height: '120px' }}>
                  <FiUser size={48} className="text-muted" />
                </div>
              )}
              <h5>{profile.user.full_name}</h5>
              <Badge bg={profile.user.is_active ? 'success' : 'danger'} className="mb-2">
                {profile.user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Col>
            <Col md={8}>
              <Row className="mb-3">
                <Col sm={6}>
                  <strong><FiMail className="me-2" />Email:</strong>
                  <br />
                  {profile.user.email}
                </Col>
                <Col sm={6}>
                  <strong><FiPhone className="me-2" />Phone:</strong>
                  <br />
                  {profile.user.phone || 'Not provided'}
                </Col>
              </Row>
              <Row className="mb-3">
                <Col sm={6}>
                  <strong><FiBook className="me-2" />Roll Number:</strong>
                  <br />
                  {profile.academic_info.roll_number}
                </Col>
                <Col sm={6}>
                  <strong><FiBook className="me-2" />Academic Year:</strong>
                  <br />
                  {profile.academic_info.academic_year || 'Not set'}
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <strong>Class:</strong>
                  <br />
                  {profile.academic_info.class?.name || 'Not assigned'}
                </Col>
                <Col sm={6}>
                  <strong>Section:</strong>
                  <br />
                  {profile.academic_info.section?.name || 'Not assigned'}
                </Col>
              </Row>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Academic Information */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiBook className="me-2" />
            Academic Information
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <div className="mb-3">
                <strong>Zone:</strong>
                <div className="mt-1">
                  <Badge bg={getZoneColor(profile.academic_info.zone)}>
                    {profile.academic_info.zone?.toUpperCase() || 'UNASSIGNED'}
                  </Badge>
                </div>
              </div>
            </Col>
            <Col md={6}>
              <div className="mb-3">
                <strong>Member Since:</strong>
                <br />
                {formatTime(profile.user.created_at)}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Assigned Teachers */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiUsers className="me-2" />
            Assigned Teachers ({profile.statistics.total_teachers})
          </h5>
        </CardHeader>
        <CardBody>
          {profile.teachers.length > 0 ? (
            <div className="teacher-list">
              {profile.teachers.map((teacher, index) => (
                <div key={index} className="border-bottom pb-3 mb-3">
                  <Row>
                    <Col md={6}>
                      <h6 className="mb-1">{teacher.full_name}</h6>
                      <small className="text-muted">{teacher.email}</small>
                    </Col>
                    <Col md={6} className="text-md-end">
                      <div className="mb-1">
                        <Badge bg="info" className="me-2">
                          {teacher.class_name}
                        </Badge>
                        {teacher.section_name && (
                          <Badge bg="secondary" className="me-2">
                            {teacher.section_name}
                          </Badge>
                        )}
                        {teacher.zone && (
                          <Badge bg={getZoneColor(teacher.zone)}>
                            {teacher.zone.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">
                        {teacher.assignment_type === 'section' ? 'Section Teacher' : 'Class Teacher'}
                      </small>
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">
              <FiUsers className="me-2" />
              No teachers assigned yet
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiActivity className="me-2" />
            Recent Activity
          </h5>
        </CardHeader>
        <CardBody>
          {profile.recent_activity.length > 0 ? (
            <div className="activity-list">
              {profile.recent_activity.map((activity, index) => (
                <div key={index} className="border-bottom pb-2 mb-2">
                  <Row>
                    <Col md={8}>
                      <strong>{activity.api_module}</strong>
                      <br />
                      <small className="text-muted">{activity.api_endpoint}</small>
                    </Col>
                    <Col md={4} className="text-md-end">
                      <Badge 
                        bg={activity.response_status >= 200 && activity.response_status < 300 ? 'success' : 'danger'}
                        className="me-2"
                      >
                        {activity.response_status}
                      </Badge>
                      <br />
                      <small className="text-muted">
                        <FiClock className="me-1" />
                        {formatTime(activity.created_at)}
                      </small>
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">
              <FiActivity className="me-2" />
              No recent activity
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <h5 className="mb-0">
            <FiActivity className="me-2" />
            Statistics
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={4} className="text-center mb-3">
              <h3 className="text-primary">{profile.statistics.total_teachers}</h3>
              <small className="text-muted">Total Teachers</small>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="text-info">{profile.statistics.class_teachers}</h3>
              <small className="text-muted">Class Teachers</small>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="text-success">{profile.statistics.section_teachers}</h3>
              <small className="text-muted">Section Teachers</small>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </div>
  );
};

export default StudentProfile;
