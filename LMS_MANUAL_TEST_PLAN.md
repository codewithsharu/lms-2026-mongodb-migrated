# LMS Platform Manual Test Plan

## Module 1: Authentication (20 Test Cases)

**AUTH-001**: Student login with valid credentials
**AUTH-002**: Student login with invalid password
**AUTH-003**: Student login with invalid email
**AUTH-004**: Teacher login with valid credentials
**AUTH-005**: Admin login with valid credentials
**AUTH-006**: Password change functionality
**AUTH-007**: Password change with wrong current password
**AUTH-008**: Logout functionality
**AUTH-009**: Session expiration
**AUTH-010**: Navigate to login page
**AUTH-011**: Login form validation
**AUTH-012**: Remember me functionality
**AUTH-013**: Forgot password flow
**AUTH-014**: Account lockout after failed attempts
**AUTH-015**: Role-based redirect after login
**AUTH-016**: Login with deactivated account
**AUTH-017**: Password strength validation
**AUTH-018**: Email format validation
**AUTH-019**: Login page responsiveness
**AUTH-020**: Login error messages

## Module 2: Student Dashboard (15 Test Cases)

**STU-DASH-001**: View student dashboard
**STU-DASH-002**: View assessment metrics
**STU-DASH-003**: View assigned assessments count
**STU-DASH-004**: View in-progress assessments count
**STU-DASH-005**: View upcoming assessments count
**STU-DASH-006**: View completed assessments count
**STU-DASH-007**: Navigate to assessments page
**STU-DASH-008**: Navigate to results page
**STU-DASH-009**: Dashboard loading state
**STU-DASH-010**: Dashboard error handling
**STU-DASH-011**: Refresh dashboard data
**STU-DASH-012**: Dashboard mobile view
**STU-DASH-013**: Dashboard statistics accuracy
**STU-DASH-014**: Dashboard navigation
**STU-DASH-015**: Dashboard logout

## Module 3: Student Assessments (25 Test Cases)

**STU-ASS-001**: View assessments list
**STU-ASS-002**: Start assessment attempt
**STU-ASS-003**: View assessment instructions
**STU-ASS-004**: Accept assessment terms
**STU-ASS-005**: Begin assessment session
**STU-ASS-006**: Navigate MCQ questions
**STU-ASS-007**: Answer MCQ questions
**STU-ASS-008**: Navigate to coding section
**STU-ASS-009**: Complete coding challenges
**STU-ASS-010**: Submit assessment answers
**STU-ASS-011**: Save assessment progress
**STU-ASS-012**: Handle assessment timeout
**STU-ASS-013**: Resume incomplete assessment
**STU-ASS-014**: View assessment confirmation
**STU-ASS-015**: Question review before submission
**STU-ASS-016**: Answer modification before submit
**STU-ASS-017**: Assessment timer functionality
**STU-ASS-018**: Question navigation controls
**STU-ASS-019**: Assessment full-screen mode
**STU-ASS-020**: Assessment exit confirmation
**STU-ASS-021**: Code editor functionality
**STU-ASS-022**: Code execution
**STU-ASS-023**: Code result display
**STU-ASS-024**: Assessment completion
**STU-ASS-025**: Assessment error handling

## Module 4: Student Results (15 Test Cases)

**STU-RES-001**: View assessment results
**STU-RES-002**: View score breakdown
**STU-RES-003**: View question-wise performance
**STU-RES-004**: View coding submission results
**STU-RES-005**: Download result report
**STU-RES-006**: View historical results
**STU-RES-007**: Filter results by assessment
**STU-RES-008**: Sort results by score
**STU-RES-009**: Results page loading
**STU-RES-010**: Results error handling
**STU-RES-011**: Results mobile view
**STU-RES-012**: Result accuracy validation
**STU-RES-013**: Result navigation
**STU-RES-014**: Result sharing
**STU-RES-015**: Result printing

## Module 5: Teacher Dashboard (15 Test Cases)

**TCH-DASH-001**: View teacher dashboard
**TCH-DASH-002**: View assigned classes data
**TCH-DASH-003**: View total assignments count
**TCH-DASH-004**: View total students count
**TCH-DASH-005**: View unique class count
**TCH-DASH-006**: Navigate to classes page
**TCH-DASH-007**: Navigate to students page
**TCH-DASH-008**: Navigate to assessments page
**TCH-DASH-009**: Dashboard loading state
**TCH-DASH-010**: Dashboard error handling
**TCH-DASH-011**: Refresh dashboard data
**TCH-DASH-012**: Dashboard mobile view
**TCH-DASH-013**: Dashboard statistics accuracy
**TCH-DASH-014**: Dashboard navigation
**TCH-DASH-015**: Dashboard logout

## Module 6: Teacher Classes (20 Test Cases)

**TCH-CLASS-001**: View assigned classes list
**TCH-CLASS-002**: View class details
**TCH-CLASS-003**: View class sections
**TCH-CLASS-004**: View assigned zones
**TCH-CLASS-005**: Filter classes by status
**TCH-CLASS-006**: Search classes
**TCH-CLASS-007**: Sort classes by name
**TCH-CLASS-008**: View class student count
**TCH-CLASS-009**: Navigate to class students
**TCH-CLASS-010**: Classes page loading
**TCH-CLASS-011**: Classes error handling
**TCH-CLASS-012**: Classes mobile view
**TCH-CLASS-013**: Class details accuracy
**TCH-CLASS-014**: Class navigation
**TCH-CLASS-015**: Class filtering
**TCH-CLASS-016**: Class search functionality
**TCH-CLASS-017**: Class sorting
**TCH-CLASS-018**: Class statistics
**TCH-CLASS-019**: Class permissions
**TCH-CLASS-020**: Class management

## Module 7: Teacher Students (25 Test Cases)

**TCH-STUD-001**: View assigned students
**TCH-STUD-002**: View student list by class
**TCH-STUD-003**: View student list by section
**TCH-STUD-004**: View student list by zone
**TCH-STUD-005**: Search students
**TCH-STUD-006**: Filter students by status
**TCH-STUD-007**: Sort students by name
**TCH-STUD-008**: Sort students by roll number
**TCH-STUD-009**: View student details
**TCH-STUD-010**: Add new student
**TCH-STUD-011**: Edit student information
**TCH-STUD-012**: Update student roll number
**TCH-STUD-013**: Update student section
**TCH-STUD-014**: Update student zone
**TCH-STUD-015**: Activate/deactivate student
**TCH-STUD-016**: Remove student from class
**TCH-STUD-017**: Bulk student upload
**TCH-STUD-018**: Preview bulk upload data
**TCH-STUD-019**: Process bulk upload results
**TCH-STUD-020**: Student page loading
**TCH-STUD-021**: Student error handling
**TCH-STUD-022**: Student mobile view
**TCH-STUD-023**: Student search accuracy
**TCH-STUD-024**: Student filtering
**TCH-STUD-025**: Student management

## Module 8: Teacher Assessment Templates (20 Test Cases)

**TCH-TEMP-001**: View assessment templates list
**TCH-TEMP-002**: Create new assessment template
**TCH-TEMP-003**: Edit assessment template
**TCH-TEMP-004**: Delete assessment template
**TCH-TEMP-005**: Duplicate assessment template
**TCH-TEMP-006**: Add MCQ questions
**TCH-TEMP-007**: Add fill-in-blank questions
**TCH-TEMP-008**: Set question marks
**TCH-TEMP-009**: Configure question options
**TCH-TEMP-010**: Preview assessment template
**TCH-TEMP-011**: Save assessment template
**TCH-TEMP-012**: Template validation
**TCH-TEMP-013**: Templates page loading
**TCH-TEMP-014**: Templates error handling
**TCH-TEMP-015**: Templates mobile view
**TCH-TEMP-016**: Template creation flow
**TCH-TEMP-017**: Template editing
**TCH-TEMP-018**: Template deletion
**TCH-TEMP-019**: Template duplication
**TCH-TEMP-020**: Template management

## Module 9: Teacher Hosted Exams (25 Test Cases)

**TCH-HOST-001**: View hosted exams list
**TCH-HOST-002**: Create new hosted exam
**TCH-HOST-003**: Select assessment template
**TCH-HOST-004**: Configure exam settings
**TCH-HOST-005**: Set exam duration
**TCH-HOST-006**: Set exam start time
**TCH-HOST-007**: Set exam end time
**TCH-HOST-008**: Configure result visibility
**TCH-HOST-009**: Target specific students
**TCH-HOST-010**: Target classes
**TCH-HOST-011**: Target sections
**TCH-HOST-012**: Target zones
**TCH-HOST-013**: Enable coding section
**TCH-HOST-014**: Select coding challenges
**TCH-HOST-015**: Set coding time allocation
**TCH-HOST-016**: Preview hosted exam
**TCH-HOST-017**: Publish hosted exam
**TCH-HOST-018**: Close hosted exam
**TCH-HOST-019**: View exam participants
**TCH-HOST-020**: Monitor exam progress
**TCH-HOST-021**: View exam analytics
**TCH-HOST-022**: Generate exam reports
**TCH-HOST-023**: Export exam results
**TCH-HOST-024**: View student attempts
**TCH-HOST-025**: Exam management

## Module 10: Admin User Management (20 Test Cases)

**ADM-USER-001**: View all users list
**ADM-USER-002**: Filter users by role
**ADM-USER-003**: Filter users by class
**ADM-USER-004**: Filter users by section
**ADM-USER-005**: Filter users by zone
**ADM-USER-006**: Search users by email
**ADM-USER-007**: Search users by name
**ADM-USER-008**: Sort users by creation date
**ADM-USER-009**: Create single student user
**ADM-USER-010**: Create single teacher user
**ADM-USER-011**: Edit user information
**ADM-USER-012**: Update user email
**ADM-USER-013**: Update user name
**ADM-USER-014**: Activate/deactivate user
**ADM-USER-015**: Reset user password
**ADM-USER-016**: Delete user account
**ADM-USER-017**: Bulk user upload
**ADM-USER-018**: Download upload template
**ADM-USER-019**: User data export
**ADM-USER-020**: User management

## Module 11: Admin Class Management (15 Test Cases)

**ADM-CLASS-001**: View all classes list
**ADM-CLASS-002**: Create new class
**ADM-CLASS-003**: Edit class information
**ADM-CLASS-004**: Delete class
**ADM-CLASS-005**: Set class name
**ADM-CLASS-006**: Set class description
**ADM-CLASS-007**: Set academic year
**ADM-CLASS-008**: Activate/deactivate class
**ADM-CLASS-009**: View class student count
**ADM-CLASS-010**: View class sections
**ADM-CLASS-011**: Create new section
**ADM-CLASS-012**: Edit section name
**ADM-CLASS-013**: Delete section
**ADM-CLASS-014**: View section student count
**ADM-CLASS-015**: Class management

## Module 12: Admin Teacher Assignment (15 Test Cases)

**ADM-ASSIGN-001**: View teacher list
**ADM-ASSIGN-002**: Filter active teachers
**ADM-ASSIGN-003**: Search teachers by name
**ADM-ASSIGN-004**: Search teachers by email
**ADM-ASSIGN-005**: View teacher details
**ADM-ASSIGN-006**: Assign teacher to class
**ADM-ASSIGN-007**: Assign teacher to section
**ADM-ASSIGN-008**: Assign teacher to zone
**ADM-ASSIGN-009**: Handle duplicate assignments
**ADM-ASSIGN-010**: Bulk teacher assignment
**ADM-ASSIGN-011**: Upload assignment file
**ADM-ASSIGN-012**: Process assignment data
**ADM-ASSIGN-013**: Remove teacher assignment
**ADM-ASSIGN-014**: View assignment history
**ADM-ASSIGN-015**: Assignment management

## Module 13: Admin Dashboard (10 Test Cases)

**ADM-DASH-001**: View admin dashboard
**ADM-DASH-002**: View system statistics
**ADM-DASH-003**: View user statistics
**ADM-DASH-004**: View class statistics
**ADM-DASH-005**: View assessment statistics
**ADM-DASH-006**: Navigate to user management
**ADM-DASH-007**: Navigate to class management
**ADM-DASH-008**: Navigate to teacher assignment
**ADM-DASH-009**: Dashboard loading
**ADM-DASH-010**: Dashboard navigation

## Module 14: Compiler/Code Runner (15 Test Cases)

**COMP-001**: Access code runner page
**COMP-002**: Select programming language
**COMP-003**: Write code in editor
**COMP-004**: Run code execution
**COMP-005**: View code output
**COMP-006**: View code errors
**COMP-007**: Test code with sample input
**COMP-008**: Save code snippet
**COMP-009**: Load saved code
**COMP-010**: Clear code editor
**COMP-011**: Editor syntax highlighting
**COMP-012**: Code auto-completion
**COMP-013**: Code formatting
**COMP-014**: Multiple file support
**COMP-015**: Code sharing

## Module 15: Navigation & UI (15 Test Cases)

**UI-001**: Main navigation menu
**UI-002**: Sidebar navigation
**UI-003**: Breadcrumb navigation
**UI-004**: Page transitions
**UI-005**: Mobile menu toggle
**UI-006**: Responsive design
**UI-007**: Page loading states
**UI-008**: Error page display
**UI-009**: 404 error handling
**UI-010**: Form validation messages
**UI-011**: Success notifications
**UI-012**: Error notifications
**UI-013**: Loading spinners
**UI-014**: Modal dialogs
**UI-015**: Tooltips

---

**Total Manual Test Cases: 240**

This manual test plan covers only the actual features of your LMS platform based on the frontend components and backend routes. Each test case is designed for manual execution by testers focusing on end-to-end user workflows.
