const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'ljneqdakhjbewqdjhv';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const createAuthError = (message, code = 'AUTH_ERROR') => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hash) => {
  if (!hash || hash === '__SUPABASE_AUTH__') {
    return false;
  }
  return bcrypt.compare(password, hash);
};

const signAccessToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Calculate expires_in in seconds for cookie maxAge
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

  return { token, expiresIn };
};

const signRefreshToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type && decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Authenticate user with email/password.
 * Returns { user, session: { access_token, refresh_token, expires_in } }
 */
const authenticateWithPassword = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw createAuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    throw createAuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const { token: accessToken, expiresIn } = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user,
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    },
  };
};

/**
 * Get user from access token (for middleware verification).
 */
const getUserFromAccessToken = async (token) => {
  const decoded = verifyAccessToken(token);

  if (!decoded || !decoded.id) {
    return null;
  }

  return decoded;
};

/**
 * Refresh session using refresh token.
 * Returns new { access_token, refresh_token, expires_in }.
 */
const refreshAuthSession = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded || !decoded.id) {
    return null;
  }

  const user = await User.findById(decoded.id).select('_id email role is_active');

  if (!user || !user.is_active) {
    return null;
  }

  const { token: newAccessToken, expiresIn } = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_in: expiresIn,
  };
};

/**
 * Sign out - stateless JWT, no server-side action needed.
 */
const signOutAuthSession = async () => {
  // JWT is stateless - cookies are cleared on the client side
};

/**
 * Create a new user with hashed password.
 */
const createUserWithAuth = async ({ email, password, role, fullName, isActive = true, createdBy = null }) => {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  const user = new User({
    email: normalizedEmail,
    password_hash: passwordHash,
    full_name: fullName,
    role,
    is_active: isActive,
    created_by: createdBy,
  });

  await user.save();
  return user;
};

/**
 * Update user password (admin reset or self-change).
 */
const updateUserPassword = async (userId, newPassword) => {
  const passwordHash = await hashPassword(newPassword);

  await User.findByIdAndUpdate(userId, { password_hash: passwordHash });
};

/**
 * Update current user's password (requires verifying old password).
 */
const updateCurrentUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    throw createAuthError('User not found', 'USER_NOT_FOUND');
  }

  const isValid = await comparePassword(currentPassword, user.password_hash);

  if (!isValid) {
    throw createAuthError('Current password is incorrect', 'INVALID_CREDENTIALS');
  }

  const passwordHash = await hashPassword(newPassword);
  user.password_hash = passwordHash;
  await user.save();
};

module.exports = {
  normalizeEmail,
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  authenticateWithPassword,
  getUserFromAccessToken,
  refreshAuthSession,
  signOutAuthSession,
  createUserWithAuth,
  updateUserPassword,
  updateCurrentUserPassword,
  createAuthError,
};
