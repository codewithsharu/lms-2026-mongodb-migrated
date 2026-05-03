const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const buildAuditFilter = (filters) => {
  const { search, action_type, user_role, status, quick_view } = filters;
  const query = {};

  if (search) {
    query.$or = [
      { user_email: { $regex: search, $options: 'i' } },
      { api_endpoint: { $regex: search, $options: 'i' } },
      { action_type: { $regex: search, $options: 'i' } },
      { resource_type: { $regex: search, $options: 'i' } }
    ];
  }

  if (action_type && action_type !== 'ALL') query.action_type = action_type;
  if (user_role && user_role !== 'ALL') query.user_role = user_role;

  if (status === 'SUCCESS') { query.response_status = { $gte: 200, $lt: 300 }; }
  else if (status === 'FAILED') { query.response_status = { $gte: 400 }; }

  if (quick_view === 'FAILED') { query.response_status = { ...query.response_status, $gte: 400 }; }
  else if (quick_view === 'AUTH') { query.api_endpoint = { $regex: '/auth/', $options: 'i' }; }
  else if (quick_view === 'ADMIN') { query.user_role = 'admin'; }

  return query;
};

const getBatchSize = (rawValue) => {
  const parsedValue = parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue)) return 500;
  return Math.min(Math.max(parsedValue, 100), 1000);
};

router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      search = '', action_type = 'ALL', user_role = 'ALL',
      status = 'ALL', quick_view = 'ALL', sort_by = 'newest',
      page = 1, limit = 13
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 13, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;
    const sortOrder = sort_by === 'oldest' ? 1 : -1;
    const filters = { search, action_type, user_role, status, quick_view };
    const filter = buildAuditFilter(filters);

    const [data, count, successCount, failedCount, loginCount] = await Promise.all([
      AuditLog.find(filter).sort({ created_at: sortOrder }).skip(offset).limit(parsedLimit).lean(),
      AuditLog.countDocuments(filter),
      AuditLog.countDocuments({ ...filter, response_status: { $gte: 200, $lt: 300 } }),
      AuditLog.countDocuments({ ...filter, response_status: { $gte: 400 } }),
      AuditLog.countDocuments({ ...filter, action_type: 'LOGIN' })
    ]);

    // Map _id to id for frontend compatibility
    const logs = (data || []).map((log) => ({ ...log, id: log._id }));

    res.json({
      logs,
      stats: { successful: successCount, failed: failedCount, loginEvents: loginCount },
      pagination: { page: parsedPage, limit: parsedLimit, total: count, totalPages: Math.max(1, Math.ceil(count / parsedLimit)) }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.delete('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const batchSize = getBatchSize(req.query.batch_size);
    const batchRows = await AuditLog.find({}).sort({ created_at: 1 }).limit(batchSize).select('_id').lean();

    if (!Array.isArray(batchRows) || batchRows.length === 0) {
      return res.json({ message: 'No audit logs to clear', deleted: 0, hasMore: false, batchSize });
    }

    const batchIds = batchRows.map((row) => row._id).filter(Boolean);
    if (batchIds.length === 0) {
      return res.json({ message: 'No valid audit logs to clear', deleted: 0, hasMore: false, batchSize });
    }

    await AuditLog.deleteMany({ _id: { $in: batchIds } });
    const hasMore = batchIds.length === batchSize;

    res.json({ message: 'Audit logs batch cleared successfully', deleted: batchIds.length, hasMore, batchSize });
  } catch (error) {
    console.error('Clear audit logs error:', error);
    res.status(500).json({ error: 'Failed to clear audit logs' });
  }
});

module.exports = router;
