/**
 * Authentication Helper for Playwright Tests
 * Provides login functions for different user types
 */

const { test } = require('@playwright/test');

// Test user credentials
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  teacher: {
    email: 'teacher@test.com',
    password: 'teacher123',
    role: 'teacher'
  },
  student: {
    email: 'student@test.com',
    password: 'student123',
    role: 'student'
  }
};

/**
 * Login as admin user
 */
async function loginAsAdmin(page) {
  await page.goto('/login');
  
  await page.fill('#login-email', TEST_USERS.admin.email);
  await page.fill('#login-password', TEST_USERS.admin.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForURL(/dashboard|admin/);
  
  // Verify admin role
  const userRole = await page.evaluate(() => {
    return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  });
  
  if (userRole !== 'admin') {
    throw new Error('Failed to login as admin');
  }
}

/**
 * Login as teacher user
 */
async function loginAsTeacher(page) {
  await page.goto('/login');
  
  await page.fill('#login-email', TEST_USERS.teacher.email);
  await page.fill('#login-password', TEST_USERS.teacher.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForURL(/dashboard|teacher/);
  
  // Verify teacher role
  const userRole = await page.evaluate(() => {
    return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  });
  
  if (userRole !== 'teacher') {
    throw new Error('Failed to login as teacher');
  }
}

/**
 * Login as student user
 */
async function loginAsStudent(page) {
  await page.goto('/login');
  
  await page.fill('#login-email', TEST_USERS.student.email);
  await page.fill('#login-password', TEST_USERS.student.password);
  await page.click('button[type="submit"]');
  
  // Wait for successful login
  await page.waitForURL(/dashboard|student/);
  
  // Verify student role
  const userRole = await page.evaluate(() => {
    return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
  });
  
  if (userRole !== 'student') {
    throw new Error('Failed to login as student');
  }
}

/**
 * Login with custom credentials
 */
async function loginWithCredentials(page, email, password) {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for navigation
  await page.waitForLoadState('networkidle');
}

/**
 * Logout current user
 */
async function logout(page) {
  // Find and click logout button
  const logoutButton = page.locator('[data-testid="logout-button"]');
  
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/login');
  } else {
    // Alternative logout method
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
  }
}

/**
 * Check if user is logged in
 */
async function isLoggedIn(page) {
  const currentUrl = page.url();
  return !currentUrl.includes('/login');
}

/**
 * Get current user info
 */
async function getCurrentUser(page) {
  return await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    return {
      email: user.email,
      role: user.role,
      name: user.full_name || user.name
    };
  });
}

/**
 * Setup test data (create test users if needed)
 */
async function setupTestData(page) {
  // This would typically create test users via API
  // For now, we assume test users exist
  console.log('Setting up test data...');
}

/**
 * Cleanup test data
 */
async function cleanupTestData(page) {
  // This would typically clean up test data via API
  console.log('Cleaning up test data...');
}

module.exports = {
  loginAsAdmin,
  loginAsTeacher,
  loginAsStudent,
  loginWithCredentials,
  logout,
  isLoggedIn,
  getCurrentUser,
  setupTestData,
  cleanupTestData,
  TEST_USERS
};
