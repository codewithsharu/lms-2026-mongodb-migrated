# Simple AI Test Case Generation Prompts

## 🎯 SIMPLE PROMPT TEMPLATE

```
Generate 15-20 test cases for [Module Name] module.

Role: [Student/Teacher/Admin]
Route: [URL]
Component: [Component.jsx]

Key Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Include positive, negative, and edge cases. Each test case needs:
- Test ID
- Title
- Priority
- Steps
- Expected Results

Format: Clear and actionable for QA team.
```

---

## 📋 QUICK PROMPTS FOR EACH MODULE

### 🎓 STUDENT MODULES

#### 1. Authentication & Access
```
Generate 15 test cases for Student Login module.
Role: Student
Route: /login
Component: Login.jsx

Key Features:
- Email/password login
- Role-based redirection
- Session management
- Logout functionality

Include positive, negative, and edge cases.
```

#### 2. Student Dashboard
```
Generate 15 test cases for Student Dashboard module.
Role: Student
Route: /student
Component: Dashboard.jsx

Key Features:
- Assessment metrics display
- Profile information
- Quick navigation
- Real-time updates

Include positive, negative, and edge cases.
```

#### 3. Student Assessment List
```
Generate 15 test cases for Student Assessment List module.
Role: Student
Route: /student/assessments
Component: Assessments.jsx

Key Features:
- Available assessments list
- Assessment status tracking
- Start assessment flow
- Assessment filtering

Include positive, negative, and edge cases.
```

#### 4. Assessment Instructions
```
Generate 15 test cases for Assessment Instructions module.
Role: Student
Route: /student/assessments/:hostedAssessmentId/instructions
Component: AssessmentInstructions.jsx

Key Features:
- Instructions display
- Terms acceptance
- Exam details
- Start assessment

Include positive, negative, and edge cases.
```

#### 5. Assessment Attempt Flow
```
Generate 20 test cases for Assessment Attempt Flow module.
Role: Student
Route: /student/assessments/attempt/:attemptId
Component: AssessmentAttempt.jsx

Key Features:
- MCQ questions
- Fill-in-blank questions
- Coding section
- Timer functionality
- Progress tracking
- Auto-save
- Submit assessment

Include positive, negative, and edge cases.
```

#### 6. Student Results
```
Generate 15 test cases for Student Results module.
Role: Student
Route: /student/results
Component: Results.jsx

Key Features:
- Result availability
- Score breakdown
- Performance analysis
- Historical results

Include positive, negative, and edge cases.
```

---

### 👨‍🏫 TEACHER MODULES

#### 1. Teacher Dashboard
```
Generate 15 test cases for Teacher Dashboard module.
Role: Teacher
Route: /teacher
Component: Dashboard.jsx

Key Features:
- Assigned classes
- Student metrics
- Assignment statistics
- Quick navigation

Include positive, negative, and edge cases.
```

#### 2. Teacher Classes Management
```
Generate 15 test cases for Teacher Classes Management module.
Role: Teacher
Route: /teacher/classes
Component: Classes.jsx

Key Features:
- Assigned classes list
- Class details view
- Section management
- Zone assignments

Include positive, negative, and edge cases.
```

#### 3. Student Management
```
Generate 20 test cases for Teacher Student Management module.
Role: Teacher
Route: /teacher/students
Component: Students.jsx

Key Features:
- Student CRUD operations
- Bulk student operations
- Student status management
- Roll number assignment

Include positive, negative, and edge cases.
```

#### 4. Assessment Templates
```
Generate 20 test cases for Assessment Templates module.
Role: Teacher
Route: /teacher/assessments/templates
Component: AssessmentTemplates.jsx

Key Features:
- Template creation
- Template editing
- Template deletion
- Question management
- Template duplication

Include positive, negative, and edge cases.
```

#### 5. Hosted Exams Management
```
Generate 20 test cases for Hosted Exams Management module.
Role: Teacher
Route: /teacher/assessments/host
Component: HostExams.jsx

Key Features:
- Create hosted exams
- Exam configuration
- Publish/unpublish exams
- Exam scheduling
- Student targeting

Include positive, negative, and edge cases.
```

#### 6. Exam Monitoring ⭐ NEW
```
Generate 20 test cases for Exam Monitoring module.
Role: Teacher
Route: /teacher/exam-monitoring/:examId
Component: ExamMonitoring.jsx

Key Features:
- Live attempt monitoring
- Student progress tracking
- Auto-refresh functionality
- Force submission
- Search and filtering
- Real-time updates

Include positive, negative, and edge cases.
```

#### 7. Exam Reports ⭐ NEW
```
Generate 15 test cases for Exam Reports module.
Role: Teacher
Route: /teacher/exam-reports/:examId
Component: ExamReports.jsx

Key Features:
- Multiple report types
- Export functionality
- Score distribution
- Performance metrics
- Statistical insights

Include positive, negative, and edge cases.
```

#### 8. Student Attempt Details ⭐ NEW
```
Generate 15 test cases for Student Attempt Details module.
Role: Teacher
Route: /teacher/exam-monitoring/:examId/attempts/:attemptId
Component: StudentAttemptDetails.jsx

Key Features:
- Question-wise analysis
- Answer correctness display
- Progress tracking
- Score breakdown
- Coding submission review

Include positive, negative, and edge cases.
```

---

### 👨‍💼 ADMIN MODULES

#### 1. Admin Dashboard
```
Generate 15 test cases for Admin Dashboard module.
Role: Admin
Route: /admin
Component: Dashboard.jsx

Key Features:
- System statistics
- User overview
- Quick actions
- Health indicators

Include positive, negative, and edge cases.
```

#### 2. User Management
```
Generate 20 test cases for Admin User Management module.
Role: Admin
Route: /admin/students and /admin/teachers
Component: UserManagement.jsx

Key Features:
- User creation
- User editing
- User deletion
- Bulk operations
- Role assignment

Include positive, negative, and edge cases.
```

#### 3. Class Management
```
Generate 20 test cases for Admin Class Management module.
Role: Admin
Route: /admin/classes
Component: ClassManagement.jsx

Key Features:
- Class creation
- Section management
- Teacher assignment
- Academic setup
- Class activation

Include positive, negative, and edge cases.
```

#### 4. Admin Analytics
```
Generate 15 test cases for Admin Analytics module.
Role: Admin
Route: /admin/analytics
Component: Analytics.jsx

Key Features:
- System analytics
- User growth trends
- Performance metrics
- Operational insights

Include positive, negative, and edge cases.
```

#### 5. Audit Logs
```
Generate 15 test cases for Admin Audit Logs module.
Role: Admin
Route: /admin/audit-logs
Component: AuditLogs.jsx

Key Features:
- Activity logging
- Log filtering
- Security monitoring
- Error tracking
- Log management

Include positive, negative, and edge cases.
```

#### 6. System Health Check
```
Generate 15 test cases for System Health Check module.
Role: Admin
Route: /admin/health-check
Component: HealthCheck.jsx

Key Features:
- Database connectivity
- Collection status
- System metrics
- Health indicators

Include positive, negative, and edge cases.
```

---

## 🎯 USAGE INSTRUCTIONS

### For Each Module:
1. Copy the simple prompt
2. Paste into AI tool
3. Get 15-20 test cases
4. Review and adjust as needed

### Expected Output Format:
```
Test Case: [ID]
Title: [Name]
Priority: [High/Medium/Low]
Steps:
1. [Action]
2. [Action]
Expected Results: [Outcome]
```

### Total Coverage:
- **32 Modules** × **15-20 test cases** = **480-640 test cases**
- **All roles covered**: Student, Teacher, Admin
- **All features tested**: Positive, negative, edge cases

---

## 📋 MODULE LIST SUMMARY

### Student (6): Login, Dashboard, Assessments, Instructions, Attempt, Results
### Teacher (18): Dashboard, Classes, Students, Templates, Hosted, Monitoring, Reports, Details, Analytics, etc.
### Admin (8): Dashboard, Users, Classes, Analytics, Audit, Health, etc.

**Total: 32 modules with comprehensive test coverage**
