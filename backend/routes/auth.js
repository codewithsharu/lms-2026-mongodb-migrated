const express = require('express');
const User = require('../models/User');
const StudentDetail = require('../models/StudentDetail');
const TeacherDetail = require('../models/TeacherDetail');
const { logAction } = require('../middleware/audit');
const {
  authenticateWithPassword,
  signOutAuthSession,
  normalizeEmail,
  updateCurrentUserPassword,
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
} = require('../services/authService');
const {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions
} = require('../utils/authCookies');

const router = express.Router();
const REFRESH_COOKIE_MAX_AGE_DAYS = Number.parseInt(process.env.AUTH_REFRESH_TOKEN_DAYS || '30', 10);
const REFRESH_COOKIE_MAX_AGE_MS = Number.isFinite(REFRESH_COOKIE_MAX_AGE_DAYS) && REFRESH_COOKIE_MAX_AGE_DAYS > 0
  ? REFRESH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000;

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let authPayload;
    try {
      authPayload = await authenticateWithPassword(email, password);
    } catch (authError) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { user, session } = authPayload;

    if (!session || !user) {
      return res.status(401).json({ error: 'Unable to establish session. Please try again.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    // Parallelize database operations for faster login
    const [additionalDetails] = await Promise.all([
      // Get additional details based on role
      (async () => {
        if (user.role === 'student') {
          const studentData = await StudentDetail.findOne({ user_id: user._id })
            .populate('class_id', 'id name')
            .populate('section_id', 'id name')
            .lean();

          if (studentData) {
            return {
              ...studentData,
              classes: studentData.class_id,
              sections: studentData.section_id,
            };
          }
        } else if (user.role === 'teacher') {
          return await TeacherDetail.findOne({ user_id: user._id }).lean();
        }
        return null;
      })(),
      // Update last login in background (non-blocking)
      User.findByIdAndUpdate(user._id, { last_login: new Date() }).lean()
    ]);

    // Log the login action in background (non-blocking for faster response)
    setImmediate(() => {
      logAction(
        { user: { id: user._id.toString(), email: user.email, role: user.role }, originalUrl: '/api/auth/login', method: 'POST', body: { email }, ip: req.ip, get: (h) => req.get(h) },
        'LOGIN',
        'user',
        user._id.toString()
      ).catch(err => console.error('Audit log error:', err));
    });

    const expiresInSeconds = Number.parseInt(session.expires_in, 10);
    const accessTokenMaxAgeMs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? expiresInSeconds * 1000
      : undefined;

    res.cookie('token', session.access_token, getAccessTokenCookieOptions(accessTokenMaxAgeMs));

    if (session.refresh_token) {
      res.cookie('refresh_token', session.refresh_token, getRefreshTokenCookieOptions(REFRESH_COOKIE_MAX_AGE_MS));
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        profile_photo: user.profile_photo,
        details: additionalDetails
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  const { verifyToken } = require('../middleware/auth');

  verifyToken(req, res, async () => {
    try {
      const user = await User.findById(req.user.id)
        .select('_id email full_name phone profile_photo role created_at last_login')
        .lean();

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get additional details based on role
      let additionalDetails = null;

      if (user.role === 'student') {
        const studentData = await StudentDetail.findOne({ user_id: user._id })
          .populate('class_id', 'id name')
          .populate('section_id', 'id name')
          .lean();

        if (studentData) {
          additionalDetails = {
            ...studentData,
            classes: studentData.class_id,
            sections: studentData.section_id,
          };
        }
      } else if (user.role === 'teacher') {
        additionalDetails = await TeacherDetail.findOne({ user_id: user._id }).lean();
      }

      res.json({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        profile_photo: user.profile_photo,
        role: user.role,
        created_at: user.created_at,
        last_login: user.last_login,
        details: additionalDetails
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Change password
router.put('/change-password', async (req, res) => {
  const { verifyToken } = require('../middleware/auth');

  verifyToken(req, res, async () => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      try {
        await updateCurrentUserPassword(req.user.id, currentPassword, newPassword);
      } catch (err) {
        if (err.code === 'INVALID_CREDENTIALS') {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        throw err;
      }

      await logAction(req, 'UPDATE', 'user', req.user.id, { field: 'password' });

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Logout (clear cookie and log it)
router.post('/logout', async (req, res) => {
  const { verifyToken } = require('../middleware/auth');

  verifyToken(req, res, async () => {
    try {
      await logAction(req, 'LOGOUT', 'user', req.user.id);

      await signOutAuthSession();

      res.clearCookie('token', getClearCookieOptions());
      res.clearCookie('refresh_token', getClearCookieOptions());

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

module.exports = router;
