# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-exam-test.spec.js >> Basic Exam System Tests >> should load login page
- Location: tests\basic-exam-test.spec.js:9:3

# Error details

```
Error: expect(page).toHaveTitle(expected) failed

Expected pattern: /Login|Assignment Portal/
Received string:  "frontend"
Timeout: 5000ms

Call log:
  - Expect "toHaveTitle" with timeout 5000ms
    9 × unexpected value "frontend"

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - heading "Sign in" [level=2] [ref=e6]
  - paragraph [ref=e7]: Enter your credentials to continue.
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]: Email
      - generic [ref=e11]:
        - generic:
          - img
        - textbox "you@institution.edu" [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]: Password
      - generic [ref=e15]:
        - generic:
          - img
        - textbox "Enter your password" [ref=e16]
        - button "Show password" [ref=e18] [cursor=pointer]:
          - img [ref=e19]
    - generic [ref=e22]:
      - generic [ref=e23] [cursor=pointer]:
        - checkbox "Remember me" [ref=e24]
        - text: Remember me
      - button "Forgot password?" [ref=e25] [cursor=pointer]
    - button "Sign in" [ref=e26] [cursor=pointer]:
      - generic [ref=e27]: Sign in
      - img [ref=e28]
  - generic [ref=e31]: Need access?
  - paragraph [ref=e33]: Contact your workspace administrator to get started
  - paragraph [ref=e34]: © 2026 Assignment Portal
```

# Test source

```ts
  1   | /**
  2   |  * Basic Exam Functionality Test
  3   |  * Tests core exam functionality without complex login requirements
  4   |  */
  5   | 
  6   | const { test, expect } = require('@playwright/test');
  7   | 
  8   | test.describe('Basic Exam System Tests', () => {
  9   |   test('should load login page', async ({ page }) => {
  10  |     await page.goto('/login');
  11  |     
  12  |     // Check page loads
> 13  |     await expect(page).toHaveTitle(/Login|Assignment Portal/);
      |                        ^ Error: expect(page).toHaveTitle(expected) failed
  14  |     
  15  |     // Check login form elements
  16  |     await expect(page.locator('#login-email')).toBeVisible();
  17  |     await expect(page.locator('#login-password')).toBeVisible();
  18  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  19  |   });
  20  | 
  21  |   test('should load main application', async ({ page }) => {
  22  |     await page.goto('/');
  23  |     
  24  |     // Check if main page loads
  25  |     const url = page.url();
  26  |     expect(url).toMatch(/(login|dashboard|\/)/);
  27  |   });
  28  | 
  29  |   test('should have frontend service running', async ({ page }) => {
  30  |     const response = await page.goto('/');
  31  |     expect(response?.ok()).toBeTruthy();
  32  |   });
  33  | 
  34  |   test('should have proper routing structure', async ({ page }) => {
  35  |     // Test student routes
  36  |     await page.goto('/student');
  37  |     // Should redirect to login or show student dashboard
  38  |     
  39  |     // Test teacher routes
  40  |     await page.goto('/teacher');
  41  |     // Should redirect to login or show teacher dashboard
  42  |     
  43  |     // Test admin routes
  44  |     await page.goto('/admin');
  45  |     // Should redirect to login or show admin dashboard
  46  |   });
  47  | 
  48  |   test('should handle 404 routes gracefully', async ({ page }) => {
  49  |     await page.goto('/non-existent-page');
  50  |     
  51  |     // Should handle 404 gracefully
  52  |     const url = page.url();
  53  |     expect(url).toMatch(/(404|not-found|login)/);
  54  |   });
  55  | });
  56  | 
  57  | test.describe('Exam Component Tests', () => {
  58  |   test('should have exam-related files', async ({ page }) => {
  59  |     // Test if exam components can be accessed
  60  |     const response = await page.goto('/student/assessments');
  61  |     
  62  |     // Should either load assessments or redirect to login
  63  |     const url = page.url();
  64  |     expect(url).toMatch(/(assessments|login)/);
  65  |   });
  66  | 
  67  |   test('should have exam scheduling interface', async ({ page }) => {
  68  |     const response = await page.goto('/teacher/exams/create');
  69  |     
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
```