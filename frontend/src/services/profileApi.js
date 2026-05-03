/**
 * Profile API Service
 * Handles all profile and class management API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const profileApi = {
  // Student Profile APIs
  getStudentProfile: async (studentId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/student/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getStudentTeachers: async (studentId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/student/${studentId}/teachers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Teacher Profile APIs
  getTeacherProfile: async (teacherId, includeStudents = false) => {
    const response = await fetch(`${API_BASE_URL}/profiles/teacher/${teacherId}?include_students=${includeStudents}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getTeacherClasses: async (teacherId, includeStudents = false) => {
    const response = await fetch(`${API_BASE_URL}/profiles/teacher/${teacherId}/classes?include_students=${includeStudents}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Class Management APIs
  getClassDetails: async (classId, includeStudents = true) => {
    const response = await fetch(`${API_BASE_URL}/profiles/class/${classId}?include_students=${includeStudents}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getAllClasses: async (includeStudents = false) => {
    const response = await fetch(`${API_BASE_URL}/profiles/classes?include_students=${includeStudents}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  updateStudentZones: async (classId, zoneUpdates) => {
    const response = await fetch(`${API_BASE_URL}/profiles/class/${classId}/students/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(zoneUpdates)
    });
    return response.json();
  },

  // Teacher Assignment APIs
  assignTeacher: async (assignmentData) => {
    const response = await fetch(`${API_BASE_URL}/profiles/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(assignmentData)
    });
    return response.json();
  },

  removeTeacherAssignment: async (assignmentId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getTeacherAssignments: async (teacherId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/assignments/teacher/${teacherId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Student Search APIs
  searchStudents: async (criteria) => {
    const params = new URLSearchParams();
    
    if (criteria.query) params.append('query', criteria.query);
    if (criteria.class_id) params.append('class_id', criteria.class_id);
    if (criteria.section_id) params.append('section_id', criteria.section_id);
    if (criteria.zone) params.append('zone', criteria.zone);
    if (criteria.is_active !== undefined) params.append('is_active', criteria.is_active);
    if (criteria.limit) params.append('limit', criteria.limit);
    if (criteria.offset) params.append('offset', criteria.offset);

    const response = await fetch(`${API_BASE_URL}/profiles/students/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // API Monitoring APIs (Admin only)
  getApiStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.apiModule) params.append('api_module', filters.apiModule);
    if (filters.userId) params.append('user_id', filters.userId);
    if (filters.riskLevel) params.append('risk_level', filters.riskLevel);
    if (filters.operationType) params.append('operation_type', filters.operationType);

    const response = await fetch(`${API_BASE_URL}/profiles/api/statistics?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getModuleUsage: async (timeRange = '24h') => {
    const response = await fetch(`${API_BASE_URL}/profiles/api/modules?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getErrorAnalysis: async (timeRange = '24h') => {
    const response = await fetch(`${API_BASE_URL}/profiles/api/errors?time_range=${timeRange}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Dashboard APIs
  getDashboardStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/profiles/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getTeacherDashboard: async (teacherId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/dashboard/teacher/${teacherId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getStudentDashboard: async (studentId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/dashboard/student/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Zone Management APIs
  getAvailableZones: async () => {
    const response = await fetch(`${API_BASE_URL}/profiles/zones`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  getClassZoneDistribution: async (classId) => {
    const response = await fetch(`${API_BASE_URL}/profiles/class/${classId}/zones`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  }
};

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Error handling wrapper
const withErrorHandling = async (apiCall, errorMessage = 'API call failed') => {
  try {
    const response = await apiCall();
    
    if (!response.success) {
      throw new Error(response.error || errorMessage);
    }
    
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Enhanced API methods with error handling
const enhancedProfileApi = {
  ...profileApi,
  
  // Wrapped methods with error handling
  getStudentProfile: async (studentId) => {
    return withErrorHandling(() => profileApi.getStudentProfile(studentId), 'Failed to load student profile');
  },
  
  getTeacherProfile: async (teacherId, includeStudents = false) => {
    return withErrorHandling(() => profileApi.getTeacherProfile(teacherId, includeStudents), 'Failed to load teacher profile');
  },
  
  getClassDetails: async (classId, includeStudents = true) => {
    return withErrorHandling(() => profileApi.getClassDetails(classId, includeStudents), 'Failed to load class details');
  },
  
  updateStudentZones: async (classId, zoneUpdates) => {
    return withErrorHandling(() => profileApi.updateStudentZones(classId, zoneUpdates), 'Failed to update student zones');
  },
  
  searchStudents: async (criteria) => {
    return withErrorHandling(() => profileApi.searchStudents(criteria), 'Failed to search students');
  },
  
  assignTeacher: async (assignmentData) => {
    return withErrorHandling(() => profileApi.assignTeacher(assignmentData), 'Failed to assign teacher');
  },
  
  removeTeacherAssignment: async (assignmentId) => {
    return withErrorHandling(() => profileApi.removeTeacherAssignment(assignmentId), 'Failed to remove teacher assignment');
  }
};

export default enhancedProfileApi;
