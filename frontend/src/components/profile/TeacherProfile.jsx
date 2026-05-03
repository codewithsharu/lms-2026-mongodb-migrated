/**
 * Teacher Profile Component
 * Shows teacher's class assignments, student lists, and zone management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Button, Alert, Modal, Form } from 'react-bootstrap';
import { FiUser, FiMail, FiPhone, FiBook, FiUsers, FiActivity, FiClock, FiEdit2, FiPlus, FiGrid } from 'react-icons/fi';
import profileApi from '../../services/profileApi';

const TeacherProfile = ({ teacherId, currentUserId, currentUserRole }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [zoneUpdateMode, setZoneUpdateMode] = useState(false);
  const [zoneUpdates, setZoneUpdates] = useState({});

  useEffect(() => {
    loadProfile();
  }, [teacherId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getTeacherProfile(teacherId, true);
      
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

  const handleZoneUpdate = async (classId) => {
    try {
      const updates = Object.entries(zoneUpdates)
        .filter(([studentId, zone]) => zone !== '')
        .map(([studentId, zone]) => ({
          student_id: studentId,
          new_zone: zone
        }));

      if (updates.length === 0) {
        alert('No zone changes to save');
        return;
      }

      const response = await profileApi.updateStudentZones(classId, { zone_updates: updates });
      
      if (response.success) {
        alert(`Successfully updated ${response.data.updated_count} students`);
        setZoneUpdateMode(false);
        setZoneUpdates({});
        loadProfile(); // Reload profile to show updated data
      } else {
        alert('Failed to update zones: ' + response.error);
      }
    } catch (err) {
      alert('Error updating zones: ' + err.message);
    }
  };

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

  const showClassStudents = (classData) => {
    setSelectedClass(classData);
    setShowStudentsModal(true);
  };

  const handleZoneChange = (studentId, newZone) => {
    setZoneUpdates(prev => ({
      ...prev,
      [studentId]: newZone
    }));
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

  return (
    <div className="teacher-profile">
      {/* User Information */}
      <Card className="mb-4">
        <CardHeader className="bg-primary text-white">
          <h5 className="mb-0">
            <FiUser className="me-2" />
            Teacher Profile
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
                  <strong>Role:</strong>
                  <br />
                  <Badge bg="info">{profile.user.role.toUpperCase()}</Badge>
                </Col>
                <Col sm={6}>
                  <strong>Member Since:</strong>
                  <br />
                  {formatTime(profile.user.created_at)}
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <strong>Last Login:</strong>
                  <br />
                  {formatTime(profile.user.last_login)}
                </Col>
                <Col sm={6}>
                  <strong>Status:</strong>
                  <br />
                  <Badge bg={profile.user.is_active ? 'success' : 'danger'}>
                    {profile.user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Col>
              </Row>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Assignment Statistics */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiGrid className="me-2" />
            Assignment Overview
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-primary">{profile.assignments.total_classes}</h3>
              <small className="text-muted">Total Classes</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-info">{profile.assignments.total_sections}</h3>
              <small className="text-muted">Total Sections</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-success">{profile.assignments.total_students}</h3>
              <small className="text-muted">Total Students</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-warning">{profile.statistics.unique_zones}</h3>
              <small className="text-muted">Unique Zones</small>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Class Assignments */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiBook className="me-2" />
            Class Assignments ({profile.assignments.total_classes})
          </h5>
        </CardHeader>
        <CardBody>
          {profile.assignments.classes.length > 0 ? (
            <div className="class-list">
              {profile.assignments.classes.map((classData, index) => (
                <div key={index} className="border rounded p-3 mb-3">
                  <Row>
                    <Col md={6}>
                      <h6 className="mb-2">{classData.class.name}</h6>
                      <p className="text-muted mb-2">{classData.class.description}</p>
                      <div className="mb-2">
                        <Badge bg="info" className="me-2">
                          {classData.class.academic_year || 'No Year'}
                        </Badge>
                        {classData.zones.map((zone, zoneIndex) => (
                          <Badge key={zoneIndex} bg={getZoneColor(zone)} className="me-1">
                            {zone.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </Col>
                    <Col md={6} className="text-md-end">
                      <div className="mb-2">
                        <strong>Students:</strong> {classData.student_count}
                      </div>
                      <div className="mb-2">
                        <strong>Sections:</strong> {classData.sections.length}
                      </div>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => showClassStudents(classData)}
                      >
                        <FiUsers className="me-1" />
                        Manage Students
                      </Button>
                    </Col>
                  </Row>
                  
                  {/* Zone Distribution */}
                  {Object.keys(classData.zone_distribution).length > 0 && (
                    <Row className="mt-3 pt-3 border-top">
                      <Col md={12}>
                        <strong>Zone Distribution:</strong>
                        <div className="mt-2">
                          {Object.entries(classData.zone_distribution).map(([zone, count]) => (
                            <Badge key={zone} bg={getZoneColor(zone)} className="me-2 mb-1">
                              {zone.toUpperCase()}: {count}
                            </Badge>
                          ))}
                        </div>
                      </Col>
                    </Row>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">
              <FiBook className="me-2" />
              No class assignments found
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
              <h3 className="text-primary">{profile.statistics.total_assignments}</h3>
              <small className="text-muted">Total Assignments</small>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="text-info">{profile.statistics.unique_zones}</h3>
              <small className="text-muted">Unique Zones</small>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="text-success">{profile.statistics.avg_students_per_class}</h3>
              <small className="text-muted">Avg Students/Class</small>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Students Modal */}
      <Modal show={showStudentsModal} onHide={() => setShowStudentsModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <FiUsers className="me-2" />
            Students - {selectedClass?.class?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClass && (
            <div>
              {/* Zone Controls */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <strong>Total Students:</strong> {selectedClass.student_count}
                </div>
                <div>
                  {!zoneUpdateMode ? (
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setZoneUpdateMode(true)}
                    >
                      <FiEdit2 className="me-1" />
                      Edit Zones
                    </Button>
                  ) : (
                    <div>
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleZoneUpdate(selectedClass.class._id)}
                        className="me-2"
                      >
                        Save Changes
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => {
                          setZoneUpdateMode(false);
                          setZoneUpdates({});
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Students List */}
              <div className="students-grid">
                {selectedClass.students.map((student, index) => (
                  <div key={index} className="border rounded p-2 mb-2">
                    <Row>
                      <Col md={4}>
                        <strong>{student.full_name}</strong>
                        <br />
                        <small className="text-muted">{student.roll_number}</small>
                      </Col>
                      <Col md={4}>
                        <small className="text-muted">{student.section}</small>
                      </Col>
                      <Col md={4} className="text-end">
                        {zoneUpdateMode ? (
                          <Form.Select
                            size="sm"
                            value={zoneUpdates[student.student_id] || student.zone || ''}
                            onChange={(e) => handleZoneChange(student.student_id, e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            <option value="blue">Blue</option>
                            <option value="red">Red</option>
                            <option value="green">Green</option>
                          </Form.Select>
                        ) : (
                          <Badge bg={getZoneColor(student.zone)}>
                            {(student.zone || 'unassigned').toUpperCase()}
                          </Badge>
                        )}
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStudentsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TeacherProfile;
