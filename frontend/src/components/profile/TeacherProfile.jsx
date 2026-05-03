/**
 * Teacher Profile Component
 * Shows teacher's class assignments, student lists, and zone management
 */

import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiBook, FiUsers, FiActivity, FiClock, FiEdit2, FiPlus, FiGrid, FiX, FiLoader } from 'react-icons/fi';
import profileApi from '../../services/profileApi';
import Card from '../ui/Card';
import toast from 'react-hot-toast';

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
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      unassigned: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[zone] || colors.unassigned;
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
      <div className="flex justify-center items-center py-8">
        <FiLoader className="animate-spin text-primary text-2xl" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
        <FiUser className="mr-2" />
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center">
        <FiUser className="mr-2" />
        Profile not found
      </div>
    );
  }

  return (
    <div className="teacher-profile space-y-6">
      {/* User Information */}
      <Card>
        <Card.Header className="bg-primary text-white">
          <h2 className="text-xl font-semibold flex items-center">
            <FiUser className="mr-2" />
            Teacher Profile
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              {profile.user.profile_photo ? (
                <img 
                  src={profile.user.profile_photo} 
                  alt={profile.user.full_name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                  <FiUser size={48} className="text-gray-400" />
                </div>
              )}
              <h3 className="text-lg font-semibold mb-2">{profile.user.full_name}</h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                profile.user.is_active 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {profile.user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center text-gray-600 mb-1">
                    <FiMail className="mr-2" />
                    <span className="font-medium">Email:</span>
                  </div>
                  <div className="text-gray-900">{profile.user.email}</div>
                </div>
                <div>
                  <div className="flex items-center text-gray-600 mb-1">
                    <FiPhone className="mr-2" />
                    <span className="font-medium">Phone:</span>
                  </div>
                  <div className="text-gray-900">{profile.user.phone || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">
                    <span className="font-medium">Role:</span>
                  </div>
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                    {profile.user.role.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">
                    <span className="font-medium">Member Since:</span>
                  </div>
                  <div className="text-gray-900">{formatTime(profile.user.created_at)}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">
                    <span className="font-medium">Last Login:</span>
                  </div>
                  <div className="text-gray-900">{formatTime(profile.user.last_login)}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">
                    <span className="font-medium">Status:</span>
                  </div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full border ${
                    profile.user.is_active 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {profile.user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Assignment Statistics */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold flex items-center">
            <FiGrid className="mr-2" />
            Assignment Overview
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{profile.assignments.total_classes}</div>
              <div className="text-sm text-gray-600">Total Classes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{profile.assignments.total_sections}</div>
              <div className="text-sm text-gray-600">Total Sections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{profile.assignments.total_students}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{profile.statistics.unique_zones}</div>
              <div className="text-sm text-gray-600">Unique Zones</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Class Assignments */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold flex items-center">
            <FiBook className="mr-2" />
            Class Assignments ({profile.assignments.total_classes})
          </h2>
        </Card.Header>
        <Card.Body>
          {profile.assignments.classes.length > 0 ? (
            <div className="space-y-4">
              {profile.assignments.classes.map((classData, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{classData.class.name}</h3>
                      <p className="text-gray-600 text-sm mb-3">{classData.class.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                          {classData.class.academic_year || 'No Year'}
                        </span>
                        {classData.zones.map((zone, zoneIndex) => (
                          <span key={zoneIndex} className={`inline-block px-2 py-1 text-xs rounded-full border ${getZoneColor(zone)}`}>
                            {zone.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="font-medium">Students:</span> {classData.student_count}
                      </div>
                      <div className="mb-2">
                        <span className="font-medium">Sections:</span> {classData.sections.length}
                      </div>
                      <button 
                        className="inline-flex items-center px-3 py-2 border border-blue-300 text-blue-700 text-sm rounded-md hover:bg-blue-50 transition-colors"
                        onClick={() => showClassStudents(classData)}
                      >
                        <FiUsers className="mr-1" />
                        Manage Students
                      </button>
                    </div>
                  </div>
                  
                  {/* Zone Distribution */}
                  {Object.keys(classData.zone_distribution).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="font-medium text-gray-700 mb-2">Zone Distribution:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(classData.zone_distribution).map(([zone, count]) => (
                          <span key={zone} className={`inline-block px-2 py-1 text-xs rounded-full border ${getZoneColor(zone)}`}>
                            {zone.toUpperCase()}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center">
              <FiBook className="mr-2" />
              No class assignments found
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Recent Activity */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold flex items-center">
            <FiActivity className="mr-2" />
            Recent Activity
          </h2>
        </Card.Header>
        <Card.Body>
          {profile.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {profile.recent_activity.map((activity, index) => (
                <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <div className="font-semibold text-gray-900">{activity.api_module}</div>
                      <div className="text-sm text-gray-600">{activity.api_endpoint}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full border ${
                        activity.response_status >= 200 && activity.response_status < 300
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {activity.response_status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-end">
                        <FiClock className="mr-1" />
                        {formatTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center">
              <FiActivity className="mr-2" />
              No recent activity
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Statistics */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold flex items-center">
            <FiActivity className="mr-2" />
            Statistics
          </h2>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{profile.statistics.total_assignments}</div>
              <div className="text-sm text-gray-600">Total Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{profile.statistics.unique_zones}</div>
              <div className="text-sm text-gray-600">Unique Zones</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{profile.statistics.avg_students_per_class}</div>
              <div className="text-sm text-gray-600">Avg Students/Class</div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Students Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <FiUsers className="mr-2" />
                Students - {selectedClass?.class?.name}
              </h3>
              <button 
                onClick={() => setShowStudentsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              {selectedClass && (
                <div>
                  {/* Zone Controls */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="font-medium">Total Students:</span> {selectedClass.student_count}
                    </div>
                    <div>
                      {!zoneUpdateMode ? (
                        <button 
                          className="inline-flex items-center px-3 py-2 border border-blue-300 text-blue-700 text-sm rounded-md hover:bg-blue-50 transition-colors"
                          onClick={() => setZoneUpdateMode(true)}
                        >
                          <FiEdit2 className="mr-1" />
                          Edit Zones
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                            onClick={() => handleZoneUpdate(selectedClass.class._id)}
                          >
                            Save Changes
                          </button>
                          <button 
                            className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                            onClick={() => {
                              setZoneUpdateMode(false);
                              setZoneUpdates({});
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="space-y-3">
                    {selectedClass.students.map((student, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="font-semibold text-gray-900">{student.full_name}</div>
                            <div className="text-sm text-gray-600">{student.roll_number}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{student.section}</div>
                          </div>
                          <div className="text-right">
                            {zoneUpdateMode ? (
                              <select
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                value={zoneUpdates[student.student_id] || student.zone || ''}
                                onChange={(e) => handleZoneChange(student.student_id, e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                <option value="blue">Blue</option>
                                <option value="red">Red</option>
                                <option value="green">Green</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getZoneColor(student.zone)}`}>
                                {(student.zone || 'unassigned').toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowStudentsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
