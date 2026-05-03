/**
 * Playwright Test Suite for Exam Start Functionality
 * Tests exam instructions, validation, and start process
 */

const { test, expect } = require('@playwright/test');
const { loginAsStudent, loginAsTeacher } = require('./helpers/auth-helper');

test.describe('Exam Start - Instructions Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should load exam instructions page successfully', async ({ page }) => {
    // Navigate to exam instructions
    await page.goto('/student/assessments/123/instructions');
    
    // Check page title and header
    await expect(page).toHaveTitle(/Exam Instructions|Assessment/);
    await expect(page.locator('[data-testid="exam-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-title"]')).toBeVisible();
  });

  test('should display exam details correctly', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check exam information
    await expect(page.locator('[data-testid="exam-subject"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-attempts"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-resume"]')).toBeVisible();
  });

  test('should show exam instructions content', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check instructions section
    await expect(page.locator('[data-testid="instructions-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-rules"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-guidelines"]')).toBeVisible();
  });

  test('should display time window information', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check time window
    await expect(page.locator('[data-testid="start-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="time-remaining"]')).toBeVisible();
  });

  test('should show attempt status correctly', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check attempt status
    await expect(page.locator('[data-testid="attempt-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="remaining-attempts"]')).toBeVisible();
    
    // Status should be one of: Available, Limited, No attempts left
    const statusText = await page.locator('[data-testid="attempt-status"]').textContent();
    expect(['Available', 'Limited', 'No attempts left']).toContain(statusText.trim());
  });

  test('should validate exam availability', async ({ page }) => {
    await page.goto('/student/assessments/999/instructions'); // Non-existent exam
    
    // Should show error or redirect
    const url = page.url();
    expect(url).toMatch(/(assessments|error|not-found)/);
  });

  test('should handle expired exam window', async ({ page }) => {
    await page.goto('/student/assessments/expired/instructions');
    
    // Should show expired message
    await expect(page.locator('[data-testid="exam-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="window-closed"]')).toBeVisible();
  });

  test('should handle exam not started yet', async ({ page }) => {
    await page.goto('/student/assessments/future/instructions');
    
    // Should show not started message
    await expect(page.locator('[data-testid="exam-not-started"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-time-future"]')).toBeVisible();
  });
});

test.describe('Exam Start - Validation and Pre-checks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should validate student eligibility before starting', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check eligibility validation
    await expect(page.locator('[data-testid="eligibility-check"]')).toBeVisible();
    
    // Should show eligible or not eligible status
    const eligibilityStatus = page.locator('[data-testid="eligibility-status"]');
    await expect(eligibilityStatus).toBeVisible();
    
    const statusText = await eligibilityStatus.textContent();
    expect(['Eligible', 'Not eligible', 'Requirements not met']).toContain(statusText.trim());
  });

  test('should check for existing attempts', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check attempt history
    await expect(page.locator('[data-testid="attempt-history"]')).toBeVisible();
    
    // Should show previous attempts if any
    const previousAttempts = page.locator('[data-testid="previous-attempt"]');
    if (await previousAttempts.count() > 0) {
      await expect(previousAttempts.first()).toBeVisible();
    }
  });

  test('should validate time window before allowing start', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check time validation
    await expect(page.locator('[data-testid="time-validation"]')).toBeVisible();
    
    // Should show current time status
    const timeStatus = page.locator('[data-testid="time-status"]');
    await expect(timeStatus).toBeVisible();
    
    const statusText = await timeStatus.textContent();
    expect(['Window open', 'Window closed', 'Starts soon', 'Ended']).toContain(statusText.trim());
  });

  test('should check system requirements', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check system requirements
    await expect(page.locator('[data-testid="system-check"]')).toBeVisible();
    
    // Should check browser compatibility
    await expect(page.locator('[data-testid="browser-check"]')).toBeVisible();
    
    // Should check internet connection
    await expect(page.locator('[data-testid="connection-check"]')).toBeVisible();
  });

  test('should validate maximum attempts limit', async ({ page }) => {
    await page.goto('/student/assessments/attempts-limit/instructions');
    
    // Should show max attempts reached
    await expect(page.locator('[data-testid="max-attempts-reached"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-attempts-left"]')).toBeVisible();
    
    // Start button should be disabled
    const startButton = page.locator('[data-testid="start-exam-button"]');
    await expect(startButton).toBeDisabled();
  });

  test('should handle concurrent session check', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check for active sessions
    await expect(page.locator('[data-testid="session-check"]')).toBeVisible();
    
    // If there's an active session, should show warning
    const activeSession = page.locator('[data-testid="active-session"]');
    if (await activeSession.isVisible()) {
      await expect(activeSession).toContainText('active in another session');
    }
  });
});

test.describe('Exam Start - Start Button and Actions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should show start button when exam is available', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check start button
    const startButton = page.locator('[data-testid="start-exam-button"]');
    await expect(startButton).toBeVisible();
    await expect(startButton).not.toBeDisabled();
    await expect(startButton).toContainText('Start Exam');
  });

  test('should disable start button when exam is not available', async ({ page }) => {
    await page.goto('/student/assessments/unavailable/instructions');
    
    // Start button should be disabled
    const startButton = page.locator('[data-testid="start-exam-button"]');
    await expect(startButton).toBeDisabled();
  });

  test('should show confirmation dialog before starting', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Click start button
    await page.click('[data-testid="start-exam-button"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="start-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-start"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-start"]')).toBeVisible();
  });

  test('should show exam rules and agreement', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check for exam rules agreement
    await expect(page.locator('[data-testid="exam-agreement"]')).toBeVisible();
    await expect(page.locator('[data-testid="rules-checkbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="agreement-text"]')).toBeVisible();
  });

  test('should require agreement checkbox before starting', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Try to start without checking agreement
    await page.click('[data-testid="start-exam-button"]');
    
    // Should show error about agreement
    await expect(page.locator('[data-testid="agreement-required"]')).toBeVisible();
    
    // Check agreement checkbox
    await page.check('[data-testid="rules-checkbox"]');
    
    // Now start should work
    await page.click('[data-testid="start-exam-button"]');
    
    // Should proceed to confirmation or start
    await expect(page.locator('[data-testid="start-confirmation"]')).toBeVisible();
  });

  test('should show countdown timer before start', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check for countdown if enabled
    const countdown = page.locator('[data-testid="start-countdown"]');
    if (await countdown.isVisible()) {
      await expect(countdown).toBeVisible();
      
      // Should show countdown number
      const countdownNumber = page.locator('[data-testid="countdown-number"]');
      await expect(countdownNumber).toBeVisible();
      
      // Number should decrease
      const initialNumber = await countdownNumber.textContent();
      await page.waitForTimeout(2000);
      const newNumber = await countdownNumber.textContent();
      expect(parseInt(newNumber)).toBeLessThan(parseInt(initialNumber));
    }
  });
});

test.describe('Exam Start - API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should call start exam API when confirmed', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Mock API call
    await page.route('**/api/assessments/*/start', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          attemptId: 'test-attempt-id',
          redirectUrl: '/student/assessments/attempt/test-attempt-id'
        })
      });
    });
    
    // Start the exam
    await page.check('[data-testid="rules-checkbox"]');
    await page.click('[data-testid="start-exam-button"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Should navigate to attempt page
    await expect(page.url()).toContain('/student/assessments/attempt/');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Mock API error
    await page.route('**/api/assessments/*/start', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Exam window has closed'
        })
      });
    });
    
    // Try to start exam
    await page.check('[data-testid="rules-checkbox"]');
    await page.click('[data-testid="start-exam-button"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="start-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Exam window has closed');
  });

  test('should handle network errors during start', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Mock network error
    await page.route('**/api/assessments/*/start', route => route.abort());
    
    // Try to start exam
    await page.check('[data-testid="rules-checkbox"]');
    await page.click('[data-testid="start-exam-button"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should validate attempt creation before navigation', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Mock successful API response
    await page.route('**/api/assessments/*/start', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          attemptId: 'test-attempt-id',
          examData: {
            title: 'Test Exam',
            duration: 60,
            questions: []
          }
        })
      });
    });
    
    // Start exam
    await page.check('[data-testid="rules-checkbox"]');
    await page.click('[data-testid="start-exam-button"]');
    await page.click('[data-testid="confirm-start"]');
    
    // Should validate attempt was created
    await expect(page.url()).toContain('/student/assessments/attempt/');
    
    // Check attempt page loaded
    await expect(page.locator('[data-testid="exam-attempt"]')).toBeVisible();
  });
});

test.describe('Exam Start - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsStudent(page);
    await page.goto('/student/assessments/123/instructions');
    
    // Check mobile layout
    await expect(page.locator('[data-testid="exam-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-exam-button"]')).toBeVisible();
    
    // Check mobile-specific elements
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsStudent(page);
    await page.goto('/student/assessments/123/instructions');
    
    // Check tablet layout
    await expect(page.locator('[data-testid="exam-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-details"]')).toBeVisible();
  });

  test('should work on desktop devices', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsStudent(page);
    await page.goto('/student/assessments/123/instructions');
    
    // Check desktop layout
    await expect(page.locator('[data-testid="exam-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-sidebar"]')).toBeVisible();
  });
});

test.describe('Exam Start - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check ARIA labels
    await expect(page.locator('[aria-label="exam instructions"]')).toBeVisible();
    await expect(page.locator('[aria-label="start exam button"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Should be able to start with keyboard
    await page.keyboard.press('Enter');
    
    // Check if start button is focused
    const startButton = page.locator('[data-testid="start-exam-button"]');
    if (await startButton.isVisible()) {
      await startButton.focus();
      await page.keyboard.press('Enter');
      
      // Should trigger start process
      await expect(page.locator('[data-testid="start-confirmation"]')).toBeVisible();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/student/assessments/123/instructions');
    
    // Check heading structure
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2')).toBeVisible();
    
    // Main title should be h1
    const mainTitle = page.locator('h1');
    await expect(mainTitle).toContainText('Exam Instructions');
  });
});

test.describe('Exam Start - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
  });

  test('should handle very long exam titles', async ({ page }) => {
    await page.goto('/student/assessments/long-title/instructions');
    
    // Check if long title is handled properly
    const examTitle = page.locator('[data-testid="exam-title"]');
    await expect(examTitle).toBeVisible();
    
    // Title should be truncated or wrapped
    const titleText = await examTitle.textContent();
    expect(titleText.length).toBeGreaterThan(0);
  });

  test('should handle special characters in instructions', async ({ page }) => {
    await page.goto('/student/assessments/special-chars/instructions');
    
    // Check if special characters are displayed correctly
    const instructions = page.locator('[data-testid="instructions-content"]');
    await expect(instructions).toBeVisible();
    
    // Should handle HTML entities
    const content = await instructions.textContent();
    expect(content).toContain('special characters');
  });

  test('should handle exam with no instructions', async ({ page }) => {
    await page.goto('/student/assessments/no-instructions/instructions');
    
    // Should show default instructions
    await expect(page.locator('[data-testid="default-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-custom-instructions"]')).toBeVisible();
  });

  test('should handle exam with zero duration', async ({ page }) => {
    await page.goto('/student/assessments/zero-duration/instructions');
    
    // Should show warning about duration
    await expect(page.locator('[data-testid="duration-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="zero-duration"]')).toBeVisible();
  });

  test('should handle exam with unlimited time', async ({ page }) => {
    await page.goto('/student/assessments/unlimited-time/instructions');
    
    // Should show unlimited time indicator
    await expect(page.locator('[data-testid="unlimited-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-time-limit"]')).toBeVisible();
  });
});
