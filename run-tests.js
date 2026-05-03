/**
 * Comprehensive Test Runner for LMS System
 * Runs Playwright tests and generates detailed reports
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class TestRunner {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  async runCommand(command, description) {
    console.log(`\n🔄 ${description}...`);
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(`✅ ${description} completed successfully`);
      return { success: true, stdout, stderr };
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      this.errors.push({
        command,
        description,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      });
      return { success: false, error: error.message };
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    // Check Node.js version
    const nodeVersion = await this.runCommand('node --version', 'Checking Node.js version');
    
    // Check npm version
    const npmVersion = await this.runCommand('npm --version', 'Checking npm version');
    
    // Check if directories exist
    const requiredDirs = ['backend', 'frontend', 'tests'];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        console.error(`❌ Required directory missing: ${dir}`);
        this.errors.push({ type: 'missing_directory', dir });
      }
    }
    
    // Check if services are running
    console.log('🌐 Checking services...');
    
    try {
      await execAsync('curl -f http://localhost:5000/api/health', { timeout: 5000 });
      console.log('✅ Backend service is running');
    } catch (error) {
      console.log('⚠️ Backend service is not running');
      this.errors.push({ type: 'service_down', service: 'backend' });
    }
    
    try {
      await execAsync('curl -f http://localhost:3000', { timeout: 5000 });
      console.log('✅ Frontend service is running');
    } catch (error) {
      console.log('⚠️ Frontend service is not running');
      this.errors.push({ type: 'service_down', service: 'frontend' });
    }
  }

  async installDependencies() {
    console.log('\n📦 Installing dependencies...');
    
    // Install Playwright
    const playwrightInstall = await this.runCommand('npm install', 'Installing npm dependencies');
    
    // Install Playwright browsers
    const browserInstall = await this.runCommand('npx playwright install', 'Installing Playwright browsers');
    
    return playwrightInstall.success && browserInstall.success;
  }

  async runTestSuite(testType = 'all') {
    console.log(`\n🧪 Running ${testType} tests...`);
    
    let testCommand = 'npx playwright test';
    
    switch (testType) {
      case 'exam-scheduling':
        testCommand = 'npx playwright test tests/exam-scheduling.spec.js';
        break;
      case 'resume':
        testCommand = 'npx playwright test tests/resume-functionality.spec.js';
        break;
      case 'performance':
        testCommand = 'npx playwright test tests/performance-monitoring.spec.js';
        break;
      case 'smoke':
        testCommand = 'npx playwright test --grep "smoke"';
        break;
      case 'critical':
        testCommand = 'npx playwright test --grep "critical"';
        break;
    }
    
    const result = await this.runCommand(testCommand, `Running ${testType} tests`);
    
    if (result.success) {
      console.log('✅ Tests completed successfully');
    } else {
      console.log('❌ Tests failed');
    }
    
    return result;
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');
    
    // Generate HTML report
    const reportResult = await this.runCommand('npx playwright show-report', 'Generating HTML report');
    
    // Create summary report
    const summary = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      errors: this.errors,
      summary: {
        totalErrors: this.errors.length,
        errorTypes: this.errors.reduce((acc, err) => {
          acc[err.type || 'unknown'] = (acc[err.type || 'unknown'] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    // Write summary to file
    fs.writeFileSync('test-summary.json', JSON.stringify(summary, null, 2));
    console.log('📄 Test summary saved to test-summary.json');
    
    return summary;
  }

  async analyzeErrors() {
    console.log('\n🔍 Analyzing errors...');
    
    const errorAnalysis = {
      critical: [],
      warnings: [],
      info: []
    };
    
    this.errors.forEach(error => {
      if (error.type === 'service_down') {
        errorAnalysis.critical.push(error);
      } else if (error.type === 'missing_directory') {
        errorAnalysis.critical.push(error);
      } else {
        errorAnalysis.warnings.push(error);
      }
    });
    
    console.log(`\n📋 Error Analysis:`);
    console.log(`🔴 Critical errors: ${errorAnalysis.critical.length}`);
    console.log(`🟡 Warnings: ${errorAnalysis.warnings.length}`);
    console.log(`ℹ️ Info: ${errorAnalysis.info.length}`);
    
    if (errorAnalysis.critical.length > 0) {
      console.log('\n🔴 Critical Issues:');
      errorAnalysis.critical.forEach((error, index) => {
        console.log(`${index + 1}. ${error.description || error.type}`);
        if (error.service) {
          console.log(`   Service: ${error.service}`);
          console.log(`   Solution: Start the ${error.service} service`);
        }
      });
    }
    
    return errorAnalysis;
  }

  async runQuickHealthCheck() {
    console.log('\n🚀 Running quick health check...');
    
    const checks = [
      { command: 'node --version', description: 'Node.js' },
      { command: 'npm --version', description: 'npm' },
      { command: 'curl -f http://localhost:5000/api/health', description: 'Backend API' },
      { command: 'curl -f http://localhost:3000', description: 'Frontend' }
    ];
    
    const results = [];
    
    for (const check of checks) {
      try {
        await execAsync(check.command, { timeout: 5000 });
        results.push({ ...check, status: '✅' });
      } catch (error) {
        results.push({ ...check, status: '❌', error: error.message });
      }
    }
    
    console.log('\n📊 Health Check Results:');
    results.forEach(result => {
      console.log(`${result.status} ${result.description}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    return results;
  }
}

async function main() {
  const runner = new TestRunner();
  
  console.log('🎯 LMS System Test Runner');
  console.log('========================');
  
  try {
    // Quick health check
    await runner.runQuickHealthCheck();
    
    // Check prerequisites
    await runner.checkPrerequisites();
    
    // Install dependencies if needed
    const installSuccess = await runner.installDependencies();
    
    if (!installSuccess) {
      console.log('❌ Failed to install dependencies');
      process.exit(1);
    }
    
    // Run specific test suites based on command line arguments
    const testType = process.argv[2] || 'all';
    
    console.log(`\n🧪 Running ${testType} test suite...`);
    
    const testResults = await runner.runTestSuite(testType);
    
    // Generate report
    const report = await runner.generateReport();
    
    // Analyze errors
    const errorAnalysis = await runner.analyzeErrors();
    
    // Final summary
    console.log('\n🎉 Test Run Complete!');
    console.log(`⏱️ Duration: ${Date.now() - runner.startTime}ms`);
    console.log(`📊 Total errors: ${runner.errors.length}`);
    
    if (runner.errors.length === 0) {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Check the report for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestRunner;
