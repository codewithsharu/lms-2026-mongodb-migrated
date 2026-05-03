/**
 * Playwright Test Suite for Resume Functionality
 * Tests resume button visibility, validation, and error handling
 */

const { test, expect } = require('@playwright/test');
const { loginAsStudent, loginAsTeacher } = require('./helpers/auth-helper');

test.describe('Resume Button - Visibility Logic', () => {
  test('should only show resume button when resume is possible', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Look for resume buttons
    const resumeButtons = page.locator('[data-testid="resume-button"]');
    
    // Check that resume buttons only appear under certain conditions
    const resumeButtonCount = await resumeButtons.count();
    
    // If there are resume buttons, they should be valid
    if (resumeButtonCount > 0) {
      for (let i = 0; i < resumeButtonCount; i++) {
        const button = resumeButtons.nth(i);
        await expect(button).toBeVisible();
        
        // Check if button is disabled during validation
        const isDisabled = await button.isDisabled();
        if (isDisabled) {
          await expect(button.locator('text')).toContain('Checking...');
        } else {
          await expect(button.locator('text')).toContain('Resume');
        }
      }
    }
  });

  test('should not show resume button when resume is disabled', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Look for exams with resume disabled
    const disabledResumeBadges = page.locator('[data-testid="resume-disabled"]');
    
    // These should not have resume buttons
    for (let i = 0; i < await disabledResumeBadges.count(); i++) {
      const badge = disabledResumeBadges.nth(i);
      const parentRow = badge.locator('..').locator('..');
      
      // Should not have resume button in same row
      const resumeButton = parentRow.locator('[data-testid="resume-button"]');
      await expect(resumeButton).toHaveCount(0);
    }
  });

  test('should show "Start" button instead of resume when no in-progress attempt', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Look for available exams without in-progress attempts
    const startButtons = page.locator('[data-testid="start-button"]');
    
    // These should be visible and functional
    await expect(startButtons.first()).toBeVisible();
    await expect(startButtons.first()).toContainText('Start');
  });
});

test.describe('Resume Validation - Pre-Resume Checks', () => {
  test('should validate attempt before navigating to resume page', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Find a resume button and click it
    const resumeButton = page.locator('[data-testid="resume-button"]').first();
    
    if (await resumeButton.isVisible()) {
      // Button should show "Checking..." during validation
      await resumeButton.click();
      
      // Check for loading state
      await expect(resumeButton).toHaveText('Checking...');
      await expect(resumeButton).toBeDisabled();
      
      // Wait for validation to complete
      await page.waitForTimeout(2000);
      
      // Either navigate to attempt page or show error
      const url = page.url();
      if (url.includes('/attempt/')) {
        // Successfully navigated to attempt page
        await expect(page.locator('[data-testid="exam-attempt"]')).toBeVisible();
      } else {
        // Should show error message
        await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
      }
    }
  });

  test('should remove invalid resume buttons after validation failure', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Find and click a potentially invalid resume button
    const resumeButton = page.locator('[data-testid="resume-button"]').first();
    
    if (await resumeButton.isVisible()) {
      const initialButtonText = await resumeButton.textContent();
      
      await resumeButton.click();
      await page.waitForTimeout(3000);
      
      // Go back to assessments page
      await page.goto('/student/assessments');
      
      // Check if invalid resume button was removed
      const sameButton = page.locator('[data-testid="resume-button"]').first();
      
      if (await sameButton.isVisible()) {
        const currentButtonText = await sameButton.textContent();
        // If button still exists, it should be valid
        expect(currentButtonText).toBe('Resume');
      }
    }
  });
});

test.describe('Resume Error Handling', () => {
  test('should show clear error messages for expired attempts', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Try to access an expired attempt directly
    await page.goto('/student/assessments/attempt/expired-attempt-id');
    
    // Should show error page instead of blank page
    await expect(page.locator('[data-testid="assessment-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('expired');
    await expect(page.locator('[data-testid="back-to-assessments"]')).toBeVisible();
    await expect(page.locator('[data-testid="try-again"]')).toBeVisible();
  });

  test('should show clear error messages for submitted attempts', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Try to access a submitted attempt directly
    await page.goto('/student/assessments/attempt/submitted-attempt-id');
    
    // Should show appropriate message
    await expect(page.locator('[data-testid="assessment-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('submitted');
  });

  test('should show clear error messages for attempts not found', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Try to access a non-existent attempt
    await page.goto('/student/assessments/attempt/non-existent-id');
    
    // Should show not found error
    await expect(page.locator('[data-testid="assessment-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('not found');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Simulate network offline
    await page.route('**/api/**', route => route.abort());
    
    // Try to click resume button
    const resumeButton = page.locator('[data-testid="resume-button"]').first();
    
    if (await resumeButton.isVisible()) {
      await resumeButton.click();
      
      // Should show network error
      await expect(page.locator('[data-testid="toast-error"]')).toContainText('Network error');
    }
    
    // Restore network
    await page.unroute('**/api/**');
  });
});

test.describe('Resume Page - Error Fallbacks', () => {
  test('should show helpful error page instead of blank page', async ({ page }) => {
    await loginAsStudent(page);
    
    // Navigate to attempt page with invalid ID
    await page.goto('/student/assessments/attempt/invalid-id');
    
    // Should show error fallback page
    await expect(page.locator('[data-testid="assessment-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-title"]')).toContainText('Assessment Unavailable');
    
    // Check for helpful information
    await expect(page.locator('[data-testid="error-reasons"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-reasons"]')).toContainText('expired');
    await expect(page.locator('[data-testid="error-reasons"]')).toContainText('submitted');
    
    // Check for action buttons
    await expect(page.locator('[data-testid="back-to-assessments"]')).toBeVisible();
    await expect(page.locator('[data-testid="try-again"]')).toBeVisible();
  });

  test('should provide actionable options in error page', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments/attempt/invalid-id');
    
    // Test back to assessments button
    await page.click('[data-testid="back-to-assessments"]');
    await expect(page.url()).toContain('/student/assessments');
    
    // Go back to error page
    await page.goBack();
    
    // Test try again button
    await page.click('[data-testid="try-again"]');
    // Should reload the page
    await page.waitForLoadState();
  });
});

test.describe('Session Conflict Handling', () => {
  test('should show session conflict modal when needed', async ({ page }) => {
    await loginAsStudent(page);
    
    // This test would need to simulate an active session
    // For now, we'll test the UI elements
    await page.goto('/student/assessments/attempt/test-id?conflict=true');
    
    // Should show conflict resolution modal
    await expect(page.locator('[data-testid="session-conflict"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-message"]')).toContainText('active in another session');
    await expect(page.locator('[data-testid="resume-here"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-assessments"]')).toBeVisible();
  });

  test('should handle session takeover correctly', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto('/student/assessments/attempt/test-id?conflict=true');
    
    // Click resume here button
    await page.click('[data-testid="resume-here"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="resuming-here"]')).toContainText('Resuming Here...');
    await expect(page.locator('[data-testid="resume-here"]')).toBeDisabled();
    
    // Should eventually navigate to attempt page or show error
    await page.waitForTimeout(3000);
    
    const url = page.url();
    if (url.includes('/attempt/') && !url.includes('conflict=true')) {
      await expect(page.locator('[data-testid="exam-attempt"]')).toBeVisible();
    }
  });
});

test.describe('Resume Button - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Check resume buttons on mobile
    const resumeButtons = page.locator('[data-testid="resume-button"]');
    
    if (await resumeButtons.count() > 0) {
      await expect(resumeButtons.first()).toBeVisible();
      await expect(resumeButtons.first()).toBeClickable();
    }
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsStudent(page);
    await page.goto('/student/assessments');
    
    // Check resume buttons on tablet
    const resumeButtons = page.locator('[data-testid="resume-button"]');
    
    if (await resumeButtons.count() > 0) {
      await expect(resumeButtons.first()).toBeVisible();
      await expect(resumeButtons.first()).toBeClickable();
    }
  });

  test('should show appropriate error pages on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsStudent(page);
    await page.goto('/student/assessments/attempt/invalid-id');
    
    // Should show error page properly on mobile
    await expect(page.locator('[data-testid="assessment-unavailable"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-assessments"]')).toBeVisible();
  });
});
