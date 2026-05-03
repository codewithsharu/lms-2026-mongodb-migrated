const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

const methodActionMap = {
  GET: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE'
};

const isObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

const sanitizeRequestBody = (body) => {
  if (body === null || body === undefined) return null;

  if (Array.isArray(body)) {
    return body.map((entry) => sanitizeRequestBody(entry));
  }

  if (typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'password_hash', 'token', 'refresh_token', 'secret', 'authorization', 'cookie'];
  const sanitized = {};

  Object.entries(body).forEach(([key, value]) => {
    if (sensitiveFields.includes(String(key).toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      return;
    }

    sanitized[key] = sanitizeRequestBody(value);
  });

  return sanitized;
};

const inferActionType = (req) => {
  const path = req.originalUrl || '';

  if (path.includes('/auth/login')) return 'LOGIN';
  if (path.includes('/auth/logout')) return 'LOGOUT';

  return methodActionMap[req.method] || 'API_CALL';
};

const resolveResourceId = (req, explicitResourceId) => {
  if (explicitResourceId && (isObjectId(explicitResourceId) || typeof explicitResourceId === 'string')) {
    return explicitResourceId;
  }

  const paramCandidates = [req.params?.id, req.params?.userId, req.params?.classId, req.params?.sectionId, req.params?.assignmentId];
  const idParam = paramCandidates.find((value) => isObjectId(value));
  return idParam || null;
};

const buildRequestContextMetadata = (req) => {
  const queryParams = sanitizeRequestBody(req.query || {});
  const routeParams = sanitizeRequestBody(req.params || {});
  const payload = sanitizeRequestBody(req.body);

  let payloadBytes = 0;
  try {
    payloadBytes = payload ? Buffer.byteLength(JSON.stringify(payload), 'utf8') : 0;
  } catch {
    payloadBytes = 0;
  }

  return {
    query_params: queryParams,
    route_params: routeParams,
    payload_bytes: payloadBytes
  };
};

const shouldSkipAudit = (req) => {
  const cleanUrl = String(req.originalUrl || '').split('?')[0];

  // Skip all read operations (GET requests) - only log write operations
  if (req.method === 'GET') {
    return true;
  }

  const excludedExactPaths = [
    '/api/health',
    '/api/db-status',
    '/api/auth/me'
  ];

  if (excludedExactPaths.includes(cleanUrl)) {
    return true;
  }

  if (cleanUrl.startsWith('/api/audit-logs')) {
    return true;
  }

  return false;
};

const logAction = async (req, actionType, resourceType, resourceId, changes = null, metadata = null) => {
  try {
    if (req && typeof req === 'object') {
      req._manualAuditLogged = true;
    }

    // Minimal logging for write operations only - skip expensive metadata processing
    const logEntry = {
      user_id: req.user?.id || null,
      user_email: req.user?.email || 'anonymous',
      user_role: req.user?.role || 'anonymous',
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resolveResourceId(req, resourceId),
      api_endpoint: req.originalUrl,
      http_method: req.method,
      ip_address: req.ip || req.connection?.remoteAddress,
      changes: changes,
      created_at: new Date()
    };

    // Use insertOne for faster write performance
    await AuditLog.insertOne(logEntry);
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break main functionality
  }
};

// Middleware to automatically log all requests
const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    if (!req.originalUrl?.startsWith('/api/')) return;
    if (shouldSkipAudit(req)) return;
    if (req._manualAuditLogged) return;

    const resourceType = extractResourceType(req.originalUrl);
    const actionType = inferActionType(req);

    logAction(
      req,
      actionType,
      resourceType,
      null,
      null,
      {
        duration_ms: Date.now() - startTime,
        source: 'auto-middleware'
      }
    );
  });

  next();
};

const extractResourceType = (url) => {
  const cleanUrl = String(url || '').split('?')[0];
  const parts = cleanUrl.split('/').filter((part) => part && part !== 'api');
  const resource = parts[0] || 'unknown';

  // Keep labels clean in UI (users -> user, classes -> class)
  if (resource.endsWith('ies')) return `${resource.slice(0, -3)}y`;
  if (resource.endsWith('s')) return resource.slice(0, -1);

  return resource;
};

module.exports = {
  logAction,
  auditMiddleware
};
