/**
 * Profile Management Routes
 * Enterprise-level profile and class management with audit logging
 */

const express = require('express');
const { verifyToken, hasRole } = require('../middleware/auth');
const profileManagementService = require('../services/profileManagementService');
const auditService = require('../services/auditService');

const router = express.Router();

// Middleware for API audit logging
const auditApiCall = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request info for audit
  req.auditInfo = {
    requestId,
    startTime,
    module: 'profiles',
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role
  };
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log API call
    auditService.logAction({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      actionType: 'api_call',
      resourceType: 'API',
      resourceId: requestId,
      apiEndpoint: req.originalUrl,
      httpMethod: req.method,
      requestBody: req.method !== 'GET' ? req.body : null,
      responseStatus: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      performance: {
        duration_ms: duration,
        request_timestamp: new Date(startTime),
        response_timestamp: new Date(endTime)
      },
      business_context: {
        operation_type: req.method === 'GET' ? 'read' : 
                         req.method === 'POST' ? 'create' :
                         req.method === 'PUT' ? 'update' : 'delete',
        resource_type: 'profile',
        api_module: 'profiles'
      },
      security: {
        authentication_method: 'jwt',
        authorization_status: res.statusCode < 400 ? 'granted' : 'denied'
      },
      network: {
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    });
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Apply audit middleware to all routes
router.use(auditApiCall);

// ========================================
// STUDENT PROFILE ENDPOINTS
// ========================================

/**
 * GET /api/profiles/student/:studentId
 * Get student profile with teacher visibility
 */
router.get('/student/:studentId', verifyToken, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user.id;
    
    // Students can only view their own profile, teachers can view their assigned students
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own profile'
      });
    }
    
    const result = await profileManagementService.getStudentProfile(studentId, requestingUserId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/student/:studentId/teachers
 * Get teachers assigned to a student
 */
router.get('/student/:studentId/teachers', verifyToken, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    // Students can only view their own teachers
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own teacher assignments'
      });
    }
    
    const studentProfile = await profileManagementService.getStudentProfile(studentId);
    
    if (!studentProfile.success) {
      return res.status(404).json(studentProfile);
    }
    
    res.json({
      success: true,
      data: {
        student_id: studentId,
        teachers: studentProfile.data.teachers,
        statistics: studentProfile.data.statistics
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// TEACHER PROFILE ENDPOINTS
// ========================================

/**
 * GET /api/profiles/teacher/:teacherId
 * Get teacher profile with class and student management
 */
router.get('/teacher/:teacherId', verifyToken, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const includeStudents = req.query.include_students === 'true';
    
    // Teachers can only view their own profile, admins can view any
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own profile'
      });
    }
    
    const result = await profileManagementService.getTeacherProfile(teacherId, includeStudents);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/teacher/:teacherId/classes
 * Get classes assigned to a teacher
 */
router.get('/teacher/:teacherId/classes', verifyToken, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const includeStudents = req.query.include_students === 'true';
    
    // Teachers can only view their own classes
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own class assignments'
      });
    }
    
    const teacherProfile = await profileManagementService.getTeacherProfile(teacherId, includeStudents);
    
    if (!teacherProfile.success) {
      return res.status(404).json(teacherProfile);
    }
    
    res.json({
      success: true,
      data: {
        teacher_id: teacherId,
        classes: teacherProfile.data.assignments.classes,
        statistics: teacherProfile.data.assignments
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// CLASS MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/profiles/class/:classId
 * Get class details with student list and zone management
 */
router.get('/class/:classId', verifyToken, async (req, res, next) => {
  try {
    const { classId } = req.params;
    const includeStudents = req.query.include_students !== 'false'; // Default to true
    
    const result = await profileManagementService.getClassDetails(classId, includeStudents, req.user.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/classes
 * Get all classes with teacher assignments
 */
router.get('/classes', verifyToken, async (req, res, next) => {
  try {
    const includeStudents = req.query.include_students === 'true';
    
    const result = await profileManagementService.getAllClassesWithTeachers(includeStudents);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/profiles/class/:classId/students/zones
 * Update student zones in bulk
 */
router.post('/class/:classId/students/zones', verifyToken, hasRole('teacher', 'admin'), async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { zone_updates } = req.body;
    
    if (!Array.isArray(zone_updates) || zone_updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'zone_updates must be a non-empty array'
      });
    }
    
    // Validate zone updates format
    const isValid = zone_updates.every(update => 
      update.student_id && 
      typeof update.new_zone === 'string'
    );
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Each zone update must contain student_id and new_zone'
      });
    }
    
    const result = await profileManagementService.updateStudentZones(
      classId, 
      zone_updates, 
      req.user.id
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ========================================
// TEACHER ASSIGNMENT ENDPOINTS
// ========================================

/**
 * POST /api/profiles/assignments
 * Assign teacher to class/section with zone
 */
router.post('/assignments', verifyToken, hasRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const assignmentData = {
      teacher_id: req.body.teacher_id,
      class_id: req.body.class_id,
      section_id: req.body.section_id,
      zone: req.body.zone
    };
    
    // Validate required fields
    if (!assignmentData.teacher_id || !assignmentData.class_id) {
      return res.status(400).json({
        success: false,
        error: 'teacher_id and class_id are required'
      });
    }
    
    const result = await profileManagementService.assignTeacher(assignmentData, req.user.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/profiles/assignments/:assignmentId
 * Remove teacher assignment
 */
router.delete('/assignments/:assignmentId', verifyToken, hasRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    
    const result = await profileManagementService.removeTeacherAssignment(assignmentId, req.user.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/assignments/teacher/:teacherId
 * Get teacher's assignments
 */
router.get('/assignments/teacher/:teacherId', verifyToken, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    
    // Teachers can only view their own assignments
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own assignments'
      });
    }
    
    const teacherProfile = await profileManagementService.getTeacherProfile(teacherId, false);
    
    if (!teacherProfile.success) {
      return res.status(404).json(teacherProfile);
    }
    
    res.json({
      success: true,
      data: {
        teacher_id: teacherId,
        assignments: teacherProfile.data.assignments.classes
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// STUDENT SEARCH ENDPOINTS
// ========================================

/**
 * GET /api/profiles/students/search
 * Search students by various criteria
 */
router.get('/students/search', verifyToken, async (req, res, next) => {
  try {
    const searchCriteria = {
      query: req.query.query,
      class_id: req.query.class_id,
      section_id: req.query.section_id,
      zone: req.query.zone,
      is_active: req.query.is_active !== 'false',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };
    
    const result = await profileManagementService.searchStudents(searchCriteria, req.user.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ========================================
// API MONITORING ENDPOINTS
// ========================================

/**
 * GET /api/profiles/api/statistics
 * Get API usage statistics
 */
router.get('/api/statistics', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      apiModule: req.query.api_module,
      userId: req.query.user_id,
      riskLevel: req.query.risk_level,
      operationType: req.query.operation_type
    };
    
    const result = await profileManagementService.getApiUsageStatistics(filters);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/api/modules
 * Get module usage breakdown
 */
router.get('/api/modules', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const timeRange = req.query.time_range || '24h';
    
    const result = await profileManagementService.getModuleUsage(timeRange);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/api/errors
 * Get error analysis
 */
router.get('/api/errors', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const timeRange = req.query.time_range || '24h';
    
    const result = await profileManagementService.getErrorAnalysis(timeRange);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ========================================
// DASHBOARD ENDPOINTS
// ========================================

/**
 * GET /api/profiles/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', verifyToken, hasRole('admin'), async (req, res, next) => {
  try {
    const result = await profileManagementService.getDashboardStatistics();
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/dashboard/teacher/:teacherId
 * Get teacher dashboard
 */
router.get('/dashboard/teacher/:teacherId', verifyToken, async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    
    // Teachers can only view their own dashboard
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own dashboard'
      });
    }
    
    const teacherProfile = await profileManagementService.getTeacherProfile(teacherId, true);
    
    if (!teacherProfile.success) {
      return res.status(404).json(teacherProfile);
    }
    
    res.json({
      success: true,
      data: {
        teacher: teacherProfile.data.user,
        assignments: teacherProfile.data.assignments,
        recent_activity: teacherProfile.data.recent_activity,
        statistics: teacherProfile.data.statistics
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/dashboard/student/:studentId
 * Get student dashboard
 */
router.get('/dashboard/student/:studentId', verifyToken, async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    // Students can only view their own dashboard
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own dashboard'
      });
    }
    
    const studentProfile = await profileManagementService.getStudentProfile(studentId);
    
    if (!studentProfile.success) {
      return res.status(404).json(studentProfile);
    }
    
    res.json({
      success: true,
      data: {
        student: studentProfile.data.user,
        academic_info: studentProfile.data.academic_info,
        teachers: studentProfile.data.teachers,
        recent_activity: studentProfile.data.recent_activity,
        statistics: studentProfile.data.statistics
      }
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// ZONE MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/profiles/zones
 * Get all available zones
 */
router.get('/zones', verifyToken, async (req, res, next) => {
  try {
    const zones = ['blue', 'red', 'green'];
    
    // Get zone distribution
    const zoneStats = await profileManagementService.getClassDetails(null, false);
    
    res.json({
      success: true,
      data: {
        available_zones: zones,
        description: {
          blue: 'Blue zone - Standard track',
          red: 'Red zone - Advanced track',
          green: 'Green zone - Remedial track'
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/profiles/class/:classId/zones
 * Get zone distribution for a class
 */
router.get('/class/:classId/zones', verifyToken, async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    const classDetails = await profileManagementService.getClassDetails(classId, true);
    
    if (!classDetails.success) {
      return res.status(404).json(classDetails);
    }
    
    res.json({
      success: true,
      data: {
        class_id: classId,
        zone_distribution: classDetails.data.students.zone_distribution,
        total_students: classDetails.data.students.total_count
      }
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Profile management error:', error);
  
  // Log error for audit
  auditService.logAction({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    actionType: 'system_error',
    resourceType: 'API',
    resourceId: req.auditInfo?.requestId,
    apiEndpoint: req.originalUrl,
    httpMethod: req.method,
    responseStatus: 500,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    errorInfo: {
      error_occurred: true,
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack
    }
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    request_id: req.auditInfo?.requestId
  });
});

module.exports = router;
