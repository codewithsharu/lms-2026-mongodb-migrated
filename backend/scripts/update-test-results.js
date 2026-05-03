const path = require("path");
const XLSX = require("xlsx");

const inputArg = process.argv[2];
const filePath = inputArg
  ? path.resolve(inputArg)
  : path.resolve(__dirname, "..", "..", "teacher-student-checklist.xlsx");

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

if (rows.length === 0) {
  throw new Error("Checklist sheet is empty");
}

const headers = rows[0];
const colIndex = (name) => headers.indexOf(name);

const idCol = colIndex("ID");
const statusCol = colIndex("Status");
const evidenceCol = colIndex("Evidence");
const notesCol = colIndex("Notes");

const update = (id, status, evidence, notes) => {
  const row = rows.find((r) => r[idCol] === id);
  if (!row) return;
  if (statusCol !== -1 && status) row[statusCol] = status;
  if (evidenceCol !== -1 && evidence) row[evidenceCol] = evidence;
  if (notesCol !== -1 && notes) row[notesCol] = notes;
};

// Teacher tests
update("TEACH-01", "Pass", "Login -> /teacher", "teacher@edu.in / edu@123");
update("TEACH-02", "Pass", "Dashboard loads", "Metrics tiles rendered");
update(
  "TEACH-03",
  "Pass",
  "/teacher/analytics",
  "Charts render but console warns about width/height -1"
);
update(
  "TEACH-04",
  "Blocked",
  "No create class action visible",
  "Teacher view appears read-only for classes"
);
update(
  "TEACH-05",
  "Blocked",
  "No assigned classes",
  "Class detail unavailable with empty state"
);
update(
  "TEACH-06",
  "Blocked",
  "No assigned classes",
  "Cannot add student without class assignment"
);
update(
  "TEACH-07",
  "Pass",
  "/teacher/assessments/templates/69f6eb0e*/builder",
  "Template created with 1 MCQ"
);
update(
  "TEACH-08",
  "Pass",
  "Template name edited",
  "Name saved as -edited"
);
update(
  "TEACH-09",
  "Blocked",
  "/teacher/assessments/host/new",
  "No assigned class options available"
);
update(
  "TEACH-10",
  "Blocked",
  "Publish requires class scope",
  "Cannot host/publish without assigned class"
);
update(
  "TEACH-11",
  "Pass",
  "Challenge ID 44n683gca",
  "Created via Challenge Builder"
);
update(
  "TEACH-12",
  "Pass",
  "/teacher/compiler/challenges/run/44mb6ysws",
  "Runner UI loads; compile not executed"
);
update(
  "TEACH-13",
  "Blocked",
  "/admin/audit-logs",
  "Redirected to /teacher (admin-only)"
);

// Student tests
update("STUD-01", "Pass", "Login -> /student", "student@edu.in / edu@123");
update("STUD-02", "Pass", "Student dashboard loads", "Assigned assessment visible");
update("STUD-03", "Pass", "/student/assessments", "Assessment list and Start button visible");
update(
  "STUD-04",
  "Pass",
  "/student/assessments/*/instructions",
  "Instructions page loads"
);
update(
  "STUD-05",
  "Pass",
  "/student/assessments/attempt/*",
  "Attempt UI loads; fullscreen request blocked by automation"
);
update(
  "STUD-06",
  "Blocked",
  "/student/assessments/attempt/*",
  "Fullscreen required blocks automated submission"
);
update("STUD-07", "Pass", "/student/results", "Results table renders");
update(
  "STUD-08",
  "Blocked",
  "/compiler/challenges/run",
  "Challenge browser redirected to /student; no loadable challenge"
);

// Security checks
update(
  "SEC-01",
  "Pass",
  "Teacher redirected from /student to /teacher",
  "Role guard enforced"
);
update(
  "SEC-02",
  "Pass",
  "Student redirected from /teacher to /student",
  "Role guard enforced"
);

const updatedSheet = XLSX.utils.aoa_to_sheet(rows);
workbook.Sheets[sheetName] = updatedSheet;
XLSX.writeFile(workbook, filePath);

console.log(`Checklist updated: ${filePath}`);
