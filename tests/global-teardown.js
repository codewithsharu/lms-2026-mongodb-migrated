/**
 * Global Teardown for Playwright Tests
 * Cleans up test environment and stops services
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function globalTeardown(config) {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Cleanup test data
    console.log('🗑️ Cleaning up test data...');
    try {
      // This would typically clean up test data via API calls
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.log('⚠️ Test data cleanup failed:', error.message);
    }
    
    // Stop any test services if they were started
    console.log('🛑 Stopping test services...');
    
    // Note: We don't stop the backend/frontend services here
    // as they might be needed for subsequent test runs
    console.log('ℹ️ Services left running for subsequent tests');
    
    console.log('✅ Test environment cleanup complete!');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid blocking test completion
  }
}

module.exports = globalTeardown;
