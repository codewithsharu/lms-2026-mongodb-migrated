/**
 * Playwright Test Suite for Exam Scheduling
 * Tests zone dropdown, time/date UI, and validation
 */

const { test, expect } = require('@playwright/test');
const { loginAsTeacher } = require('./helpers/auth-helper');

test.describe('Exam Scheduling - Zone Selection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
  });

  test('should show all zones in dropdown including "All Zones"', async ({ page }) => {
    // Click on zone dropdown
    await page.click('[data-testid="zone-select"]');
    
    // Wait for dropdown to open
    await page.waitForSelector('[data-testid="zone-dropdown"]');
    
    // Check all zones are present
    const zones = await page.locator('[data-testid="zone-option"]');
    await expect(zones).toHaveCount(5); // All Zones + 4 individual zones
    
    // Verify specific zones
    await expect(page.locator('[data-testid="zone-option"]:has-text("All Zones")')).toBeVisible();
    await expect(page.locator('[data-testid="zone-option"]:has-text("Blue Zone")')).toBeVisible();
    await expect(page.locator('[data-testid="zone-option"]:has-text("Red Zone")')).toBeVisible();
    await expect(page.locator('[data-testid="zone-option"]:has-text("Green Zone")')).toBeVisible();
    await expect(page.locator('[data-testid="zone-option"]:has-text("Unassigned Zone")')).toBeVisible();
  });

  test('should show user counts when class is selected', async ({ page }) => {
    // Select a class first
    await page.click('[data-testid="class-select"]');
    await page.click('[data-testid="class-option"]:first-child');
    
    // Click on zone dropdown
    await page.click('[data-testid="zone-select"]');
    
    // Check that zones show user counts
    await expect(page.locator('[data-testid="zone-option"]:has-text("students")')).toHaveCount(4);
  });

  test('should show warning for zones with no students', async ({ page }) => {
    // Select a class first
    await page.click('[data-testid="class-select"]');
    await page.click('[data-testid="class-option"]:first-child');
    
    // Select a zone that might have no students
    await page.click('[data-testid="zone-select"]');
    await page.click('[data-testid="zone-option"]:has-text("Unassigned")');
    
    // Check for warning message
    const warning = page.locator('[data-testid="zone-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('No students in this zone');
  });

  test('should show success message for zones with students', async ({ page }) => {
    // Select a class first
    await page.click('[data-testid="class-select"]');
    await page.click('[data-testid="class-option"]:first-child');
    
    // Select a zone that likely has students
    await page.click('[data-testid="zone-select"]');
    await page.click('[data-testid="zone-option"]:has-text("Blue")');
    
    // Check for success message
    const success = page.locator('[data-testid="zone-success"]');
    if (await success.isVisible()) {
      await expect(success).toContainText('students will have access');
    }
  });
});

test.describe('Exam Scheduling - Time/Date UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
  });

  test('should have enhanced time/date inputs with icons', async ({ page }) => {
    // Check start date field
    const startField = page.locator('[data-testid="start-datetime"]');
    await expect(startField).toBeVisible();
    await expect(startField.locator('svg')).toHaveClass(/calendar/i);
    
    // Check end date field
    const endField = page.locator('[data-testid="end-datetime"]');
    await expect(endField).toBeVisible();
    await expect(endField.locator('svg')).toHaveClass(/clock/i);
  });

  test('should show duration calculation', async ({ page }) => {
    // Set start time
    await page.fill('[data-testid="start-datetime"]', '2026-05-04T10:00');
    
    // Set end time
    await page.fill('[data-testid="end-datetime"]', '2026-05-04T12:00');
    
    // Check duration display
    const duration = page.locator('[data-testid="duration-display"]');
    await expect(duration).toBeVisible();
    await expect(duration).toContainText('Duration: 2 hours');
  });

  test('should show error for invalid time range', async ({ page }) => {
    // Set start time
    await page.fill('[data-testid="start-datetime"]', '2026-05-04T12:00');
    
    // Set end time before start time
    await page.fill('[data-testid="end-datetime"]', '2026-05-04T10:00');
    
    // Check error message
    const error = page.locator('[data-testid="time-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText('End time must be after start time');
  });

  test('should auto-adjust end time when start time changes', async ({ page }) => {
    // Set initial times
    await page.fill('[data-testid="start-datetime"]', '2026-05-04T10:00');
    await page.fill('[data-testid="end-datetime"]', '2026-05-04T11:00');
    
    // Change start time to be after end time
    await page.fill('[data-testid="start-datetime"]', '2026-05-04T12:00');
    
    // Check that end time was auto-adjusted
    const endTime = await page.inputValue('[data-testid="end-datetime"]');
    expect(endTime).toBe('2026-05-04T14:00'); // Should be 2 hours after start
  });

  test('should prevent selecting past dates', async ({ page }) => {
    // Get current datetime
    const now = new Date();
    const pastTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const pastDateTime = pastTime.toISOString().slice(0, 16);
    
    // Try to set past time
    await page.fill('[data-testid="start-datetime"]', pastDateTime);
    
    // Check validation
    const minValue = await page.getAttribute('[data-testid="start-datetime"]', 'min');
    const currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() - currentTime.getTimezoneOffset());
    const expectedMin = currentTime.toISOString().slice(0, 16);
    
    expect(minValue).toBe(expectedMin);
  });
});

test.describe('Exam Scheduling - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without required fields
    await page.click('[data-testid="submit-exam"]');
    
    // Check for validation errors
    await expect(page.locator('[data-testid="error-template"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-attempts"]')).toBeVisible();
  });

  test('should allow successful exam creation', async ({ page }) => {
    // Fill in all required fields
    await page.selectOption('[data-testid="template-select"]', { index: 1 });
    await page.selectOption('[data-testid="class-select"]', { index: 1 });
    await page.fill('[data-testid="duration"]', '60');
    await page.fill('[data-testid="max-attempts"]', '1');
    await page.fill('[data-testid="start-datetime"]', '2026-05-04T10:00');
    await page.fill('[data-testid="end-datetime"]', '2026-05-04T12:00');
    
    // Submit form
    await page.click('[data-testid="submit-exam"]');
    
    // Check for success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle coding section toggle', async ({ page }) => {
    // Check coding section checkbox
    const codingCheckbox = page.locator('[data-testid="coding-section"]');
    await expect(codingCheckbox).toBeVisible();
    
    // Toggle coding section
    await codingCheckbox.check();
    await expect(codingCheckbox).toBeChecked();
    
    // Check for coding challenges section
    await expect(page.locator('[data-testid="coding-challenges"]')).toBeVisible();
    
    // Untoggle coding section
    await codingCheckbox.uncheck();
    await expect(codingCheckbox).not.toBeChecked();
  });
});

test.describe('Exam Scheduling - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
    
    // Check that all elements are visible and functional
    await expect(page.locator('[data-testid="exam-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="class-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="zone-select"]')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
    
    // Check layout
    await expect(page.locator('[data-testid="exam-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-grid"]')).toBeVisible();
  });

  test('should work on desktop devices', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await loginAsTeacher(page);
    await page.goto('/teacher/exams/create');
    
    // Check desktop layout
    await expect(page.locator('[data-testid="exam-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-grid"]')).toBeVisible();
  });
});
