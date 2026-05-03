const User = require('../models/User');
const {
  getUserFromAccessToken,
  refreshAuthSession,
} = require('../services/authService');
const {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions
} = require('../utils/authCookies');

const REFRESH_COOKIE_MAX_AGE_DAYS = Number.parseInt(process.env.AUTH_REFRESH_TOKEN_DAYS || '30', 10);
const REFRESH_COOKIE_MAX_AGE_MS = Number.isFinite(REFRESH_COOKIE_MAX_AGE_DAYS) && REFRESH_COOKIE_MAX_AGE_DAYS > 0
  ? REFRESH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000;

const getBearerToken = (req) => {
  const authorization = req.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
};

// Verify JWT access token from HTTP-only cookie or Authorization header.
const verifyToken = async (req, res, next) => {
  try {
    let accessToken = req.cookies?.token || getBearerToken(req);
    let refreshToken = req.cookies?.refresh_token || null;
    let decoded = null;
    let session = null;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ error: 'Access denied. No session provided.' });
    }

    if (accessToken) {
      decoded = await getUserFromAccessToken(accessToken);
    }

    if (!decoded && refreshToken) {
      try {
        session = await refreshAuthSession(refreshToken);
        accessToken = session?.access_token || null;
        refreshToken = session?.refresh_token || refreshToken;

        if (accessToken) {
          decoded = await getUserFromAccessToken(accessToken);
        }
      } catch {
        decoded = null;
      }
    }

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // Look up user in database
    const userRecord = await User.findById(decoded.id)
      .select('_id email full_name role is_active')
      .lean();

    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid session. User not found.' });
    }

    if (!userRecord.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    // Set refreshed tokens as cookies if session was refreshed
    if (session?.access_token) {
      const expiresInSeconds = Number.parseInt(session.expires_in, 10);
      const accessMaxAgeMs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? expiresInSeconds * 1000
        : undefined;

      res.cookie('token', session.access_token, getAccessTokenCookieOptions(accessMaxAgeMs));

      if (session.refresh_token) {
        res.cookie('refresh_token', session.refresh_token, getRefreshTokenCookieOptions(REFRESH_COOKIE_MAX_AGE_MS));
      }
    }

    req.user = {
      id: userRecord._id.toString(),
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: userRecord.role,
      is_active: userRecord.is_active,
    };
    req.authAccessToken = accessToken;
    req.authRefreshToken = refreshToken;

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid session token.' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Check if user is teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teacher or Admin privileges required.' });
  }
  next();
};

// Check specific roles
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  isAdmin,
  isTeacherOrAdmin,
  hasRole
};
