const express = require('express');
const { z } = require('zod');

const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const validate = require('../middleware/validate');

const router = express.Router();

const USER_ROLES = ['STAFF'];
const userBody = z.object({
  branch_id: z.string().uuid('Choose a branch'),
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  role: z.enum(USER_ROLES).default('STAFF'),
});
const idParams = z.object({ id: z.string().uuid() });

router.use(authMiddleware, requireSuperAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'STAFF' },
    select: {
      id: true, branch_id: true, name: true, email: true, role: true, is_active: true, created_at: true,
      Branch: { select: { id: true, name: true, code: true } }
    },
    orderBy: { created_at: 'desc' },
  });

  res.json(users);
}));

router.post('/', validate({ body: userBody }), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.body.branch_id } });
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  const data = { ...req.body };

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data });
    await tx.auditLog.create({
      data: {
        branch_id: created.branch_id,
        user_id: req.user.user_id,
        action: 'USER_CREATED',
        entity_type: 'User',
        entity_id: created.id,
        details: JSON.stringify({ email: created.email, role: created.role }),
      }
    });

    return tx.user.findUnique({
      where: { id: created.id },
      select: {
        id: true, branch_id: true, name: true, email: true, role: true, is_active: true, created_at: true,
        Branch: { select: { id: true, name: true, code: true } }
      }
    });
  });

  res.status(201).json(user);
}));

router.delete('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'user not found' });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { is_active: false },
    });
    await tx.auditLog.create({
      data: {
        branch_id: user.branch_id,
        user_id: req.user.user_id,
        action: 'USER_DEACTIVATED',
        entity_type: 'User',
        entity_id: user.id,
        details: JSON.stringify({ email: user.email }),
      }
    });
  });

  res.json({ success: true });
}));

module.exports = router;
