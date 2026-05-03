const path = require("path");
const XLSX = require("xlsx");

const outputArg = process.argv[2];
const outputPath = outputArg
  ? path.resolve(outputArg)
  : path.resolve(__dirname, "..", "..", "teacher-student-checklist.xlsx");

const headers = [
  "ID",
  "Area",
  "Module",
  "Test Case",
  "Steps",
  "Expected Result",
  "Status",
  "Evidence",
  "Notes"
];

const rows = [
  {
    ID: "AUTO-01",
    Area: "Automated",
    Module: "Backend",
    "Test Case": "Backend test script exists",
    Steps: "Run npm test",
    "Expected Result": "Tests run successfully",
    Status: "Not Configured",
    Evidence: "package.json has no tests",
    Notes: "Backend script exits with Error: no test specified"
  },
  {
    ID: "AUTO-02",
    Area: "Automated",
    Module: "Frontend",
    "Test Case": "Frontend test script exists",
    Steps: "Run npm test or npm run test",
    "Expected Result": "Tests run successfully",
    Status: "Not Configured",
    Evidence: "package.json has no test script",
    Notes: "Consider adding unit or e2e tests"
  },
  {
    ID: "TEACH-01",
    Area: "Teacher",
    Module: "Auth",
    "Test Case": "Teacher login",
    Steps: "Login with teacher credentials",
    "Expected Result": "Teacher dashboard loads",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-02",
    Area: "Teacher",
    Module: "Dashboard",
    "Test Case": "Dashboard summary metrics",
    Steps: "Open teacher dashboard",
    "Expected Result": "Metrics render without errors",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-03",
    Area: "Teacher",
    Module: "Analytics",
    "Test Case": "Analytics charts render",
    Steps: "Open analytics page",
    "Expected Result": "Charts and legends display",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-04",
    Area: "Teacher",
    Module: "Classes",
    "Test Case": "Create class",
    Steps: "Create a new class",
    "Expected Result": "Class appears in list",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-05",
    Area: "Teacher",
    Module: "Classes",
    "Test Case": "View class details",
    Steps: "Open class details view",
    "Expected Result": "Roster and class metadata show",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-06",
    Area: "Teacher",
    Module: "Students",
    "Test Case": "Add student to class",
    Steps: "Add or import a student",
    "Expected Result": "Student appears in roster",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-07",
    Area: "Teacher",
    Module: "Assessments",
    "Test Case": "Create assessment template",
    Steps: "Open template builder and save",
    "Expected Result": "Template saved and listed",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-08",
    Area: "Teacher",
    Module: "Assessments",
    "Test Case": "Edit assessment template",
    Steps: "Open existing template and edit",
    "Expected Result": "Changes persist",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-09",
    Area: "Teacher",
    Module: "Hosted Exams",
    "Test Case": "Create hosted exam",
    Steps: "Create hosted exam from template",
    "Expected Result": "Hosted exam appears in list",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-10",
    Area: "Teacher",
    Module: "Hosted Exams",
    "Test Case": "Publish hosted exam",
    Steps: "Open hosted exam and publish",
    "Expected Result": "Exam status shows published",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-11",
    Area: "Teacher",
    Module: "Challenge Builder",
    "Test Case": "Create coding challenge",
    Steps: "Create challenge and save",
    "Expected Result": "Challenge saved in list",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-12",
    Area: "Teacher",
    Module: "Challenge Runner",
    "Test Case": "Run challenge preview",
    Steps: "Open challenge and run preview",
    "Expected Result": "Runner executes and shows output",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "TEACH-13",
    Area: "Teacher",
    Module: "Audit Logs",
    "Test Case": "View audit logs",
    Steps: "Open audit logs page",
    "Expected Result": "Logs list loads",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-01",
    Area: "Student",
    Module: "Auth",
    "Test Case": "Student login",
    Steps: "Login with student credentials",
    "Expected Result": "Student dashboard loads",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-02",
    Area: "Student",
    Module: "Dashboard",
    "Test Case": "Dashboard overview",
    Steps: "Open student dashboard",
    "Expected Result": "Assigned items display",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-03",
    Area: "Student",
    Module: "Assessments",
    "Test Case": "Assessments list",
    Steps: "Open assessments page",
    "Expected Result": "List loads without errors",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-04",
    Area: "Student",
    Module: "Assessments",
    "Test Case": "Assessment instructions",
    Steps: "Open assessment instructions",
    "Expected Result": "Instructions and metadata show",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-05",
    Area: "Student",
    Module: "Assessment Attempt",
    "Test Case": "Start assessment",
    Steps: "Begin assessment attempt",
    "Expected Result": "Questions load and timer starts",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-06",
    Area: "Student",
    Module: "Assessment Attempt",
    "Test Case": "Submit assessment",
    Steps: "Submit answers",
    "Expected Result": "Submission succeeds and locks attempt",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-07",
    Area: "Student",
    Module: "Results",
    "Test Case": "View results",
    Steps: "Open results page",
    "Expected Result": "Scores and feedback display",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "STUD-08",
    Area: "Student",
    Module: "Challenge Runner",
    "Test Case": "Run assigned challenge",
    Steps: "Open challenge and run",
    "Expected Result": "Runner executes and records output",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "SEC-01",
    Area: "Security",
    Module: "Role Access",
    "Test Case": "Teacher cannot access student-only pages",
    Steps: "Try to open student routes as teacher",
    "Expected Result": "Access denied or redirected",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  },
  {
    ID: "SEC-02",
    Area: "Security",
    Module: "Role Access",
    "Test Case": "Student cannot access teacher-only pages",
    Steps: "Try to open teacher routes as student",
    "Expected Result": "Access denied or redirected",
    Status: "Not Run",
    Evidence: "",
    Notes: ""
  }
];

const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Checklist");
XLSX.writeFile(workbook, outputPath);

console.log(`Checklist written to ${outputPath}`);
