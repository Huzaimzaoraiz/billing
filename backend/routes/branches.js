const express = require('express');
const { z } = require('zod');

const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { branchWhere } = require('./shared');

const router = express.Router();

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
  const where = branchWhere(req.user, { branchKey: 'id' });
  const branches = await prisma.branch.findMany({
    where,
    orderBy: { name: 'asc' }
  });
  res.json(branches);
}));

router.post('/', requireSuperAdmin, validate({ body: branchBody }), asyncHandler(async (req, res) => {
  const branch = await prisma.$transaction(async (tx) => {
    const created = await tx.branch.create({ data: req.body });
    await tx.branchStatistic.create({ data: { branch_id: created.id } });
    await tx.auditLog.create({
      data: {
        branch_id: created.id,
        user_id: req.user.user_id,
        action: 'BRANCH_CREATED',
        entity_type: 'Branch',
        entity_id: created.id,
        details: JSON.stringify({ code: created.code, name: created.name }),
      }
    });
    return created;
  });

  res.status(201).json(branch);
}));

router.patch('/:id', requireSuperAdmin, validate({ params: idParams, body: branchUpdateBody }), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findFirst({ where: branchWhere(req.user, { branchKey: 'id', where: { id: req.params.id } }) });
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  const updatedBranch = await prisma.$transaction(async (tx) => {
    const updated = await tx.branch.update({
      where: { id: branch.id },
      data: req.body,
    });
    await tx.auditLog.create({
      data: {
        branch_id: branch.id,
        user_id: req.user.user_id,
        action: 'BRANCH_UPDATED',
        entity_type: 'Branch',
        entity_id: branch.id,
        details: JSON.stringify(req.body),
      }
    });
    return updated;
  });

  res.json(updatedBranch);
}));

module.exports = router;
