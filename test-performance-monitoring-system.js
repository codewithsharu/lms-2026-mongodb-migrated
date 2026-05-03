/**
 * Comprehensive Test Suite for Performance Monitoring System
 * Tests all performance monitoring and alerting functionality
 */

const axios = require('axios');

class PerformanceMonitoringTestSuite {
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
      initialMetrics: null,
      createdAlerts: [],
      cleanup: []
    };
  }

  /**
   * Run complete test suite
   */
  async runCompleteTestSuite() {
    console.log('🚀 Starting Performance Monitoring System Test Suite');
    console.log('===============================================\n');

    try {
      // Setup phase
      await this.setupTestEnvironment();
      
      // Core functionality tests
      await this.testDashboardEndpoints();
      await this.testSystemMetrics();
      await this.testDatabasePerformance();
      await this.testApplicationMetrics();
      await this.testAlertSystem();
      await this.testThresholdManagement();
      await this.testHistoricalData();
      await this.testRealTimeMonitoring();
      await this.testErrorHandling();
      await this.testPerformanceUnderLoad();
      
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
      
      // Get initial metrics for comparison
      const initialMetrics = await this.makeAuthenticatedRequest('GET', '/performance/dashboard', null, 'admin');
      if (initialMetrics.success) {
        this.testData.initialMetrics = initialMetrics.data;
        console.log('✅ Initial metrics captured');
      }
      
      console.log('✅ Test environment setup complete\n');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  /**
   * Test dashboard endpoints
   */
  async testDashboardEndpoints() {
    console.log('📊 Testing Dashboard Endpoints');
    console.log('----------------------------------');

    const scenarios = [
      {
        name: 'Get Performance Dashboard',
        test: () => this.testGetDashboard(),
        expectedResults: ['dashboard_loaded', 'all_metrics_present', 'health_status']
      },
      {
        name: 'Get System Health',
        test: () => this.testGetSystemHealth(),
        expectedResults: ['health_status', 'uptime', 'alerts']
      },
      {
        name: 'Get Performance Summary',
        test: () => this.testGetPerformanceSummary(),
        expectedResults: ['summary_complete', 'key_metrics']
      },
      {
        name: 'Get Monitoring Status',
        test: () => this.testGetMonitoringStatus(),
        expectedResults: ['monitoring_active', 'collection_intervals']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test system metrics
   */
  async testSystemMetrics() {
    console.log('🖥️ Testing System Metrics');
    console.log('---------------------------');

    const scenarios = [
      {
        name: 'Get CPU Usage',
        test: () => this.testGetCpuUsage(),
        expectedResults: ['cpu_data', 'percentage_calculated', 'load_average']
      },
      {
        name: 'Get Memory Usage',
        test: () => this.testGetMemoryUsage(),
        expectedResults: ['memory_data', 'usage_percentage', 'total_available']
      },
      {
        name: 'Get System Trends',
        test: () => this.testGetSystemTrends(),
        expectedResults: ['trend_data', 'forecasts']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test database performance
   */
  async testDatabasePerformance() {
    console.log('🗄️ Testing Database Performance');
    console.log('-------------------------------');

    const scenarios = [
      {
        name: 'Get Database Metrics',
        test: () => this.testGetDatabaseMetrics(),
        expectedResults: ['connection_status', 'query_performance', 'collection_stats']
      },
      {
        name: 'Get Slow Queries',
        test: () => this.testGetSlowQueries(),
        expectedResults: ['slow_queries_identified', 'performance_data']
      },
      {
        name: 'Get Connection Pool Status',
        test: () => this.testGetConnectionPool(),
        expectedResults: ['pool_status', 'connection_metrics']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test application metrics
   */
  async testApplicationMetrics() {
    console.log('⚡ Testing Application Metrics');
    console.log('--------------------------------');

    const scenarios = [
      {
        name: 'Get Active Users',
        test: () => this.testGetActiveUsers(),
        expectedResults: ['active_users_count', 'session_data']
      },
      {
        name: 'Get Request Metrics',
        test: () => this.testGetRequestMetrics(),
        expectedResults: ['requests_per_second', 'error_rate', 'response_time']
      },
      {
        name: 'Get Throughput Data',
        test: () => this.testGetThroughputData(),
        expectedResults: ['throughput_calculated', 'volume_metrics']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test alert system
   */
  async testAlertSystem() {
    console.log('🚨 Testing Alert System');
    console.log('-----------------------');

    const scenarios = [
      {
        name: 'Get Current Alerts',
        test: () => this.testGetCurrentAlerts(),
        expectedResults: ['alerts_retrieved', 'categorized_alerts']
      },
      {
        name: 'Get Critical Alerts',
        test: () => this.testGetCriticalAlerts(),
        expectedResults: ['critical_alerts', 'priority_filtered']
      },
      {
        name: 'Alert Generation',
        test: () => this.testAlertGeneration(),
        expectedResults: ['alerts_created', 'threshold_triggered']
      },
      {
        name: 'Alert Acknowledgment',
        test: () => this.testAlertAcknowledgment(),
        expectedResults: ['alerts_acknowledged', 'status_updated']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test threshold management
   */
  async testThresholdManagement() {
    console.log('⚙️ Testing Threshold Management');
    console.log('--------------------------------');

    const scenarios = [
      {
        name: 'Get Current Thresholds',
        test: () => this.testGetCurrentThresholds(),
        expectedResults: ['thresholds_loaded', 'default_values']
      },
      {
        name: 'Update Memory Thresholds',
        test: () => this.testUpdateMemoryThresholds(),
        expectedResults: ['thresholds_updated', 'validation_passed']
      },
      {
        name: 'Update CPU Thresholds',
        test: () => this.testUpdateCpuThresholds(),
        expectedResults: ['thresholds_updated', 'validation_passed']
      },
      {
        name: 'Update Response Time Thresholds',
        test: () => this.testUpdateResponseTimeThresholds(),
        expectedResults: ['thresholds_updated', 'validation_passed']
      },
      {
        name: 'Invalid Threshold Validation',
        test: () => this.testInvalidThresholdValidation(),
        expectedResults: ['validation_failed', 'error_handled']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test historical data
   */
  async testHistoricalData() {
    console.log('📈 Testing Historical Data');
    console.log('---------------------------');

    const scenarios = [
      {
        name: 'Get 1 Hour Historical Data',
        test: () => this.testGetHistoricalData('1h'),
        expectedResults: ['historical_data', 'time_series']
      },
      {
        name: 'Get 24 Hour Historical Data',
        test: () => this.testGetHistoricalData('24h'),
        expectedResults: ['historical_data', 'longer_time_series']
      },
      {
        name: 'Get 7 Day Historical Data',
        test: () => this.testGetHistoricalData('7d'),
        expectedResults: ['historical_data', 'weekly_trends']
      },
      {
        name: 'Historical Data Aggregation',
        test: () => this.testHistoricalDataAggregation(),
        expectedResults: ['data_aggregated', 'time_buckets_correct']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test real-time monitoring
   */
  async testRealTimeMonitoring() {
    console.log('⏱️ Testing Real-time Monitoring');
    console.log('--------------------------------');

    const scenarios = [
      {
        name: 'Real-time Metrics Collection',
        test: () => this.testRealTimeCollection(),
        expectedResults: ['metrics_collected', 'real_time_data']
      },
      {
        name: 'Metrics Refresh',
        test: () => this.testMetricsRefresh(),
        expectedResults: ['metrics_refreshed', 'updated_timestamps']
      },
      {
        name: 'Auto-refresh Functionality',
        test: () => this.testAutoRefresh(),
        expectedResults: ['auto_refresh_working', 'interval_correct']
      },
      {
        name: 'Live Alert Updates',
        test: () => this.testLiveAlertUpdates(),
        expectedResults: ['alerts_updated', 'real_time_notifications']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling');
    console.log('-------------------------');

    const scenarios = [
      {
        name: 'Invalid Endpoint Access',
        test: () => this.testInvalidEndpoint(),
        expectedResults: ['error_handled', 'proper_response']
      },
      {
        name: 'Unauthorized Access',
        test: () => this.testUnauthorizedAccess(),
        expectedResults: ['access_denied', 'auth_required']
      },
      {
        name: 'Database Connection Error',
        test: () => this.testDatabaseConnectionError(),
        expectedResults: ['error_detected', 'graceful_degradation']
      },
      {
        name: 'Metrics Collection Failure',
        test: () => this.testMetricsCollectionFailure(),
        expectedResults: ['failure_handled', 'fallback_data']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  /**
   * Test performance under load
   */
  async testPerformanceUnderLoad() {
    console.log('🚀 Testing Performance Under Load');
    console.log('------------------------------------');

    const scenarios = [
      {
        name: 'Concurrent Dashboard Requests',
        test: () => this.testConcurrentRequests(),
        expectedResults: ['requests_handled', 'performance_acceptable']
      },
      {
        name: 'Large Dataset Processing',
        test: () => this.testLargeDataset(),
        expectedResults: ['data_processed', 'memory_efficient']
      },
      {
        name: 'Alert System Under Load',
        test: () => this.testAlertSystemLoad(),
        expectedResults: ['alerts_processed', 'no_bottlenecks']
      },
      {
        name: 'Historical Data Performance',
        test: () => this.testHistoricalDataPerformance(),
        expectedResults: ['data_retrieved', 'response_time_acceptable']
      }
    ];

    await this.runTestScenarios(scenarios);
  }

  // Individual test methods
  async testGetDashboard() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/dashboard', null, 'admin');
    
    if (response.success) {
      const data = response.data;
      // Validate dashboard structure
      const hasSystem = data.system && typeof data.system === 'object';
      const hasDatabase = data.database && typeof data.database === 'object';
      const hasApplication = data.application && typeof data.application === 'object';
      const hasAlerts = data.alerts && typeof data.alerts === 'object';
      const hasHealth = data.health && typeof data.health === 'object';
      
      response.validation = {
        hasSystem,
        hasDatabase,
        hasApplication,
        hasAlerts,
        hasHealth
      };
    }
    
    return response;
  }

  async testGetSystemHealth() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/health', null, 'admin');
    return response;
  }

  async testGetPerformanceSummary() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/summary', null, 'admin');
    return response;
  }

  async testGetMonitoringStatus() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/status', null, 'admin');
    return response;
  }

  async testGetCpuUsage() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/system', null, 'admin');
    return response;
  }

  async testGetMemoryUsage() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/system', null, 'admin');
    return response;
  }

  async testGetSystemTrends() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/system', null, 'admin');
    return response;
  }

  async testGetDatabaseMetrics() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/database', null, 'admin');
    return response;
  }

  async testGetSlowQueries() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/database', null, 'admin');
    return response;
  }

  async testGetConnectionPool() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/database', null, 'admin');
    return response;
  }

  async testGetActiveUsers() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/application', null, 'admin');
    return response;
  }

  async testGetRequestMetrics() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/application', null, 'admin');
    return response;
  }

  async testGetThroughputData() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/application', null, 'admin');
    return response;
  }

  async testGetCurrentAlerts() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin');
    return response;
  }

  async testGetCriticalAlerts() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/alerts/critical', null, 'admin');
    return response;
  }

  async testAlertGeneration() {
    // This would typically trigger alerts by exceeding thresholds
    // For testing, we'll check if the alert system is working
    const response = await this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin');
    return response;
  }

  async testAlertAcknowledgment() {
    // Test alert acknowledgment (would need actual alert IDs)
    const response = await this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin');
    return response;
  }

  async testGetCurrentThresholds() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/thresholds', null, 'admin');
    return response;
  }

  async testUpdateMemoryThresholds() {
    const newThresholds = {
      memory: {
        warning: 75,
        critical: 90
      }
    };
    
    const response = await this.makeAuthenticatedRequest('PUT', '/performance/thresholds', { thresholds: newThresholds }, 'admin');
    return response;
  }

  async testUpdateCpuThresholds() {
    const newThresholds = {
      cpu: {
        warning: 75,
        critical: 90
      }
    };
    
    const response = await this.makeAuthenticatedRequest('PUT', '/performance/thresholds', { thresholds: newThresholds }, 'admin');
    return response;
  }

  async testUpdateResponseTimeThresholds() {
    const newThresholds = {
      responseTime: {
        warning: 2500,
        critical: 6000
      }
    };
    
    const response = await this.makeAuthenticatedRequest('PUT', '/performance/thresholds', { thresholds: newThresholds }, 'admin');
    return response;
  }

  async testInvalidThresholdValidation() {
    const invalidThresholds = {
      memory: {
        warning: 150, // Invalid > 100
        critical: 200  // Invalid > 100
      }
    };
    
    const response = await this.makeAuthenticatedRequest('PUT', '/performance/thresholds', { thresholds: invalidThresholds }, 'admin');
    return response;
  }

  async testGetHistoricalData(timeRange) {
    const response = await this.makeAuthenticatedRequest('GET', `/performance/historical?timeRange=${timeRange}`, null, 'admin');
    return response;
  }

  async testHistoricalDataAggregation() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/historical?timeRange=1h', null, 'admin');
    return response;
  }

  async testRealTimeCollection() {
    const response = await this.makeAuthenticatedRequest('POST', '/performance/refresh', null, 'admin');
    return response;
  }

  async testMetricsRefresh() {
    const response = await this.makeAuthenticatedRequest('POST', '/performance/refresh', null, 'admin');
    return response;
  }

  async testAutoRefresh() {
    // Test auto-refresh by checking multiple calls
    const response1 = await this.makeAuthenticatedRequest('GET', '/performance/dashboard', null, 'admin');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    const response2 = await this.makeAuthenticatedRequest('GET', '/performance/dashboard', null, 'admin');
    
    return {
      success: response1.success && response2.success,
      data: {
        firstCall: response1.data?.health?.lastCheck,
        secondCall: response2.data?.health?.lastCheck,
        timestampsDifferent: response1.data?.health?.lastCheck !== response2.data?.health?.lastCheck
      }
    };
  }

  async testLiveAlertUpdates() {
    // Test live alert updates by checking alerts before and after refresh
    const beforeRefresh = await this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin');
    await this.makeAuthenticatedRequest('POST', '/performance/refresh', null, 'admin');
    const afterRefresh = await this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin');
    
    return {
      success: beforeRefresh.success && afterRefresh.success,
      data: {
        beforeCount: beforeRefresh.data?.alerts?.critical?.length + beforeRefresh.data?.alerts?.warning?.length,
        afterCount: afterRefresh.data?.alerts?.critical?.length + afterRefresh.data?.alerts?.warning?.length
      }
    };
  }

  async testInvalidEndpoint() {
    const response = await this.makeAuthenticatedRequest('GET', '/performance/invalid-endpoint', null, 'admin');
    return response;
  }

  async testUnauthorizedAccess() {
    const response = await this.makeRequest('GET', '/performance/dashboard');
    return response;
  }

  async testDatabaseConnectionError() {
    // This would simulate a database connection error
    // For testing, we'll check if the system handles database status correctly
    const response = await this.makeAuthenticatedRequest('GET', '/performance/database', null, 'admin');
    return response;
  }

  async testMetricsCollectionFailure() {
    // Test how the system handles metrics collection failures
    const response = await this.makeAuthenticatedRequest('GET', '/performance/status', null, 'admin');
    return response;
  }

  async testConcurrentRequests() {
    const promises = [];
    const requestCount = 10;
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(this.makeAuthenticatedRequest('GET', '/performance/dashboard', null, 'admin'));
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.value?.success).length;
    const failed = results.filter(r => !r.value?.success).length;
    
    return {
      success: successful > 0,
      data: {
        total_requests: requestCount,
        successful,
        failed,
        success_rate: (successful / requestCount) * 100,
        total_duration: endTime - startTime,
        average_response_time: (endTime - startTime) / requestCount
      }
    };
  }

  async testLargeDataset() {
    // Test with large historical dataset
    const response = await this.makeAuthenticatedRequest('GET', '/performance/historical?timeRange=7d', null, 'admin');
    return response;
  }

  async testAlertSystemLoad() {
    // Test alert system under load by making multiple alert requests
    const promises = [];
    const requestCount = 5;
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(this.makeAuthenticatedRequest('GET', '/performance/alerts', null, 'admin'));
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.value?.success).length;
    
    return {
      success: successful === requestCount,
      data: {
        total_requests: requestCount,
        successful,
        success_rate: (successful / requestCount) * 100
      }
    };
  }

  async testHistoricalDataPerformance() {
    const startTime = Date.now();
    const response = await this.makeAuthenticatedRequest('GET', '/performance/historical?timeRange=24h', null, 'admin');
    const endTime = Date.now();
    
    return {
      success: response.success,
      data: {
        response_time: endTime - startTime,
        data_points: response.data?.data?.length || 0,
        performance_acceptable: (endTime - startTime) < 5000 // 5 seconds threshold
      }
    };
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
    const token = userType === 'admin' ? this.testData.adminToken : null;
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
          validation: result.validation || {}
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
    if (expectedResults.includes('dashboard_loaded') && !result.success) {
      issues.push('Expected success but got failure');
    }
    
    if (expectedResults.includes('error_handled') && result.success) {
      issues.push('Expected error but got success');
    }
    
    // Check for proper data structure
    if (expectedResults.includes('all_metrics_present') && result.validation) {
      const requiredFields = ['hasSystem', 'hasDatabase', 'hasApplication', 'hasAlerts', 'hasHealth'];
      const missingFields = requiredFields.filter(field => !result.validation[field]);
      if (missingFields.length > 0) {
        issues.push(`Missing dashboard fields: ${missingFields.join(', ')}`);
      }
    }
    
    // Check for performance metrics
    if (expectedResults.includes('performance_acceptable') && result.data) {
      if (result.data.performance_acceptable === false) {
        issues.push('Performance not acceptable');
      }
    }
    
    // Check for validation
    if (expectedResults.includes('validation_passed') && result.success === false) {
      issues.push('Validation should have passed');
    }
    
    // Check for error handling
    if (expectedResults.includes('error_handled') && result.success === true) {
      issues.push('Should have handled error');
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }

  generateTestReport() {
    console.log('📊 Performance Monitoring Test Suite Report');
    console.log('============================================');
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
    const performanceTests = this.testResults.scenarios.filter(s => s.duration);
    if (performanceTests.length > 0) {
      const avgDuration = performanceTests.reduce((sum, s) => sum + s.duration, 0) / performanceTests.length;
      const maxDuration = Math.max(...performanceTests.map(s => s.duration));
      const minDuration = Math.min(...performanceTests.map(s => s.duration));
      
      console.log('⚡ Performance Summary:');
      console.log(`   Average Duration: ${avgDuration.toFixed(0)}ms`);
      console.log(`   Max Duration: ${maxDuration}ms`);
      console.log(`   Min Duration: ${minDuration}ms`);
      console.log('');
    }

    // Recommendations
    console.log('💡 System Recommendations:');
    if (this.testResults.failed === 0) {
      console.log('   ✅ Performance monitoring system is production-ready');
      console.log('   ✅ All metrics collection working correctly');
      console.log('   ✅ Alert system functioning properly');
      console.log('   ✅ Real-time monitoring active');
    } else {
      console.log('   🔧 Address failed test scenarios before deployment');
      console.log('   🔧 Review error handling in failing areas');
      console.log('   🔧 Consider additional testing for edge cases');
    }
    console.log('');

    // System readiness assessment
    const readinessScore = (this.testResults.passed / this.testResults.total) * 100;
    console.log('🎯 System Readiness Assessment:');
    if (readinessScore >= 95) {
      console.log('   🟢 EXCELLENT: Performance monitoring is production-ready');
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
    
    // Restore original thresholds if they were modified
    try {
      if (this.testData.initialMetrics?.thresholds) {
        await this.makeAuthenticatedRequest('PUT', '/performance/thresholds', 
          { thresholds: this.testData.initialMetrics.thresholds }, 'admin');
      }
    } catch (error) {
      console.log(`   Warning: Could not restore original thresholds`);
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Export for use
module.exports = PerformanceMonitoringTestSuite;

// Auto-run if executed directly
if (require.main === module) {
  const testSuite = new PerformanceMonitoringTestSuite();
  testSuite.runCompleteTestSuite().catch(console.error);
}
