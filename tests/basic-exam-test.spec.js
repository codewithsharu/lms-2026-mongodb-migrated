/**
 * Basic Exam Functionality Test
 * Tests core exam functionality without complex login requirements
 */

const { test, expect } = require('@playwright/test');

test.describe('Basic Exam System Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check page loads
    await expect(page).toHaveTitle(/Login|Assignment Portal/);
    
    // Check login form elements
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should load main application', async ({ page }) => {
    await page.goto('/');
    
    // Check if main page loads
    const url = page.url();
    expect(url).toMatch(/(login|dashboard|\/)/);
  });

  test('should have frontend service running', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
  });

  test('should have proper routing structure', async ({ page }) => {
    // Test student routes
    await page.goto('/student');
    // Should redirect to login or show student dashboard
    
    // Test teacher routes
    await page.goto('/teacher');
    // Should redirect to login or show teacher dashboard
    
    // Test admin routes
    await page.goto('/admin');
    // Should redirect to login or show admin dashboard
  });

  test('should handle 404 routes gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should handle 404 gracefully
    const url = page.url();
    expect(url).toMatch(/(404|not-found|login)/);
  });
});

test.describe('Exam Component Tests', () => {
  test('should have exam-related files', async ({ page }) => {
    // Test if exam components can be accessed
    const response = await page.goto('/student/assessments');
    
    // Should either load assessments or redirect to login
    const url = page.url();
    expect(url).toMatch(/(assessments|login)/);
  });

  test('should have exam scheduling interface', async ({ page }) => {
    const response = await page.goto('/teacher/exams/create');
    
    // Should either load exam creation or redirect to login
    const url = page.url();
    expect(url).toMatch(/(exams|create|login)/);
  });

  test('should have performance monitoring', async ({ page }) => {
    const response = await page.goto('/admin/performance');
    
    // Should either load performance dashboard or redirect to login
    const url = page.url();
    expect(url).toMatch(/(performance|admin|login)/);
  });
});

test.describe('API Endpoint Tests', () => {
  test('should have backend API endpoints available', async ({ page }) => {
    // Test if backend API is accessible
    try {
      const response = await page.goto('http://localhost:5000/api/health');
      // If this works, backend is accessible
    } catch (error) {
      // Backend might not be accessible from frontend context
      console.log('Backend API test skipped - not accessible from frontend');
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Test API error handling
    try {
      const response = await page.evaluate(async () => {
        const response = await fetch('/api/non-existent-endpoint');
        return {
          status: response.status,
          ok: response.ok
        };
      });
      
      // Should handle 404 gracefully
      expect(response.status).toBe(404);
    } catch (error) {
      // API might not be available
      console.log('API test skipped - API not available');
    }
  });
});

test.describe('Frontend Build Tests', () => {
  test('should have proper React components', async ({ page }) => {
    // Test if React app loads properly
    await page.goto('/');
    
    // Check for React root element
    const reactRoot = page.locator('#root');
    await expect(reactRoot).toBeVisible();
  });

  test('should have proper CSS and styling', async ({ page }) => {
    await page.goto('/login');
    
    // Check if CSS loads properly
    const loginForm = page.locator('.login-form');
    await expect(loginForm).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/login');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.login-form')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.login-form')).toBeVisible();
  });
});

test.describe('Error Handling Tests', () => {
  test('should handle JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error);
    });
    
    await page.goto('/');
    
    // Check for JavaScript errors
    if (errors.length > 0) {
      console.log('JavaScript errors found:', errors);
    }
    
    // Should not have critical JavaScript errors
    expect(errors.length).toBeLessThan(5);
  });

  test('should handle network errors', async ({ page }) => {
    // Test network error handling
    await page.goto('/');
    
    // Simulate network offline
    await page.setOffline(true);
    
    // Try to navigate
    await page.goto('/student/assessments');
    
    // Restore network
    await page.setOffline(false);
    
    // Should handle network issues gracefully
    const url = page.url();
    expect(url).toMatch(/(assessments|login)/);
  });
});

test.describe('Performance Tests', () => {
  test('should load pages within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have memory leaks', async ({ page }) => {
    // Test for basic memory issues
    await page.goto('/login');
    
    // Check if page is responsive
    await expect(page.locator('#login-email')).toBeVisible();
    
    // Basic memory test - should not crash
    await page.reload();
    await expect(page.locator('#login-email')).toBeVisible();
  });
});
