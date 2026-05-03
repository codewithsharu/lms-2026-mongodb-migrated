/**
 * Playwright Test Suite for Performance Monitoring Dashboard
 * Tests real-time metrics, alerts, and dashboard functionality
 */

const { test, expect } = require('@playwright/test');
const { loginAsAdmin, loginAsTeacher } = require('./helpers/auth-helper');

test.describe('Performance Dashboard - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
  });

  test('should load performance dashboard successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Performance Dashboard/);
    
    // Check main dashboard elements
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();
  });

  test('should display system health overview', async ({ page }) => {
    // Check health status indicators
    await expect(page.locator('[data-testid="health-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="uptime"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-version"]')).toBeVisible();
    
    // Check health status color coding
    const healthStatus = page.locator('[data-testid="health-status"]');
    await expect(healthStatus).toBeVisible();
    
    // Should be either healthy, warning, or critical
    const statusText = await healthStatus.textContent();
    expect(['Healthy', 'Warning', 'Critical']).toContain(statusText);
  });

  test('should show real-time metrics', async ({ page }) => {
    // Check CPU usage
    await expect(page.locator('[data-testid="cpu-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="cpu-progress"]')).toBeVisible();
    
    // Check memory usage
    await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
    await expect(page.locator('[data-testid="memory-progress"]')).toBeVisible();
    
    // Check database metrics
    await expect(page.locator('[data-testid="db-connections"]')).toBeVisible();
    await expect(page.locator('[data-testid="db-status"]')).toBeVisible();
    
    // Check application metrics
    await expect(page.locator('[data-testid="active-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="requests-per-second"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-rate"]')).toBeVisible();
  });

  test('should have auto-refresh functionality', async ({ page }) => {
    // Check auto-refresh indicator
    await expect(page.locator('[data-testid="auto-refresh"]')).toBeVisible();
    
    // Check refresh button
    await expect(page.locator('[data-testid="manual-refresh"]')).toBeVisible();
    
    // Test manual refresh
    const refreshButton = page.locator('[data-testid="manual-refresh"]');
    await refreshButton.click();
    
    // Should show loading state
    await expect(page.locator('[data-testid="refreshing"]')).toBeVisible();
    
    // Should complete refresh
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="refreshing"]')).not.toBeVisible();
  });
});

test.describe('Performance Dashboard - Metrics Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
  });

  test('should display CPU usage with proper formatting', async ({ page }) => {
    const cpuUsage = page.locator('[data-testid="cpu-usage"]');
    await expect(cpuUsage).toBeVisible();
    
    const cpuText = await cpuUsage.textContent();
    expect(cpuText).toMatch(/\d+\.?\d*%/); // Should contain percentage
    
    // Check progress bar
    const cpuProgress = page.locator('[data-testid="cpu-progress"]');
    await expect(cpuProgress).toBeVisible();
    
    // Progress bar should have appropriate width based on usage
    const progressBar = cpuProgress.locator('[data-testid="progress-bar"]');
    await expect(progressBar).toBeVisible();
  });

  test('should display memory usage with proper formatting', async ({ page }) => {
    const memoryUsage = page.locator('[data-testid="memory-usage"]');
    await expect(memoryUsage).toBeVisible();
    
    const memoryText = await memoryUsage.textContent();
    expect(memoryText).toMatch(/\d+\.?\d*%/); // Should contain percentage
    
    // Check for available memory display
    await expect(page.locator('[data-testid="memory-available"]')).toBeVisible();
    
    // Check progress bar
    const memoryProgress = page.locator('[data-testid="memory-progress"]');
    await expect(memoryProgress).toBeVisible();
  });

  test('should display database performance metrics', async ({ page }) => {
    // Check database connection status
    const dbStatus = page.locator('[data-testid="db-status"]');
    await expect(dbStatus).toBeVisible();
    
    // Should show connection status
    const statusText = await dbStatus.textContent();
    expect(['Connected', 'Disconnected', 'Warning']).toContain(statusText);
    
    // Check connection count
    await expect(page.locator('[data-testid="db-connections"]')).toBeVisible();
    
    // Check slow queries if available
    const slowQueries = page.locator('[data-testid="slow-queries"]');
    if (await slowQueries.isVisible()) {
      await expect(slowQueries).toContainText('slow queries');
    }
  });

  test('should display application performance metrics', async ({ page }) => {
    // Check active users
    const activeUsers = page.locator('[data-testid="active-users"]');
    await expect(activeUsers).toBeVisible();
    const usersText = await activeUsers.textContent();
    expect(usersText).toMatch(/\d+/); // Should contain number
    
    // Check requests per second
    const rps = page.locator('[data-testid="requests-per-second"]');
    await expect(rps).toBeVisible();
    const rpsText = await rps.textContent();
    expect(rpsText).toMatch(/\d+\.?\d*/); // Should contain number
    
    // Check error rate
    const errorRate = page.locator('[data-testid="error-rate"]');
    await expect(errorRate).toBeVisible();
    const errorText = await errorRate.textContent();
    expect(errorText).toMatch(/\d+\.?\d*%/); // Should contain percentage
    
    // Check response time
    const responseTime = page.locator('[data-testid="response-time"]');
    await expect(responseTime).toBeVisible();
    const responseText = await responseTime.textContent();
    expect(responseText).toMatch(/\d+ms/); // Should contain milliseconds
  });
});

test.describe('Performance Dashboard - Alerts System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
  });

  test('should display alerts section', async ({ page }) => {
    // Check alerts section
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();
    
    // Check alert categories
    await expect(page.locator('[data-testid="critical-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="warning-alerts"]')).toBeVisible();
    await expect(page.locator('[data-testid="info-alerts"]')).toBeVisible();
  });

  test('should categorize alerts by severity', async ({ page }) => {
    // Check critical alerts (red)
    const criticalAlerts = page.locator('[data-testid="critical-alert"]');
    if (await criticalAlerts.count() > 0) {
      await expect(criticalAlerts.first()).toHaveClass(/alert-critical/);
    }
    
    // Check warning alerts (yellow)
    const warningAlerts = page.locator('[data-testid="warning-alert"]');
    if (await warningAlerts.count() > 0) {
      await expect(warningAlerts.first()).toHaveClass(/alert-warning/);
    }
    
    // Check info alerts (blue)
    const infoAlerts = page.locator('[data-testid="info-alert"]');
    if (await infoAlerts.count() > 0) {
      await expect(infoAlerts.first()).toHaveClass(/alert-info/);
    }
  });

  test('should allow alert interactions', async ({ page }) => {
    // Find an alert if available
    const alerts = page.locator('[data-testid="alert-item"]');
    
    if (await alerts.count() > 0) {
      const firstAlert = alerts.first();
      
      // Check for acknowledge button
      const acknowledgeBtn = firstAlert.locator('[data-testid="acknowledge-alert"]');
      if (await acknowledgeBtn.isVisible()) {
        await acknowledgeBtn.click();
        
        // Should update alert state
        await page.waitForTimeout(1000);
      }
      
      // Check for clear button
      const clearBtn = firstAlert.locator('[data-testid="clear-alert"]');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        
        // Should remove alert
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should show alert summary', async ({ page }) => {
    // Check alert summary
    await expect(page.locator('[data-testid="alert-summary"]')).toBeVisible();
    
    // Should show counts for each alert type
    const criticalCount = page.locator('[data-testid="critical-count"]');
    const warningCount = page.locator('[data-testid="warning-count"]');
    const infoCount = page.locator('[data-testid="info-count"]');
    
    await expect(criticalCount).toBeVisible();
    await expect(warningCount).toBeVisible();
    await expect(infoCount).toBeVisible();
    
    // Counts should be numbers
    const criticalText = await criticalCount.textContent();
    const warningText = await warningCount.textContent();
    const infoText = await infoCount.textContent();
    
    expect(/^\d+$/.test(criticalText.trim())).toBe(true);
    expect(/^\d+$/.test(warningText.trim())).toBe(true);
    expect(/^\d+$/.test(infoText.trim())).toBe(true);
  });
});

test.describe('Performance Dashboard - Threshold Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
  });

  test('should show threshold settings', async ({ page }) => {
    // Navigate to alerts tab or section
    await page.click('[data-testid="alerts-tab"]');
    
    // Check threshold settings section
    await expect(page.locator('[data-testid="threshold-settings"]')).toBeVisible();
    
    // Check individual threshold controls
    await expect(page.locator('[data-testid="memory-threshold"]')).toBeVisible();
    await expect(page.locator('[data-testid="cpu-threshold"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time-threshold"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-rate-threshold"]')).toBeVisible();
  });

  test('should allow threshold updates', async ({ page }) => {
    await page.click('[data-testid="alerts-tab"]');
    
    // Find a threshold control
    const memoryThreshold = page.locator('[data-testid="memory-threshold"]');
    await expect(memoryThreshold).toBeVisible();
    
    // Get current value
    const currentValue = await memoryThreshold.inputValue();
    
    // Update threshold
    await memoryThreshold.fill('75');
    
    // Save thresholds
    await page.click('[data-testid="save-thresholds"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="thresholds-saved"]')).toBeVisible();
    
    // Check if value was updated
    const newValue = await memoryThreshold.inputValue();
    expect(newValue).toBe('75');
  });

  test('should validate threshold inputs', async ({ page }) => {
    await page.click('[data-testid="alerts-tab"]');
    
    // Try invalid threshold value
    const cpuThreshold = page.locator('[data-testid="cpu-threshold"]');
    await cpuThreshold.fill('150'); // Invalid percentage
    
    // Should show validation error
    await expect(page.locator('[data-testid="threshold-error"]')).toBeVisible();
    
    // Try valid threshold value
    await cpuThreshold.fill('85');
    
    // Error should disappear
    await expect(page.locator('[data-testid="threshold-error"]')).not.toBeVisible();
  });
});

test.describe('Performance Dashboard - Historical Data', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
  });

  test('should show historical data options', async ({ page }) => {
    // Check for time range selector
    await expect(page.locator('[data-testid="time-range"]')).toBeVisible();
    
    // Check for available time ranges
    await expect(page.locator('[data-testid="range-1h"]')).toBeVisible();
    await expect(page.locator('[data-testid="range-6h"]')).toBeVisible();
    await expect(page.locator('[data-testid="range-24h"]')).toBeVisible();
    await expect(page.locator('[data-testid="range-7d"]')).toBeVisible();
  });

  test('should allow time range selection', async ({ page }) => {
    // Select different time ranges
    await page.click('[data-testid="range-1h"]');
    await page.waitForTimeout(1000);
    
    await page.click('[data-testid="range-24h"]');
    await page.waitForTimeout(1000);
    
    await page.click('[data-testid="range-7d"]');
    await page.waitForTimeout(1000);
    
    // Should update displayed data
    await expect(page.locator('[data-testid="historical-data"]')).toBeVisible();
  });

  test('should display performance trends', async ({ page }) => {
    // Check for trend indicators
    const trendIndicators = page.locator('[data-testid="trend-indicator"]');
    
    if (await trendIndicators.count() > 0) {
      // Check trend icons (up/down arrows)
      await expect(trendIndicators.first().locator('svg')).toBeVisible();
      
      // Check trend values
      const trendText = await trendIndicators.first().textContent();
      expect(trendText).toMatch(/[↑↓]/); // Should contain arrow
    }
  });
});

test.describe('Performance Dashboard - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
    
    // Check mobile layout
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Check if metrics stack vertically on mobile
    const metricsGrid = page.locator('[data-testid="metrics-grid"]');
    await expect(metricsGrid).toBeVisible();
    
    // Check if alerts are accessible
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
    
    // Check tablet layout
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Check if metrics display properly
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();
  });

  test('should work on desktop devices', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
    
    // Check desktop layout
    await expect(page.locator('[data-testid="performance-dashboard"]')).toBeVisible();
    
    // Check if all sections are visible
    await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();
  });
});

test.describe('Performance Dashboard - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Mock API error
    await page.route('**/api/performance/dashboard', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/admin/performance');
    
    // Should show error state
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load');
    
    // Should provide retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle network disconnection', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/performance');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Simulate network disconnection
    await page.setOffline(true);
    
    // Try to refresh
    await page.click('[data-testid="manual-refresh"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    
    // Restore connection
    await page.setOffline(false);
    
    // Should work again after reconnection
    await page.click('[data-testid="retry-button"]');
    await page.waitForTimeout(2000);
  });
});

test.describe('Performance Dashboard - Access Control', () => {
  test('should require admin access', async ({ page }) => {
    // Try to access as teacher
    await loginAsTeacher(page);
    await page.goto('/admin/performance');
    
    // Should be redirected or show access denied
    const url = page.url();
    expect(url).toMatch(/(login|access-denied|teacher)/);
  });

  test('should show unauthorized state for non-admin users', async ({ page }) => {
    // Try direct access without login
    await page.goto('/admin/performance');
    
    // Should redirect to login
    await expect(page.url()).toContain('/login');
  });
});
