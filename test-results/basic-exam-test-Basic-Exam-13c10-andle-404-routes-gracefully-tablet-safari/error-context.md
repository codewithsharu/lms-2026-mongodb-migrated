# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-exam-test.spec.js >> Basic Exam System Tests >> should handle 404 routes gracefully
- Location: tests\basic-exam-test.spec.js:48:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/non-existent-page", waiting until "load"

```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```