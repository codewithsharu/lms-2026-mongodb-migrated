/**
 * Class Management Component
 * Shows class details, student lists, and zone management interface
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Button, Alert, Modal, Form, Table } from 'react-bootstrap';
import { FiUsers, FiEdit2, FiPlus, FiGrid, FiFilter, FiSearch } from 'react-icons/fi';
import profileApi from '../../services/profileApi';

const ClassManagement = ({ classId, currentUserId, currentUserRole }) => {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [zoneUpdateMode, setZoneUpdateMode] = useState(false);
  const [zoneUpdates, setZoneUpdates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getClassDetails(classId, true);
      
      if (response.success) {
        setClassData(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const handleZoneUpdate = async () => {
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
        loadClassData();
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

  const filteredStudents = classData?.students?.list?.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesZone = filterZone === 'all' || student.zone === filterZone;
    const matchesSection = filterSection === 'all' || student.section === filterSection;
    
    return matchesSearch && matchesZone && matchesSection;
  }) || [];

  const getUniqueSections = () => {
    const sections = new Set();
    classData?.students?.list?.forEach(student => {
      if (student.section) sections.add(student.section);
    });
    return Array.from(sections).sort();
  };

  const handleZoneChange = (studentId, newZone) => {
    setZoneUpdates(prev => ({
      ...prev,
      [studentId]: newZone
    }));
  };

  const bulkZoneUpdate = (zone) => {
    const updates = {};
    filteredStudents.forEach(student => {
      updates[student.student_id] = zone;
    });
    setZoneUpdates(updates);
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
        <FiGrid className="me-2" />
        {error}
      </Alert>
    );
  }

  if (!classData) {
    return (
      <Alert variant="info">
        <FiGrid className="me-2" />
        Class not found
      </Alert>
    );
  }

  return (
    <div className="class-management">
      {/* Class Header */}
      <Card className="mb-4">
        <CardHeader className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FiGrid className="me-2" />
              {classData.class.name}
            </h5>
            <div>
              <Button 
                variant="light" 
                size="sm"
                onClick={() => setShowZoneModal(true)}
                className="me-2"
              >
                <FiEdit2 className="me-1" />
                Manage Zones
              </Button>
              <Button 
                variant="light" 
                size="sm"
                onClick={() => setShowTeacherModal(true)}
              >
                <FiUsers className="me-1" />
                Teachers
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={8}>
              <p className="mb-2">{classData.class.description}</p>
              <div className="mb-2">
                <Badge bg="info" className="me-2">
                  {classData.class.academic_year || 'No Year'}
                </Badge>
                <Badge bg={classData.class.is_active ? 'success' : 'danger'}>
                  {classData.class.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </Col>
            <Col md={4} className="text-md-end">
              <div className="mb-2">
                <strong>Created:</strong> {new Date(classData.class.created_at).toLocaleDateString()}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Statistics Overview */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiGrid className="me-2" />
            Class Statistics
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-primary">{classData.statistics.total_students}</h3>
              <small className="text-muted">Total Students</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-success">{classData.statistics.active_count}</h3>
              <small className="text-muted">Active Students</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-info">{classData.statistics.total_sections}</h3>
              <small className="text-muted">Total Sections</small>
            </Col>
            <Col md={3} className="text-center mb-3">
              <h3 className="text-warning">{classData.statistics.total_teachers}</h3>
              <small className="text-muted">Assigned Teachers</small>
            </Col>
          </Row>
          
          {/* Zone Distribution */}
          <Row className="mt-3 pt-3 border-top">
            <Col md={12}>
              <strong>Zone Distribution:</strong>
              <div className="mt-2">
                {Object.entries(classData.students.zone_distribution).map(([zone, count]) => (
                  <Badge key={zone} bg={getZoneColor(zone)} className="me-2 mb-1">
                    {zone.toUpperCase()}: {count}
                  </Badge>
                ))}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Sections and Teachers */}
      <Card className="mb-4">
        <CardHeader>
          <h5 className="mb-0">
            <FiUsers className="me-2" />
            Sections & Teachers
          </h5>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <h6>Sections ({classData.sections.length})</h6>
              {classData.sections.map((section, index) => (
                <div key={index} className="border rounded p-2 mb-2">
                  <strong>{section.name}</strong>
                  {section.capacity && (
                    <span className="text-muted ms-2">Capacity: {section.capacity}</span>
                  )}
                  <div className="mt-1">
                    {section.teachers?.map((teacher, teacherIndex) => (
                      <Badge key={teacherIndex} bg="outline-primary" className="me-1">
                        {teacher.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </Col>
            <Col md={6}>
              <h6>Class-Level Teachers ({classData.teachers.class_level.length})</h6>
              {classData.teachers.class_level.map((teacher, index) => (
                <div key={index} className="border rounded p-2 mb-2">
                  <strong>{teacher.full_name}</strong>
                  <br />
                  <small className="text-muted">{teacher.email}</small>
                  {teacher.zone && (
                    <div className="mt-1">
                      <Badge bg={getZoneColor(teacher.zone)}>
                        {teacher.zone.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Student Management */}
      <Card>
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <FiUsers className="me-2" />
              Student Management ({filteredStudents.length} / {classData.students.total_count})
            </h5>
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
                    onClick={handleZoneUpdate}
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
        </CardHeader>
        <CardBody>
          {/* Filters */}
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label><FiSearch className="me-1" />Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by name, email, or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label><FiFilter className="me-1" />Zone Filter</Form.Label>
                <Form.Select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                >
                  <option value="all">All Zones</option>
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="unassigned">Unassigned</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label><FiFilter className="me-1" />Section Filter</Form.Label>
                <Form.Select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  <option value="all">All Sections</option>
                  {getUniqueSections().map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>&nbsp;</Form.Label>
                <div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterZone('all');
                      setFilterSection('all');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </Form.Group>
            </Col>
          </Row>

          {/* Bulk Zone Actions */}
          {zoneUpdateMode && (
            <Row className="mb-3">
              <Col md={12}>
                <Alert variant="info">
                  <strong>Bulk Zone Update:</strong>
                  <div className="mt-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => bulkZoneUpdate('blue')}
                      className="me-2"
                    >
                      All Blue
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => bulkZoneUpdate('red')}
                      className="me-2"
                    >
                      All Red
                    </Button>
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={() => bulkZoneUpdate('green')}
                    >
                      All Green
                    </Button>
                  </div>
                </Alert>
              </Col>
            </Row>
          )}

          {/* Students Table */}
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Email</th>
                  <th>Section</th>
                  <th>Zone</th>
                  <th>Status</th>
                  {zoneUpdateMode && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={index}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div>
                          <strong>{student.full_name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{student.roll_number}</td>
                    <td>{student.email}</td>
                    <td>{student.section || 'Unassigned'}</td>
                    <td>
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
                    </td>
                    <td>
                      <Badge bg={student.is_active ? 'success' : 'danger'}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {zoneUpdateMode && (
                      <td>
                        {zoneUpdates[student.student_id] && zoneUpdates[student.student_id] !== student.zone && (
                          <Badge bg="warning" className="me-1">
                            Changed
                          </Badge>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <Alert variant="info">
              <FiSearch className="me-2" />
              No students found matching the current filters.
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Zone Management Modal */}
      <Modal show={showZoneModal} onHide={() => setShowZoneModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FiEdit2 className="me-2" />
            Zone Management - {classData.class.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Current Zone Distribution:</h6>
          <div className="mb-3">
            {Object.entries(classData.students.zone_distribution).map(([zone, count]) => (
              <Badge key={zone} bg={getZoneColor(zone)} className="me-2 mb-2">
                {zone.toUpperCase()}: {count} students
              </Badge>
            ))}
          </div>
          
          <h6>Zone Descriptions:</h6>
          <div className="mb-3">
            <Badge bg="primary" className="me-2 mb-2">Blue</Badge> Standard track<br/>
            <Badge bg="danger" className="me-2 mb-2">Red</Badge> Advanced track<br/>
            <Badge bg="success" className="me-2 mb-2">Green</Badge> Remedial track
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowZoneModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Teachers Modal */}
      <Modal show={showTeacherModal} onHide={() => setShowTeacherModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FiUsers className="me-2" />
            Teachers - {classData.class.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Class-Level Teachers:</h6>
          {classData.teachers.class_level.length > 0 ? (
            <div className="mb-4">
              {classData.teachers.class_level.map((teacher, index) => (
                <div key={index} className="border rounded p-2 mb-2">
                  <Row>
                    <Col md={8}>
                      <strong>{teacher.full_name}</strong>
                      <br />
                      <small className="text-muted">{teacher.email}</small>
                    </Col>
                    <Col md={4} className="text-end">
                      {teacher.zone && (
                        <Badge bg={getZoneColor(teacher.zone)}>
                          {teacher.zone.toUpperCase()}
                        </Badge>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">No class-level teachers assigned</Alert>
          )}
          
          <h6>Section Teachers:</h6>
          {classData.sections.length > 0 ? (
            <div>
              {classData.sections.map((section, index) => (
                <div key={index} className="border rounded p-2 mb-2">
                  <strong>{section.name}</strong>
                  {section.capacity && (
                    <span className="text-muted ms-2">Capacity: {section.capacity}</span>
                  )}
                  <div className="mt-1">
                    {section.teachers?.length > 0 ? (
                      section.teachers.map((teacher, teacherIndex) => (
                        <Badge key={teacherIndex} bg="outline-primary" className="me-1">
                          {teacher.full_name}
                        </Badge>
                      ))
                    ) : (
                      <small className="text-muted">No teachers assigned</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info">No sections found</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTeacherModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClassManagement;
