# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-exam-test.spec.js >> Error Handling Tests >> should handle network errors
- Location: tests\basic-exam-test.spec.js:165:3

# Error details

```
TypeError: page.setOffline is not a function
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - paragraph [ref=e6]: Assignment Portal
    - generic [ref=e7]:
      - heading "Smart Assignment Management for Students & Faculty" [level=1] [ref=e8]:
        - text: Smart Assignment Management
        - text: for Students & Faculty
      - paragraph [ref=e9]: A centralized academic platform designed to simplify assignment submission, tracking, and evaluation.
      - generic [ref=e10]:
        - generic [ref=e13]: Efficient assignment submission and management
        - generic [ref=e16]: Real-time progress tracking and notifications
        - generic [ref=e19]: Secure access for students, faculty, and administrators
        - generic [ref=e22]: Reliable system built to support academic workflows
    - paragraph [ref=e24]: Trusted by institutions to streamline academic tasks and collaboration.
  - generic [ref=e26]:
    - heading "Sign in" [level=2] [ref=e27]
    - paragraph [ref=e28]: Enter your credentials to continue.
    - generic [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]: Email
        - generic [ref=e32]:
          - generic:
            - img
          - textbox "you@institution.edu" [ref=e33]
      - generic [ref=e34]:
        - generic [ref=e35]: Password
        - generic [ref=e36]:
          - generic:
            - img
          - textbox "Enter your password" [ref=e37]
          - button "Show password" [ref=e39] [cursor=pointer]:
            - img [ref=e40]
      - generic [ref=e43]:
        - generic [ref=e44] [cursor=pointer]:
          - checkbox "Remember me" [ref=e45]
          - text: Remember me
        - button "Forgot password?" [ref=e46] [cursor=pointer]
      - button "Sign in" [ref=e47] [cursor=pointer]:
        - generic [ref=e48]: Sign in
        - img [ref=e49]
    - generic [ref=e53]: Need access?
    - paragraph [ref=e55]: Contact your workspace administrator to get started
    - paragraph [ref=e56]: © 2026 Assignment Portal
```

# Test source

```ts
  70  |     // Should either load exam creation or redirect to login
  71  |     const url = page.url();
  72  |     expect(url).toMatch(/(exams|create|login)/);
  73  |   });
  74  | 
  75  |   test('should have performance monitoring', async ({ page }) => {
  76  |     const response = await page.goto('/admin/performance');
  77  |     
  78  |     // Should either load performance dashboard or redirect to login
  79  |     const url = page.url();
  80  |     expect(url).toMatch(/(performance|admin|login)/);
  81  |   });
  82  | });
  83  | 
  84  | test.describe('API Endpoint Tests', () => {
  85  |   test('should have backend API endpoints available', async ({ page }) => {
  86  |     // Test if backend API is accessible
  87  |     try {
  88  |       const response = await page.goto('http://localhost:5000/api/health');
  89  |       // If this works, backend is accessible
  90  |     } catch (error) {
  91  |       // Backend might not be accessible from frontend context
  92  |       console.log('Backend API test skipped - not accessible from frontend');
  93  |     }
  94  |   });
  95  | 
  96  |   test('should handle API errors gracefully', async ({ page }) => {
  97  |     // Test API error handling
  98  |     try {
  99  |       const response = await page.evaluate(async () => {
  100 |         const response = await fetch('/api/non-existent-endpoint');
  101 |         return {
  102 |           status: response.status,
  103 |           ok: response.ok
  104 |         };
  105 |       });
  106 |       
  107 |       // Should handle 404 gracefully
  108 |       expect(response.status).toBe(404);
  109 |     } catch (error) {
  110 |       // API might not be available
  111 |       console.log('API test skipped - API not available');
  112 |     }
  113 |   });
  114 | });
  115 | 
  116 | test.describe('Frontend Build Tests', () => {
  117 |   test('should have proper React components', async ({ page }) => {
  118 |     // Test if React app loads properly
  119 |     await page.goto('/');
  120 |     
  121 |     // Check for React root element
  122 |     const reactRoot = page.locator('#root');
  123 |     await expect(reactRoot).toBeVisible();
  124 |   });
  125 | 
  126 |   test('should have proper CSS and styling', async ({ page }) => {
  127 |     await page.goto('/login');
  128 |     
  129 |     // Check if CSS loads properly
  130 |     const loginForm = page.locator('.login-form');
  131 |     await expect(loginForm).toBeVisible();
  132 |   });
  133 | 
  134 |   test('should have responsive design', async ({ page }) => {
  135 |     await page.goto('/login');
  136 |     
  137 |     // Test mobile viewport
  138 |     await page.setViewportSize({ width: 375, height: 667 });
  139 |     await expect(page.locator('.login-form')).toBeVisible();
  140 |     
  141 |     // Test desktop viewport
  142 |     await page.setViewportSize({ width: 1920, height: 1080 });
  143 |     await expect(page.locator('.login-form')).toBeVisible();
  144 |   });
  145 | });
  146 | 
  147 | test.describe('Error Handling Tests', () => {
  148 |   test('should handle JavaScript errors', async ({ page }) => {
  149 |     const errors = [];
  150 |     page.on('pageerror', error => {
  151 |       errors.push(error);
  152 |     });
  153 |     
  154 |     await page.goto('/');
  155 |     
  156 |     // Check for JavaScript errors
  157 |     if (errors.length > 0) {
  158 |       console.log('JavaScript errors found:', errors);
  159 |     }
  160 |     
  161 |     // Should not have critical JavaScript errors
  162 |     expect(errors.length).toBeLessThan(5);
  163 |   });
  164 | 
  165 |   test('should handle network errors', async ({ page }) => {
  166 |     // Test network error handling
  167 |     await page.goto('/');
  168 |     
  169 |     // Simulate network offline
> 170 |     await page.setOffline(true);
      |                ^ TypeError: page.setOffline is not a function
  171 |     
  172 |     // Try to navigate
  173 |     await page.goto('/student/assessments');
  174 |     
  175 |     // Restore network
  176 |     await page.setOffline(false);
  177 |     
  178 |     // Should handle network issues gracefully
  179 |     const url = page.url();
  180 |     expect(url).toMatch(/(assessments|login)/);
  181 |   });
  182 | });
  183 | 
  184 | test.describe('Performance Tests', () => {
  185 |   test('should load pages within reasonable time', async ({ page }) => {
  186 |     const startTime = Date.now();
  187 |     
  188 |     await page.goto('/login');
  189 |     
  190 |     const loadTime = Date.now() - startTime;
  191 |     
  192 |     // Should load within 5 seconds
  193 |     expect(loadTime).toBeLessThan(5000);
  194 |   });
  195 | 
  196 |   test('should not have memory leaks', async ({ page }) => {
  197 |     // Test for basic memory issues
  198 |     await page.goto('/login');
  199 |     
  200 |     // Check if page is responsive
  201 |     await expect(page.locator('#login-email')).toBeVisible();
  202 |     
  203 |     // Basic memory test - should not crash
  204 |     await page.reload();
  205 |     await expect(page.locator('#login-email')).toBeVisible();
  206 |   });
  207 | });
  208 | 
```