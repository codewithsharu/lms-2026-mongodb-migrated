require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');
const { auditMiddleware } = require('./middleware/audit');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const auditLogRoutes = require('./routes/auditLogs');
const assessmentRoutes = require('./routes/assessments');
const compilerRoutes = require('./routes/compiler');
const profileRoutes = require('./routes/profiles');

const app = express();
const PORT = process.env.PORT || 5000;

const parseCsvEnv = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wildcardPatternToRegex = (pattern) => {
  const escapedPattern = escapeRegex(pattern);
  const regexSource = `^${escapedPattern.replace(/\\\*/g, '.*')}$`;
  return new RegExp(regexSource, 'i');
};

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'https://lms-2026-pi.vercel.app',
  'https://lms-2026-mongodb-migrated.vercel.app'
];

const defaultAllowedOriginPatterns = [
  /^https:\/\/lms-2026-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/lms-2026-mongodb-migrated-[a-z0-9-]+\.vercel\.app$/i
];

const allowedOrigins = parseCsvEnv(process.env.FRONTEND_URLS || process.env.FRONTEND_URL);
const allowedOriginPatternInputs = parseCsvEnv(process.env.FRONTEND_URL_PATTERNS);
const allowedOriginPatterns = allowedOriginPatternInputs.map(wildcardPatternToRegex);

const corsOriginAllowList = allowedOrigins.length > 0
  ? allowedOrigins
  : defaultAllowedOrigins;

const corsOriginPatternAllowList = allowedOriginPatterns.length > 0
  ? allowedOriginPatterns
  : defaultAllowedOriginPatterns;

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (corsOriginAllowList.includes(origin)) return true;
  return corsOriginPatternAllowList.some((pattern) => pattern.test(origin));
};

// CORS configuration for cookies
const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    console.warn(`CORS blocked for origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-exam-session-token'],
};

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(auditMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/profiles', profileRoutes);

// Base routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the College Assessment Platform API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// MongoDB status endpoint (replaces Supabase db-status)
app.get('/api/db-status', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    if (state !== 1) {
      return res.status(500).json({
        status: 'error',
        message: `MongoDB is ${stateMap[state] || 'unknown'}`,
        database: 'MongoDB'
      });
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const expectedCollections = [
      'users', 'classes', 'sections', 'studentdetails', 'teacherdetails',
      'teacherassignments', 'auditlogs', 'assessmenttemplates',
      'hostedassessments', 'hostedassessmentstudenttargets', 'assessmentattempts'
    ];

    const tables = await Promise.all(expectedCollections.map(async (name) => {
      const exists = collectionNames.includes(name);
      let rowCount = 0;
      if (exists) {
        try { rowCount = await db.collection(name).countDocuments(); } catch { rowCount = 0; }
      }
      return { table: name, exists, rowCount };
    }));

    const missingTables = tables.filter(t => !t.exists).map(t => t.table);

    res.json({
      status: missingTables.length === 0 ? 'connected' : 'partial',
      checkedAt: new Date().toISOString(),
      message: 'MongoDB health check completed',
      database: 'MongoDB',
      schema: {
        expectedTableCount: expectedCollections.length,
        accessibleTableCount: tables.filter(t => t.exists).length,
        missingTables,
        tables
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message, database: 'MongoDB' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Startup] Failed to initialize server:', error.message);
    process.exit(1);
  }
};

startServer();
