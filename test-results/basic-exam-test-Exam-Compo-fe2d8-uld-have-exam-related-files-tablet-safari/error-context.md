# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: basic-exam-test.spec.js >> Exam Component Tests >> should have exam-related files
- Location: tests\basic-exam-test.spec.js:58:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/student/assessments", waiting until "load"

```

```
Tearing down "context" exceeded the test timeout of 30000ms.
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
    - generic [ref=e52]: Need access?
    - paragraph [ref=e54]: Contact your workspace administrator to get started
    - paragraph [ref=e55]: © 2026 Assignment Portal
```