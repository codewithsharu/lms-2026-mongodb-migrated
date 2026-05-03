/**
 * Simple System Error Detection Script
 * Tests for common errors in the LMS system
 */

const fs = require('fs');
const path = require('path');

function checkFileErrors() {
  console.log('🔍 Checking for file errors...');
  
  const errors = [];
  
  // Check for syntax errors in key files
  const filesToCheck = [
    'frontend/src/pages/student/AssessmentAttempt.jsx',
    'frontend/src/pages/teacher/HostExamCreate.jsx',
    'backend/routes/assessments.js',
    'backend/routes/performance.js',
    'backend/services/performanceMonitoringService.js'
  ];
  
  filesToCheck.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for common syntax errors
        if (content.includes('}\' expected')) {
          errors.push(`Syntax error detected in ${filePath}`);
        }
        
        // Check for unclosed brackets
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
          errors.push(`Bracket mismatch in ${filePath}: ${openBraces} open, ${closeBraces} close`);
        }
        
        // Check for unclosed parentheses
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          errors.push(`Parentheses mismatch in ${filePath}: ${openParens} open, ${closeParens} close`);
        }
        
        // Check for JSX syntax issues
        if (filePath.endsWith('.jsx')) {
          const openTags = (content.match(/<[^\/>]/g) || []).length;
          const closeTags = (content.match(/<\/[^>]/g) || []).length;
          const selfClosingTags = (content.match(/\/>/g) || []).length;
          
          if (openTags !== closeTags + selfClosingTags) {
            errors.push(`JSX tag mismatch in ${filePath}`);
          }
        }
        
      } else {
        errors.push(`File not found: ${filePath}`);
      }
    } catch (error) {
      errors.push(`Error reading ${filePath}: ${error.message}`);
    }
  });
  
  return errors;
}

function checkPackageJson() {
  console.log('📦 Checking package.json files...');
  
  const errors = [];
  
  const packageFiles = [
    'package.json',
    'frontend/package.json',
    'backend/package.json'
  ];
  
  packageFiles.forEach(packagePath => {
    try {
      if (fs.existsSync(packagePath)) {
        const content = fs.readFileSync(packagePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        // Check for duplicate keys
        const keys = Object.keys(packageJson);
        const uniqueKeys = [...new Set(keys)];
        
        if (keys.length !== uniqueKeys.length) {
          errors.push(`Duplicate keys found in ${packagePath}`);
        }
        
      } else {
        console.log(`⚠️ Package file not found: ${packagePath}`);
      }
    } catch (error) {
      errors.push(`Invalid JSON in ${packagePath}: ${error.message}`);
    }
  });
  
  return errors;
}

function checkMissingDependencies() {
  console.log('📚 Checking for missing dependencies...');
  
  const errors = [];
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    errors.push('node_modules directory not found - run npm install');
  }
  
  if (!fs.existsSync('frontend/node_modules')) {
    errors.push('frontend/node_modules directory not found - run npm install in frontend directory');
  }
  
  if (!fs.existsSync('backend/node_modules')) {
    errors.push('backend/node_modules directory not found - run npm install in backend directory');
  }
  
  return errors;
}

function checkEnvironmentFiles() {
  console.log('🔧 Checking environment files...');
  
  const errors = [];
  
  const envFiles = [
    '.env',
    'frontend/.env',
    'backend/.env'
  ];
  
  envFiles.forEach(envPath => {
    if (!fs.existsSync(envPath)) {
      errors.push(`Environment file not found: ${envPath}`);
    } else {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        
        // Check for required environment variables
        const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
        requiredVars.forEach(varName => {
          if (!content.includes(varName)) {
            errors.push(`Required environment variable ${varName} not found in ${envPath}`);
          }
        });
      } catch (error) {
        errors.push(`Error reading ${envPath}: ${error.message}`);
      }
    }
  });
  
  return errors;
}

function checkDatabaseConnection() {
  console.log('🗄️ Checking database configuration...');
  
  const errors = [];
  
  try {
    const dbConfigPath = 'backend/config/database.js';
    if (fs.existsSync(dbConfigPath)) {
      const content = fs.readFileSync(dbConfigPath, 'utf8');
      
      // Check for database configuration
      if (!content.includes('mongoose') && !content.includes('mongodb')) {
        errors.push('Database configuration not found in backend/config/database.js');
      }
    } else {
      errors.push('Database configuration file not found: backend/config/database.js');
    }
  } catch (error) {
    errors.push(`Error checking database config: ${error.message}`);
  }
  
  return errors;
}

function checkTestFiles() {
  console.log('🧪 Checking test files...');
  
  const errors = [];
  
  const testFiles = [
    'tests/exam-scheduling.spec.js',
    'tests/resume-functionality.spec.js',
    'tests/performance-monitoring.spec.js',
    'tests/helpers/auth-helper.js'
  ];
  
  testFiles.forEach(testPath => {
    if (!fs.existsSync(testPath)) {
      errors.push(`Test file not found: ${testPath}`);
    }
  });
  
  return errors;
}

function main() {
  console.log('🎯 LMS System Error Detection');
  console.log('===============================\n');
  
  const allErrors = [];
  
  // Run all checks
  allErrors.push(...checkFileErrors());
  allErrors.push(...checkPackageJson());
  allErrors.push(...checkMissingDependencies());
  allErrors.push(...checkEnvironmentFiles());
  allErrors.push(...checkDatabaseConnection());
  allErrors.push(...checkTestFiles());
  
  // Report results
  console.log('\n📊 Error Report:');
  console.log('================');
  
  if (allErrors.length === 0) {
    console.log('✅ No errors detected!');
  } else {
    console.log(`❌ Found ${allErrors.length} errors:\n`);
    
    allErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
    
    // Categorize errors
    const critical = allErrors.filter(e => e.includes('not found') || e.includes('Syntax error'));
    const warnings = allErrors.filter(e => !critical.includes(e));
    
    console.log(`\n🔴 Critical errors: ${critical.length}`);
    console.log(`🟡 Warnings: ${warnings.length}`);
    
    if (critical.length > 0) {
      console.log('\n🔧 Recommended fixes:');
      critical.forEach(error => {
        if (error.includes('node_modules')) {
          console.log(`- Run: npm install`);
        } else if (error.includes('Environment file')) {
          console.log(`- Create environment file with required variables`);
        } else if (error.includes('Syntax error')) {
          console.log(`- Fix syntax errors in the affected file`);
        } else {
          console.log(`- ${error}`);
        }
      });
    }
  }
  
  // Check for specific known issues
  console.log('\n🔍 Specific Issues Check:');
  
  // Check AssessmentAttempt.jsx for the known error
  const attemptFile = 'frontend/src/pages/student/AssessmentAttempt.jsx';
  if (fs.existsSync(attemptFile)) {
    const content = fs.readFileSync(attemptFile, 'utf8');
    if (content.includes('}\' expected')) {
      console.log('❌ Known syntax error found in AssessmentAttempt.jsx');
      console.log('   This needs to be fixed before the system can work properly');
    }
  }
  
  console.log('\n🎯 System Status:');
  if (allErrors.length === 0) {
    console.log('✅ System is ready for testing');
  } else if (allErrors.filter(e => e.includes('Syntax error')).length > 0) {
    console.log('❌ System has critical syntax errors that must be fixed');
  } else {
    console.log('⚠️ System has some issues but may be partially functional');
  }
  
  return allErrors.length === 0;
}

// Run if called directly
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { checkFileErrors, checkPackageJson, checkMissingDependencies };
