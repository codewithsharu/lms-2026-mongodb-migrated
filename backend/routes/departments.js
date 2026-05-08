const express = require('express');
const Department = require('../models/Department');
const TeacherDetail = require('../models/TeacherDetail');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

const router = express.Router();

const normalizeName = (value) => String(value || '').trim();

// Get departments (Admin)
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (pageNumber - 1) * limitNumber;

    if (normalizedStatus && !['active', 'inactive'].includes(normalizedStatus)) {
      return res.status(400).json({ error: 'status must be either active or inactive' });
    }

    const filter = {};
    if (normalizedStatus) filter.is_active = normalizedStatus === 'active';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Department.countDocuments(filter);
    const items = await Department.find(filter)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limitNumber)
      .lean();

    res.json({
      departments: items.map((d) => ({ ...d, id: d._id })),
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create department (Admin)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const name = normalizeName(req.body?.name);
    const description = req.body?.description ? String(req.body.description).trim() : null;

    if (!name) return res.status(400).json({ error: 'Department name is required' });

    const newDepartment = await Department.create({ name, description });
    await logAction(req, 'CREATE', 'department', newDepartment._id.toString(), { name });

    res.status(201).json({ message: 'Department created successfully', department: { ...newDepartment.toObject(), id: newDepartment._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Department name already exists' });
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update department (Admin)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const updateData = {};
    if (req.body?.name !== undefined) updateData.name = normalizeName(req.body.name);
    if (req.body?.description !== undefined) updateData.description = req.body.description ? String(req.body.description).trim() : null;
    if (req.body?.is_active !== undefined) updateData.is_active = req.body.is_active;

    if (updateData.name !== undefined && !updateData.name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const existing = await Department.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Department not found' });

    const updated = await Department.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Department not found' });

    if (updateData.name && updateData.name !== existing.name) {
      await TeacherDetail.updateMany({ department: existing.name }, { $set: { department: updateData.name } });
    }

    await logAction(req, 'UPDATE', 'department', req.params.id, updateData);
    res.json({ message: 'Department updated successfully', department: { ...updated, id: updated._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Department name already exists' });
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department (Admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.status(404).json({ error: 'Department not found' });

    await TeacherDetail.updateMany({ department: department.name }, { $set: { department: null } });
    await Department.findByIdAndDelete(req.params.id);
    await logAction(req, 'DELETE', 'department', req.params.id, { name: department.name });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
