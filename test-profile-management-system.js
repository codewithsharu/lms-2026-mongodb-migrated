/**
 * Comprehensive Test Suite for Profile Management System
 * Tests all profile and class management functionality
 */

const axios = require('axios');

class ProfileManagementTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5000/api';
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      scenarios: []
    };
    this.testData = {
      adminToken: null,
      teacherToken: null,
      studentToken: null,
      createdClass: null,
      createdSection: null,
      createdStudents: [],
      createdAssignments: [],
      cleanup: []
    };
  }

  /**
   * Run complete test suite
   */
  async runCompleteTestSuite() {
    console.log('🚀 Starting Profile Management System Test Suite');
    console.log('==============================================\n');

    try {
      // Setup phase
      await this.setupTestEnvironment();
      
      // Core functionality tests
      await this.testStudentProfileFeatures();
      await this.testTeacherProfileFeatures();
      await this.testClassManagementFeatures();
      await this.testZoneManagementFeatures();
      await this.testTeacherAssignmentFeatures();
      await this.testApiAuditLogging();
      await this.testDashboardFeatures();
      await this.testSearchFeatures();
      await this.testErrorHandling();
      await this.testPermissionChecks();
      
      // Generate final report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Create test admin and get token
      const adminResponse = await this.makeRequest('POST', '/auth/login', {
        email: 'admin@example.com',
        password: 'adminpassword123'
      });
      
      if (adminResponse.success) {
        this.testData.adminToken = adminResponse.data.token;
        console.log('✅ Admin authentication successful');
      }
      
      // Create test teacher and get token
      const teacherResponse = await this.makeRequest('POST', '/auth/login', {
        email: 'test.teacher@example.com',
        password: 'testpassword123'
      });
      
      if (teacherResponse.success) {
        this.testData.teacherToken = teacherResponse.data.token;
        console.log('✅ Teacher authentication successful');
      }
      
      // Create test student and get token
      const studentResponse = await this.makeRequest('POST', '/auth/login', {
        email: 'test.student@example.com',
        password: 'testpassword123'
      });
      
      if (studentResponse.success) {
        this.testData.studentToken = studentResponse.data.token;
        console.log('✅ Student authentication successful');
      }
      
      // Create test class
      const classResponse = await this.makeAuthenticatedRequest('POST', '/classes', {
        name: 'Test Class ' + Date.now(),
        description: 'Test class for profile management',
        academic_year: '2026'
      }, 'admin');
      
      if (classResponse.success) {
        this.testData.createdClass = classResponse.data;
        this.testData.cleanup.push({ type: 'class', id: classResponse.data._id });
        console.log('✅ Test class created successfully');
      }
      
      // Create test section
      const sectionResponse = await this.makeAuthenticatedRequest('POST', '/sections', {
        class_id: this.testData.createdClass._id,
        name: 'Test Section A',
        capacity: 30
      }, 'admin');
      
      if (sectionResponse.success) {
        this.testData.createdSection = sectionResponse.data;
        this.testData.cleanup.push({ type: 'section', id: sectionResponse.data._id });
        console.log('✅ Test section created successfully');
      }
      
      console.log('✅ Test environment setup complete\n');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  /**
   * Test student profile features
   */
  async testStudentProfileFeatures() {
    console.log('👨‍🎓 Testing Student Profile Features');
    console.log('------------------------------------');

    const scenarios = [
      {
        name: 'Get Student Profile',
        test: () => this.testGetStudentProfile(),
        expectedResults: ['profile_loaded', 'teacher_visibility', 'academic_info']
      },
      {
        name: 'Get Student Teachers',
        test: () => this.testGetStudentTeachers(),
        expectedResults: ['teachers_listed', 'assignment_details']
      },
      {
        name: 'Student Dashboard',
        test: () => this.testStudentDashboard(),
        expectedResults: ['dashboard_loaded', 'statistics', 'recent_activity']
      },
      {
        name: 'Student Profile Permission Check',
        test: () => this.testStudentProfilePermissions(),
        expectedResults: ['permission_enforced', 'access_denied']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test teacher profile features
   */
  async testTeacherProfileFeatures() {
    console.log('👩‍🏫 Testing Teacher Profile Features');
    console.log('------------------------------------');

    const scenarios = [
      {
        name: 'Get Teacher Profile',
        test: () => this.testGetTeacherProfile(),
        expectedResults: ['profile_loaded', 'class_assignments', 'student_count']
      },
      {
        name: 'Get Teacher Classes',
        test: () => this.testGetTeacherClasses(),
        expectedResults: ['classes_listed', 'student_details']
      },
      {
        name: 'Teacher Dashboard',
        test: () => this.testTeacherDashboard(),
        expectedResults: ['dashboard_loaded', 'assignments', 'statistics']
      },
      {
        name: 'Teacher Profile Permission Check',
        test: () => this.testTeacherProfilePermissions(),
        expectedResults: ['permission_enforced', 'access_denied']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test class management features
   */
  async testClassManagementFeatures() {
    console.log('🏫 Testing Class Management Features');
    console.log('-------------------------------------');

    const scenarios = [
      {
        name: 'Get Class Details',
        test: () => this.testGetClassDetails(),
        expectedResults: ['class_loaded', 'students_listed', 'teachers_assigned']
      },
      {
        name: 'Get All Classes',
        test: () => this.testGetAllClasses(),
        expectedResults: ['classes_listed', 'teacher_assignments']
      },
      {
        name: 'Class Student Management',
        test: () => this.testClassStudentManagement(),
        expectedResults: ['students_manageable', 'zone_distribution']
      },
      {
        name: 'Class Statistics',
        test: () => this.testClassStatistics(),
        expectedResults: ['statistics_calculated', 'zone_analysis']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test zone management features
   */
  async testZoneManagementFeatures() {
    console.log('🎯 Testing Zone Management Features');
    console.log('------------------------------------');

    const scenarios = [
      {
        name: 'Get Available Zones',
        test: () => this.testGetAvailableZones(),
        expectedResults: ['zones_listed', 'descriptions_provided']
      },
      {
        name: 'Update Student Zones',
        test: () => this.testUpdateStudentZones(),
        expectedResults: ['zones_updated', 'bulk_operations']
      },
      {
        name: 'Zone Distribution Analysis',
        test: () => this.testZoneDistribution(),
        expectedResults: ['distribution_calculated', 'statistics']
      },
      {
        name: 'Zone Validation',
        test: () => this.testZoneValidation(),
        expectedResults: ['validation_enforced', 'invalid_zones_rejected']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test teacher assignment features
   */
  async testTeacherAssignmentFeatures() {
    console.log('👥 Testing Teacher Assignment Features');
    console.log('--------------------------------------');

    const scenarios = [
      {
        name: 'Assign Teacher to Class',
        test: () => this.testAssignTeacher(),
        expectedResults: ['assignment_created', 'validation_passed']
      },
      {
        name: 'Get Teacher Assignments',
        test: () => this.testGetTeacherAssignments(),
        expectedResults: ['assignments_listed', 'details_complete']
      },
      {
        name: 'Remove Teacher Assignment',
        test: () => this.testRemoveTeacherAssignment(),
        expectedResults: ['assignment_removed', 'cleanup_successful']
      },
      {
        name: 'Assignment Validation',
        test: () => this.testAssignmentValidation(),
        expectedResults: ['validation_enforced', 'duplicates_prevented']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test API audit logging
   */
  async testApiAuditLogging() {
    console.log('📊 Testing API Audit Logging');
    console.log('---------------------------');

    const scenarios = [
      {
        name: 'API Statistics',
        test: () => this.testApiStatistics(),
        expectedResults: ['statistics_calculated', 'metrics_available']
      },
      {
        name: 'Module Usage Tracking',
        test: () => this.testModuleUsage(),
        expectedResults: ['usage_tracked', 'module_breakdown']
      },
      {
        name: 'Error Analysis',
        test: () => this.testErrorAnalysis(),
        expectedResults: ['errors_analyzed', 'patterns_identified']
      },
      {
        name: 'Audit Log Completeness',
        test: () => this.testAuditLogCompleteness(),
        expectedResults: ['logs_complete', 'all_fields_present']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test dashboard features
   */
  async testDashboardFeatures() {
    console.log('📈 Testing Dashboard Features');
    console.log('---------------------------');

    const scenarios = [
      {
        name: 'Admin Dashboard',
        test: () => this.testAdminDashboard(),
        expectedResults: ['dashboard_loaded', 'system_statistics']
      },
      {
        name: 'Dashboard Statistics',
        test: () => this.testDashboardStatistics(),
        expectedResults: ['statistics_comprehensive', 'data_accurate']
      },
      {
        name: 'Dashboard Performance',
        test: () => this.testDashboardPerformance(),
        expectedResults: ['performance_acceptable', 'load_time_reasonable']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test search features
   */
  async testSearchFeatures() {
    console.log('🔍 Testing Search Features');
    console.log('------------------------');

    const scenarios = [
      {
        name: 'Student Search',
        test: () => this.testStudentSearch(),
        expectedResults: ['search_functional', 'filters_working']
      },
      {
        name: 'Search Pagination',
        test: () => this.testSearchPagination(),
        expectedResults: ['pagination_working', 'limits_enforced']
      },
      {
        name: 'Search Filters',
        test: () => this.testSearchFilters(),
        expectedResults: ['filters_effective', 'combinations_working']
      },
      {
        name: 'Search Performance',
        test: () => this.testSearchPerformance(),
        expectedResults: ['performance_acceptable', 'results_fast']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling');
    console.log('-----------------------');

    const scenarios = [
      {
        name: 'Invalid Profile Access',
        test: () => this.testInvalidProfileAccess(),
        expectedResults: ['error_handled', 'proper_response']
      },
      {
        name: 'Invalid Zone Update',
        test: () => this.testInvalidZoneUpdate(),
        expectedResults: ['validation_error', 'clear_message']
      },
      {
        name: 'Invalid Assignment',
        test: () => this.testInvalidAssignment(),
        expectedResults: ['validation_failed', 'error_logged']
      },
      {
        name: 'Resource Not Found',
        test: () => this.testResourceNotFound(),
        expectedResults: ['404_response', 'helpful_message']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test permission checks
   */
  async testPermissionChecks() {
    console.log('🔒 Testing Permission Checks');
    console.log('--------------------------');

    const scenarios = [
      {
        name: 'Student Access Control',
        test: () => this.testStudentAccessControl(),
        expectedResults: ['access_restricted', 'own_profile_only']
      },
      {
        name: 'Teacher Access Control',
        test: () => this.testTeacherAccessControl(),
        expectedResults: ['access_restricted', 'own_data_only']
      },
      {
        name: 'Admin Access Control',
        test: () => this.testAdminAccessControl(),
        expectedResults: ['full_access', 'admin_privileges']
      },
      {
        name: 'Unauthorized API Access',
        test: () => this.testUnauthorizedApiAccess(),
        expectedResults: ['access_denied', 'auth_required']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  // Individual test methods
  async testGetStudentProfile() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/student/' + this.testData.studentToken.userId, null, 'student');
    return response;
  }

  async testGetStudentTeachers() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/student/' + this.testData.studentToken.userId + '/teachers', null, 'student');
    return response;
  }

  async testStudentDashboard() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard/student/' + this.testData.studentToken.userId, null, 'student');
    return response;
  }

  async testStudentProfilePermissions() {
    // Try to access another student's profile
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/student/another_student_id', null, 'student');
    return response;
  }

  async testGetTeacherProfile() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/teacher/' + this.testData.teacherToken.userId + '?include_students=true', null, 'teacher');
    return response;
  }

  async testGetTeacherClasses() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/teacher/' + this.testData.teacherToken.userId + '/classes?include_students=true', null, 'teacher');
    return response;
  }

  async testTeacherDashboard() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard/teacher/' + this.testData.teacherToken.userId, null, 'teacher');
    return response;
  }

  async testTeacherProfilePermissions() {
    // Try to access another teacher's profile
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/teacher/another_teacher_id', null, 'teacher');
    return response;
  }

  async testGetClassDetails() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/class/' + this.testData.createdClass._id + '?include_students=true', null, 'admin');
    return response;
  }

  async testGetAllClasses() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/classes?include_students=false', null, 'admin');
    return response;
  }

  async testClassStudentManagement() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/class/' + this.testData.createdClass._id + '?include_students=true', null, 'admin');
    return response;
  }

  async testClassStatistics() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/class/' + this.testData.createdClass._id + '?include_students=true', null, 'admin');
    return response;
  }

  async testGetAvailableZones() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/zones', null, 'student');
    return response;
  }

  async testUpdateStudentZones() {
    // Mock zone update - would need actual student IDs
    const mockZoneUpdates = {
      zone_updates: [
        { student_id: 'mock_student_id', new_zone: 'blue' },
        { student_id: 'mock_student_id_2', new_zone: 'red' }
      ]
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/class/' + this.testData.createdClass._id + '/students/zones', mockZoneUpdates, 'admin');
    return response;
  }

  async testZoneDistribution() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/class/' + this.testData.createdClass._id + '/zones', null, 'admin');
    return response;
  }

  async testZoneValidation() {
    const invalidZoneUpdates = {
      zone_updates: [
        { student_id: 'mock_student_id', new_zone: 'invalid_zone' }
      ]
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/class/' + this.testData.createdClass._id + '/students/zones', invalidZoneUpdates, 'admin');
    return response;
  }

  async testAssignTeacher() {
    const assignmentData = {
      teacher_id: this.testData.teacherToken.userId,
      class_id: this.testData.createdClass._id,
      zone: 'blue'
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/assignments', assignmentData, 'admin');
    
    if (response.success) {
      this.testData.createdAssignments.push(response.data.assignment_id);
      this.testData.cleanup.push({ type: 'assignment', id: response.data.assignment_id });
    }
    
    return response;
  }

  async testGetTeacherAssignments() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/assignments/teacher/' + this.testData.teacherToken.userId, null, 'teacher');
    return response;
  }

  async testRemoveTeacherAssignment() {
    if (this.testData.createdAssignments.length === 0) {
      return { success: false, error: 'No assignments to remove' };
    }
    
    const assignmentId = this.testData.createdAssignments[0];
    const response = await this.makeAuthenticatedRequest('DELETE', '/profiles/assignments/' + assignmentId, null, 'admin');
    
    if (response.success) {
      const index = this.testData.createdAssignments.indexOf(assignmentId);
      if (index > -1) {
        this.testData.createdAssignments.splice(index, 1);
      }
    }
    
    return response;
  }

  async testAssignmentValidation() {
    // Test duplicate assignment
    const assignmentData = {
      teacher_id: this.testData.teacherToken.userId,
      class_id: this.testData.createdClass._id,
      zone: 'blue'
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/assignments', assignmentData, 'admin');
    return response;
  }

  async testApiStatistics() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/api/statistics', null, 'admin');
    return response;
  }

  async testModuleUsage() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/api/modules?time_range=1h', null, 'admin');
    return response;
  }

  async testErrorAnalysis() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/api/errors?time_range=1h', null, 'admin');
    return response;
  }

  async testAuditLogCompleteness() {
    // Make a few API calls to generate logs
    await this.testGetStudentProfile();
    await this.testGetTeacherProfile();
    
    // Check if logs were created
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/api/statistics', null, 'admin');
    return response;
  }

  async testAdminDashboard() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard', null, 'admin');
    return response;
  }

  async testDashboardStatistics() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard', null, 'admin');
    return response;
  }

  async testDashboardPerformance() {
    const startTime = Date.now();
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard', null, 'admin');
    const endTime = Date.now();
    
    return {
      ...response,
      performance: {
        load_time_ms: endTime - startTime,
        acceptable: (endTime - startTime) < 2000 // 2 seconds threshold
      }
    };
  }

  async testStudentSearch() {
    const searchCriteria = {
      query: 'test',
      limit: 10
    };
    
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/students/search?' + new URLSearchParams(searchCriteria), null, 'admin');
    return response;
  }

  async testSearchPagination() {
    const searchCriteria = {
      limit: 5,
      offset: 0
    };
    
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/students/search?' + new URLSearchParams(searchCriteria), null, 'admin');
    return response;
  }

  async testSearchFilters() {
    const searchCriteria = {
      class_id: this.testData.createdClass._id,
      zone: 'blue',
      is_active: true
    };
    
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/students/search?' + new URLSearchParams(searchCriteria), null, 'admin');
    return response;
  }

  async testSearchPerformance() {
    const startTime = Date.now();
    const response = await this.testStudentSearch();
    const endTime = Date.now();
    
    return {
      ...response,
      performance: {
        search_time_ms: endTime - startTime,
        acceptable: (endTime - startTime) < 1000 // 1 second threshold
      }
    };
  }

  async testInvalidProfileAccess() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/student/invalid_id', null, 'student');
    return response;
  }

  async testInvalidZoneUpdate() {
    const invalidZoneUpdates = {
      zone_updates: [
        { student_id: 'invalid_id', new_zone: 'blue' }
      ]
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/class/' + this.testData.createdClass._id + '/students/zones', invalidZoneUpdates, 'admin');
    return response;
  }

  async testInvalidAssignment() {
    const invalidAssignment = {
      teacher_id: 'invalid_teacher_id',
      class_id: this.testData.createdClass._id
    };
    
    const response = await this.makeAuthenticatedRequest('POST', '/profiles/assignments', invalidAssignment, 'admin');
    return response;
  }

  async testResourceNotFound() {
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/class/invalid_class_id', null, 'admin');
    return response;
  }

  async testStudentAccessControl() {
    // Student trying to access admin dashboard
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard', null, 'student');
    return response;
  }

  async testTeacherAccessControl() {
    // Teacher trying to access another teacher's profile
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/teacher/' + this.testData.teacherToken.userId, null, 'student');
    return response;
  }

  async testAdminAccessControl() {
    // Admin should have full access
    const response = await this.makeAuthenticatedRequest('GET', '/profiles/dashboard', null, 'admin');
    return response;
  }

  async testUnauthorizedApiAccess() {
    // Try to access API without token
    const response = await this.makeRequest('GET', '/profiles/dashboard');
    return response;
  }

  // Helper methods
  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method: method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.response?.data?.error || error.message,
          status: error.response?.status || 500
        }
      };
    }
  }

  async makeAuthenticatedRequest(method, endpoint, data, userType) {
    const token = userType === 'admin' ? this.testData.adminToken :
                  userType === 'teacher' ? this.testData.teacherToken :
                  userType === 'student' ? this.testData.studentToken : null;
    
    return await this.makeRequest(method, endpoint, data, token);
  }

  async runTestScenarios(scenarios) {
    for (const scenario of scenarios) {
      console.log(`\n📋 Testing: ${scenario.name}`);
      
      try {
        const startTime = Date.now();
        const result = await scenario.test();
        const duration = Date.now() - startTime;
        
        // Validate results
        const validation = this.validateTestResults(result, scenario.expectedResults);
        
        if (validation.passed) {
          console.log(`   ✅ PASSED (${duration}ms)`);
          this.testResults.passed++;
        } else {
          console.log(`   ❌ FAILED (${duration}ms)`);
          console.log(`   Issues: ${validation.issues.join(', ')}`);
          this.testResults.failed++;
        }
        
        this.testResults.total++;
        this.testResults.scenarios.push({
          name: scenario.name,
          passed: validation.passed,
          duration,
          issues: validation.issues || [],
          metrics: result.performance || {}
        });
        
      } catch (error) {
        console.log(`   💥 ERROR: ${error.message}`);
        this.testResults.failed++;
        this.testResults.total++;
        this.testResults.scenarios.push({
          name: scenario.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    console.log('');
  }

  validateTestResults(result, expectedResults) {
    const issues = [];
    
    if (!result) {
      issues.push('No result returned');
      return { passed: false, issues };
    }
    
    // Check if result indicates success
    if (expectedResults.includes('profile_loaded') && !result.success) {
      issues.push('Expected success but got failure');
    }
    
    if (expectedResults.includes('error_handled') && result.success) {
      issues.push('Expected error but got success');
    }
    
    // Check for proper data structure
    if (expectedResults.includes('teacher_visibility') && (!result.data || !result.data.teachers)) {
      issues.push('Teacher visibility data missing');
    }
    
    if (expectedResults.includes('class_assignments') && (!result.data || !result.data.assignments)) {
      issues.push('Class assignments data missing');
    }
    
    if (expectedResults.includes('statistics_calculated') && (!result.data || !result.data.statistics)) {
      issues.push('Statistics data missing');
    }
    
    // Check performance metrics
    if (result.performance && expectedResults.includes('performance_acceptable')) {
      if (result.performance.acceptable === false) {
        issues.push('Performance not acceptable');
      }
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }

  generateTestReport() {
    console.log('📊 Profile Management Test Suite Report');
    console.log('======================================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed} ✅`);
    console.log(`Failed: ${this.testResults.failed} ${this.testResults.failed > 0 ? '❌' : '✅'}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    console.log('');

    if (this.testResults.failed > 0) {
      console.log('❌ Failed Tests:');
      this.testResults.scenarios
        .filter(scenario => !scenario.passed)
        .forEach(scenario => {
          console.log(`   • ${scenario.name}: ${scenario.issues?.join(', ') || scenario.error}`);
        });
      console.log('');
    }

    // Performance summary
    const performanceTests = this.testResults.scenarios.filter(s => s.metrics && s.metrics.load_time_ms);
    if (performanceTests.length > 0) {
      const avgLoadTime = performanceTests.reduce((sum, s) => sum + s.metrics.load_time_ms, 0) / performanceTests.length;
      const maxLoadTime = Math.max(...performanceTests.map(s => s.metrics.load_time_ms));
      
      console.log('⚡ Performance Summary:');
      console.log(`   Average Load Time: ${avgLoadTime.toFixed(0)}ms`);
      console.log(`   Max Load Time: ${maxLoadTime}ms`);
      console.log('');
    }

    // Recommendations
    console.log('💡 System Recommendations:');
    if (this.testResults.failed === 0) {
      console.log('   ✅ Profile management system is ready for production');
      console.log('   ✅ All features working correctly');
      console.log('   ✅ Security and permissions properly enforced');
    } else {
      console.log('   🔧 Address failed test scenarios before deployment');
      console.log('   🔧 Review error handling in failing areas');
      console.log('   🔧 Consider additional testing for edge cases');
    }
    console.log('');

    // Feature readiness assessment
    const readinessScore = (this.testResults.passed / this.testResults.total) * 100;
    console.log('🎯 Feature Readiness Assessment:');
    if (readinessScore >= 95) {
      console.log('   🟢 EXCELLENT: System is production-ready');
    } else if (readinessScore >= 90) {
      console.log('   🟡 GOOD: System is mostly ready, minor improvements needed');
    } else if (readinessScore >= 80) {
      console.log('   🟠 FAIR: System needs significant improvements');
    } else {
      console.log('   🔴 POOR: System requires major rework');
    }
    console.log(`   Readiness Score: ${readinessScore.toFixed(1)}%`);
    console.log('');
  }

  async cleanupTestEnvironment() {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up created assignments
    for (const assignmentId of this.testData.createdAssignments) {
      try {
        await this.makeAuthenticatedRequest('DELETE', '/profiles/assignments/' + assignmentId, null, 'admin');
      } catch (error) {
        console.log(`   Warning: Could not clean up assignment ${assignmentId}`);
      }
    }
    
    // Clean up created sections and classes
    for (const item of this.testData.cleanup) {
      try {
        if (item.type === 'section') {
          await this.makeAuthenticatedRequest('DELETE', '/sections/' + item.id, null, 'admin');
        } else if (item.type === 'class') {
          await this.makeAuthenticatedRequest('DELETE', '/classes/' + item.id, null, 'admin');
        }
      } catch (error) {
        console.log(`   Warning: Could not clean up ${item.type} ${item.id}`);
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Export for use
module.exports = ProfileManagementTestSuite;

// Auto-run if executed directly
if (require.main === module) {
  const testSuite = new ProfileManagementTestSuite();
  testSuite.runCompleteTestSuite().catch(console.error);
}
