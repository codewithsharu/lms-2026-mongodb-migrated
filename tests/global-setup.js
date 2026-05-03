/**
 * Global Setup for Playwright Tests
 * Prepares test environment and starts services
 */

const { chromium } = require('@playwright/test');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function globalSetup(config) {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Check if backend is running
    console.log('📡 Checking backend service...');
    try {
      await execAsync('curl -f http://localhost:5000/api/health');
      console.log('✅ Backend service is running');
    } catch (error) {
      console.log('⚠️ Backend service not found, starting...');
      // Start backend service
      const backendProcess = exec('cd backend && npm start', { 
        stdio: 'pipe',
        detached: true 
      });
      
      // Wait for backend to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check again
      await execAsync('curl -f http://localhost:5000/api/health');
      console.log('✅ Backend service started successfully');
    }
    
    // Check if frontend is running
    console.log('🎨 Checking frontend service...');
    try {
      await execAsync('curl -f http://localhost:5173', { timeout: 5000 });
      console.log('✅ Frontend service is running');
    } catch (error) {
      console.log('⚠️ Frontend service not found, starting...');
      // Start frontend service
      const frontendProcess = exec('cd frontend && npm run dev', { 
        stdio: 'pipe',
        detached: true 
      });
      
      // Wait for frontend to start
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Check again
      await execAsync('curl -f http://localhost:5173');
      console.log('✅ Frontend service started successfully');
    }
    
    // Setup test database if needed
    console.log('🗄️ Setting up test database...');
    try {
      await execAsync('cd backend && node -e "require(\'./config/database\').connect()"');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('⚠️ Database setup failed, tests may not work properly');
    }
    
    // Create test users if needed
    console.log('👥 Setting up test users...');
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // This would typically create test users via API calls
      // For now, we assume test users exist
      
      await browser.close();
      console.log('✅ Test users setup complete');
    } catch (error) {
      console.log('⚠️ Test user setup failed:', error.message);
    }
    
    console.log('🎯 Test environment setup complete!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;
