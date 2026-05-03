# AI Test Case Generation Prompts for LMS Platform

## 🎯 MASTER PROMPT TEMPLATE

```
You are an expert QA test case writer for a Learning Management System (LMS) platform. Generate comprehensive test cases for the following module:

## MODULE: [Module Name]
## ROLE: [Student/Teacher/Admin]
## ROUTE: [URL Route]
## COMPONENT: [React Component Name]

### MODULE CONTEXT:
[Brief description of what this module does and its key features]

### TECHNICAL DETAILS:
- Frontend: React.js with Tailwind CSS
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT tokens with role-based access
- Real-time features: Auto-refresh, live monitoring
- File operations: Bulk upload, export functionality

### KEY FEATURES TO TEST:
[List 3-5 main features of this module]

### USER INTERFACE ELEMENTS:
[List main UI components like buttons, forms, tables, modals]

### API ENDPOINTS:
[List relevant API endpoints if applicable]

### REQUIREMENTS:
1. Generate 15-25 test cases covering:
   - Positive scenarios (happy paths)
   - Negative scenarios (error handling)
   - Edge cases and boundary conditions
   - UI/UX validation
   - Data validation
   - Performance considerations
   - Security aspects
   - Accessibility (basic)

2. Each test case should include:
   - Test Case ID (format: [ROLE]-[MODULE]-[NUMBER])
   - Test Case Title
   - Priority (High/Medium/Low)
   - Pre-conditions
   - Test Steps (numbered, detailed)
   - Expected Results
   - Test Data (if applicable)

3. Include cross-browser and mobile responsive tests

4. Add performance and load testing scenarios where relevant

5. Consider integration points with other modules

Generate the test cases in a structured, actionable format that can be directly used by QA testers.
```

---

## 📋 MODULE-SPECIFIC PROMPTS

### 🎓 STUDENT MODULES

#### Module 1: Authentication & Access
```
## MODULE: Authentication & Access
## ROLE: Student
## ROUTE: /login
## COMPONENT: Login.jsx

### MODULE CONTEXT:
Student login interface with role-based redirection to student dashboard after successful authentication.

### KEY FEATURES TO TEST:
- Email/password login
- Role-based redirection
- Session management
- Logout functionality
- Remember me option

### USER INTERFACE ELEMENTS:
- Email input field
- Password input field
- "Remember me" checkbox
- Login button
- Forgot password link
- Error messages display

### API ENDPOINTS:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
```

#### Module 2: Student Dashboard
```
## MODULE: Student Dashboard
## ROLE: Student
## ROUTE: /student
## COMPONENT: Dashboard.jsx

### MODULE CONTEXT:
Main student dashboard showing assessment metrics, profile information, and quick navigation to assessments and results.

### KEY FEATURES TO TEST:
- Assessment metrics display (assigned, in-progress, upcoming, completed)
- Profile information display
- Quick navigation cards
- Real-time data updates
- Assessment list with details

### USER INTERFACE ELEMENTS:
- Stat cards for metrics
- Assessment list table
- Profile section
- Navigation buttons
- Refresh functionality
- Loading states

### API ENDPOINTS:
- GET /api/assessments/metrics/student
- GET /api/assessments/student/available
```

#### Module 3: Student Assessment List
```
## MODULE: Student Assessment List
## ROLE: Student
## ROUTE: /student/assessments
## COMPONENT: Assessments.jsx

### MODULE CONTEXT:
List of available assessments with status tracking, filtering capabilities, and start assessment flow.

### KEY FEATURES TO TEST:
- Available assessments list
- Assessment status (assigned, in-progress, completed)
- Start assessment button
- Assessment filtering
- Status badges
- Time window display

### USER INTERFACE ELEMENTS:
- Assessment table/list
- Filter dropdowns
- Status badges
- Start buttons
- Time display
- Pagination

### API ENDPOINTS:
- GET /api/assessments/student/available
- POST /api/assessments/student/hosted/:id/start
```

#### Module 4: Assessment Instructions
```
## MODULE: Assessment Instructions
## ROLE: Student
## ROUTE: /student/assessments/:hostedAssessmentId/instructions
## COMPONENT: AssessmentInstructions.jsx

### MODULE CONTEXT:
Pre-assessment instructions page showing exam details, rules, and terms acceptance before starting assessment.

### KEY FEATURES TO TEST:
- Assessment instructions display
- Terms and conditions acceptance
- Exam duration and timing
- Preparation guidelines
- Start assessment flow
- Back navigation

### USER INTERFACE ELEMENTS:
- Instructions text area
- Terms acceptance checkbox
- Start assessment button
- Back button
- Timer display
- Exam details card

### API ENDPOINTS:
- GET /api/assessments/hosted/:id
- POST /api/assessments/student/hosted/:id/start
```

#### Module 5: Assessment Attempt Flow
```
## MODULE: Assessment Attempt Flow
## ROLE: Student
## ROUTE: /student/assessments/attempt/:attemptId
## COMPONENT: AssessmentAttempt.jsx

### MODULE CONTEXT:
Complete assessment taking interface with MCQ, fill-in-blank, and coding sections, timer, progress tracking, and auto-save functionality.

### KEY FEATURES TO TEST:
- MCQ question navigation and answering
- Fill-in-blank questions
- Coding section with OneCompiler integration
- Timer functionality
- Progress tracking
- Auto-save functionality
- Submit assessment
- Session conflict handling
- Fullscreen mode enforcement

### USER INTERFACE ELEMENTS:
- Question navigation
- MCQ options
- Text input for fill-blank
- Code editor for coding
- Timer display
- Progress bar
- Save/Submit buttons
- Section switcher

### API ENDPOINTS:
- GET /api/assessments/student/attempts/:id
- POST /api/assessments/student/attempts/:id/autosave
- POST /api/assessments/student/attempts/:id/submit
- POST /api/assessments/student/attempts/:id/mark-mcq-complete
```

#### Module 6: Student Results
```
## MODULE: Student Results
## ROLE: Student
## ROUTE: /student/results
## COMPONENT: Results.jsx

### MODULE CONTEXT:
Student results page showing assessment history, scores, and detailed performance analytics.

### KEY FEATURES TO TEST:
- Result availability status
- Score breakdown
- Question-wise performance
- Historical results
- Result filtering
- Download functionality

### USER INTERFACE ELEMENTS:
- Results table
- Score cards
- Status badges
- Filter options
- Download buttons
- Performance charts

### API ENDPOINTS:
- GET /api/assessments/student/results
```

---

### 👨‍🏫 TEACHER MODULES

#### Module 1: Teacher Dashboard
```
## MODULE: Teacher Dashboard
## ROLE: Teacher
## ROUTE: /teacher
## COMPONENT: Dashboard.jsx

### MODULE CONTEXT:
Teacher dashboard showing assigned classes, student metrics, and quick access to assessment management tools.

### KEY FEATURES TO TEST:
- Assigned classes display
- Student count metrics
- Assignment statistics
- Quick navigation to exams and students
- Real-time data updates

### USER INTERFACE ELEMENTS:
- Stat cards
- Class list
- Navigation buttons
- Charts/graphs
- Refresh functionality

### API ENDPOINTS:
- GET /api/classes/teacher/assigned-students
- GET /api/assessments/metrics/teacher
- GET /api/assessments/hosted
```

#### Module 9: Exam Monitoring ⭐ NEW
```
## MODULE: Exam Monitoring
## ROLE: Teacher
## ROUTE: /teacher/exam-monitoring/:examId
## COMPONENT: ExamMonitoring.jsx

### MODULE CONTEXT:
Real-time exam monitoring interface showing live student attempts, progress tracking, and exam control features.

### KEY FEATURES TO TEST:
- Live attempt monitoring
- Student progress tracking
- Auto-refresh functionality
- Force submission capability
- Search and filtering
- Real-time updates
- Session conflict detection

### USER INTERFACE ELEMENTS:
- Live attempt table
- Progress bars
- Status badges
- Search/filter controls
- Force submit buttons
- Auto-refresh toggle
- Statistics cards

### API ENDPOINTS:
- GET /api/assessments/hosted/:examId/attempts
- GET /api/assessments/hosted/:examId
- POST /api/assessments/attempts/:attemptId/force-submit
```

#### Module 10: Exam Reports ⭐ NEW
```
## MODULE: Exam Reports
## ROLE: Teacher
## ROUTE: /teacher/exam-reports/:examId
## COMPONENT: ExamReports.jsx

### MODULE CONTEXT:
Comprehensive exam reporting interface with multiple report types, export functionality, and performance analytics.

### KEY FEATURES TO TEST:
- Multiple report types (Summary, Detailed, Analytics, Performance)
- Export formats (JSON, CSV, PDF)
- Score distribution analysis
- Performance metrics
- Statistical insights
- Download functionality

### USER INTERFACE ELEMENTS:
- Report type selector
- Format selector
- Generate button
- Statistics cards
- Charts/graphs
- Download buttons

### API ENDPOINTS:
- GET /api/assessments/hosted/:examId
- GET /api/assessments/hosted/:examId/attempts
```

#### Module 11: Student Attempt Details ⭐ NEW
```
## MODULE: Student Attempt Details
## ROLE: Teacher
## ROUTE: /teacher/exam-monitoring/:examId/attempts/:attemptId
## COMPONENT: StudentAttemptDetails.jsx

### MODULE CONTEXT:
Detailed student attempt analysis showing question-wise performance, answer correctness, and coding submission review.

### KEY FEATURES TO TEST:
- Question-wise analysis
- Answer correctness display
- Progress tracking
- Score breakdown
- Coding submission review
- Export functionality

### USER INTERFACE ELEMENTS:
- Question list
- Answer display
- Correct/incorrect indicators
- Score breakdown
- Progress bars
- Export button

### API ENDPOINTS:
- GET /api/assessments/attempts/:attemptId/details
- GET /api/assessments/hosted/:examId
```

---

### 👨‍💼 ADMIN MODULES

#### Module 1: Admin Dashboard
```
## MODULE: Admin Dashboard
## ROLE: Admin
## ROUTE: /admin
## COMPONENT: Dashboard.jsx

### MODULE CONTEXT:
System administration dashboard showing overall platform metrics, user statistics, and system health indicators.

### KEY FEATURES TO TEST:
- System statistics overview
- User growth trends
- System performance metrics
- Quick actions
- Health indicators

### USER INTERFACE ELEMENTS:
- Stat cards
- Charts/graphs
- Quick action buttons
- Health indicators
- Refresh controls

### API ENDPOINTS:
- GET /api/users (for stats)
- GET /api/classes (for stats)
- GET /api/assessments/metrics/admin
- GET /api/audit-logs (for stats)
```

#### Module 6: Audit Logs
```
## MODULE: Audit Logs
## ROLE: Admin
## ROUTE: /admin/audit-logs
## COMPONENT: AuditLogs.jsx

### MODULE CONTEXT:
System activity monitoring interface showing API requests, user actions, and security events with filtering and search capabilities.

### KEY FEATURES TO TEST:
- Activity logging display
- Log filtering and search
- Security monitoring
- Error tracking
- Log management (clear logs)
- Auto-refresh functionality

### USER INTERFACE ELEMENTS:
- Log table
- Filter controls
- Search input
- Status badges
- Clear logs button
- Auto-refresh toggle

### API ENDPOINTS:
- GET /api/audit-logs
- DELETE /api/audit-logs
```

---

## 🔧 SHARED MODULES

#### Module 1: Authentication System
```
## MODULE: Authentication System
## ROLE: All (Student/Teacher/Admin)
## ROUTE: /login, logout endpoints
## COMPONENT: Login.jsx, AuthContext

### MODULE CONTEXT:
Cross-role authentication system with JWT tokens, session management, and role-based access control.

### KEY FEATURES TO TEST:
- Multi-role login
- Session management
- Token handling
- Role-based redirection
- Security features
- Logout functionality

### USER INTERFACE ELEMENTS:
- Login form
- Role indicators
- Error messages
- Navigation menus

### API ENDPOINTS:
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
```

---

## 🎯 GENERATION INSTRUCTIONS

### For Each Module:

1. **Use the Master Template** as your base
2. **Replace bracketed placeholders** with module-specific information
3. **Focus on actual implemented features** from the codebase
4. **Include realistic test data** and scenarios
5. **Consider edge cases** like empty states, network errors, etc.
6. **Add performance tests** for data-heavy modules
7. **Include security tests** for authentication and data access

### Test Case Quality Standards:

- **Specific and actionable** steps
- **Measurable expected results**
- **Realistic pre-conditions**
- **Comprehensive coverage** of features
- **Clear priority levels**
- **Proper test data** examples

### Special Considerations:

- **Real-time features**: Test auto-refresh, live updates
- **File operations**: Test bulk upload, export, import
- **Role-based access**: Test permissions and restrictions
- **Mobile responsive**: Test different screen sizes
- **Cross-browser**: Test Chrome, Firefox, Safari
- **Performance**: Test with large datasets
- **Security**: Test authentication, authorization, data protection

---

## 📊 EXAMPLE OUTPUT FORMAT

```
### Test Case: STU-DASH-001
**Title**: Verify dashboard displays correct assessment metrics
**Priority**: High
**Pre-conditions**: 
- Student is logged in
- Student has assigned assessments
**Test Steps**:
1. Navigate to /student
2. Wait for dashboard to load
3. Verify assessment metrics display
4. Check each metric value
5. Verify data accuracy
**Expected Results**: 
- Dashboard loads successfully
- All metrics display correctly
- Data matches backend values
- No loading errors
**Test Data**: Student with 5 assigned assessments
```

Use these prompts to generate comprehensive test cases for each module in your LMS platform!
