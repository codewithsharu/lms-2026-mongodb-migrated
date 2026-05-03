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
const areaCol = colIndex("Area");
const moduleCol = colIndex("Module");
const testCaseCol = colIndex("Test Case");
const stepsCol = colIndex("Steps");
const expectedCol = colIndex("Expected Result");
const statusCol = colIndex("Status");
const evidenceCol = colIndex("Evidence");
const notesCol = colIndex("Notes");

const makeRow = (data) => {
  const row = new Array(headers.length).fill("");
  if (idCol !== -1) row[idCol] = data.ID || "";
  if (areaCol !== -1) row[areaCol] = data.Area || "";
  if (moduleCol !== -1) row[moduleCol] = data.Module || "";
  if (testCaseCol !== -1) row[testCaseCol] = data["Test Case"] || "";
  if (stepsCol !== -1) row[stepsCol] = data.Steps || "";
  if (expectedCol !== -1) row[expectedCol] = data["Expected Result"] || "";
  if (statusCol !== -1) row[statusCol] = data.Status || "";
  if (evidenceCol !== -1) row[evidenceCol] = data.Evidence || "";
  if (notesCol !== -1) row[notesCol] = data.Notes || "";
  return row;
};

const envRows = [
  makeRow({
    ID: "ENV-01",
    Area: "Setup",
    Module: "Environment",
    "Test Case": "Seed demo users",
    Steps: "Run backend/scripts/seed-demo-users.js",
    "Expected Result": "Teacher/student credentials created",
    Status: "Pass",
    Evidence: "teacher@edu.in / student@edu.in",
    Notes: "Default password: edu@123"
  }),
  makeRow({
    ID: "ENV-02",
    Area: "Setup",
    Module: "Backend",
    "Test Case": "Backend dev server",
    Steps: "Run npm run dev (backend)",
    "Expected Result": "Server listening on 5000",
    Status: "Pass",
    Evidence: "http://localhost:5000",
    Notes: "MongoDB connected"
  }),
  makeRow({
    ID: "ENV-03",
    Area: "Setup",
    Module: "Frontend",
    "Test Case": "Frontend dev server",
    Steps: "Run npm run dev (frontend)",
    "Expected Result": "Vite server running",
    Status: "Pass",
    Evidence: "http://localhost:5174",
    Notes: "5173 was in use"
  })
];

rows.splice(1, 0, ...envRows);

const updateNotes = (id, note, evidence) => {
  const row = rows.find((r) => r[idCol] === id);
  if (!row) return;
  if (notesCol !== -1 && note) row[notesCol] = note;
  if (evidenceCol !== -1 && evidence) row[evidenceCol] = evidence;
};

updateNotes(
  "TEACH-01",
  "Use teacher@edu.in / edu@123",
  "http://localhost:5174"
);
updateNotes(
  "STUD-01",
  "Use student@edu.in / edu@123",
  "http://localhost:5174"
);

const updatedSheet = XLSX.utils.aoa_to_sheet(rows);
workbook.Sheets[sheetName] = updatedSheet;
XLSX.writeFile(workbook, filePath);

console.log(`Checklist updated: ${filePath}`);
