const express = require('express');
const { z } = require('zod');

const { sequelize, models } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const validate = require('../middleware/validate');

const router = express.Router();
const { Branch, BranchStatistic, AuditLog } = models;

const idParams = z.object({ id: z.string().uuid() });
const branchBody = z.object({
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  city: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  is_active: z.boolean().optional(),
});
const branchUpdateBody = branchBody.partial();

router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
  const where = req.user.role === 'SUPER_ADMIN' ? {} : { id: req.user.branch_id };
  const branches = await Branch.findAll({ where, order: [['name', 'ASC']] });
  res.json(branches);
}));

router.post('/', requireSuperAdmin, validate({ body: branchBody }), asyncHandler(async (req, res) => {
  const branch = await sequelize.transaction(async (transaction) => {
    const created = await Branch.create(req.body, { transaction });
    await BranchStatistic.create({ branch_id: created.id }, { transaction });
    await AuditLog.create({
      branch_id: created.id,
      user_id: req.user.user_id,
      action: 'BRANCH_CREATED',
      entity_type: 'Branch',
      entity_id: created.id,
      details: JSON.stringify({ code: created.code, name: created.name }),
    }, { transaction });
    return created;
  });

  res.status(201).json(branch);
}));

router.patch('/:id', requireSuperAdmin, validate({ params: idParams, body: branchUpdateBody }), asyncHandler(async (req, res) => {
  const branch = await Branch.findByPk(req.params.id);
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  await sequelize.transaction(async (transaction) => {
    await branch.update(req.body, { transaction });
    await AuditLog.create({
      branch_id: branch.id,
      user_id: req.user.user_id,
      action: 'BRANCH_UPDATED',
      entity_type: 'Branch',
      entity_id: branch.id,
      details: JSON.stringify(req.body),
    }, { transaction });
  });

  res.json(branch);
}));

module.exports = router;
