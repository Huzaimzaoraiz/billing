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
const querySchema = z.object({
  branch_id: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
});
const courseBody = z.object({
  branch_id: z.string().uuid(),
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  duration_months: z.coerce.number().int().min(1).max(120).default(1),
  default_admission_fee: z.coerce.number().min(0).default(0),
  default_tuition_fee: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});
const courseUpdateBody = courseBody.omit({ branch_id: true }).partial();

router.use(authMiddleware);

router.get('/', validate({ query: querySchema }), asyncHandler(async (req, res) => {
  const where = branchWhere(req.user, { branchId: req.user.role === 'SUPER_ADMIN' ? req.query.branch_id : null });
  if (req.query.active) where.is_active = req.query.active === 'true';

  const courses = await prisma.course.findMany({
    where,
    include: { Branch: { select: { id: true, name: true, code: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(courses);
}));

router.post('/', requireSuperAdmin, validate({ body: courseBody }), asyncHandler(async (req, res) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.body.branch_id } });
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({ data: req.body });
    await tx.auditLog.create({
      data: {
        branch_id: created.branch_id,
        user_id: req.user.user_id,
        action: 'COURSE_CREATED',
        entity_type: 'Course',
        entity_id: created.id,
        details: JSON.stringify({ code: created.code, name: created.name }),
      }
    });
    return created;
  });

  res.status(201).json(course);
}));

router.patch('/:id', requireSuperAdmin, validate({ params: idParams, body: courseUpdateBody }), asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: 'course not found' });

  const updatedCourse = await prisma.$transaction(async (tx) => {
    const updated = await tx.course.update({
      where: { id: course.id },
      data: req.body,
    });
    await tx.auditLog.create({
      data: {
        branch_id: course.branch_id,
        user_id: req.user.user_id,
        action: 'COURSE_UPDATED',
        entity_type: 'Course',
        entity_id: course.id,
        details: JSON.stringify(req.body),
      }
    });
    return updated;
  });

  res.json(updatedCourse);
}));

router.delete('/:id', requireSuperAdmin, validate({ params: idParams }), asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: 'course not found' });

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: course.id },
      data: { is_active: false },
    });
    await tx.auditLog.create({
      data: {
        branch_id: course.branch_id,
        user_id: req.user.user_id,
        action: 'COURSE_DISABLED',
        entity_type: 'Course',
        entity_id: course.id,
        details: JSON.stringify({ code: course.code, name: course.name }),
      }
    });
  });

  res.json({ success: true });
}));

module.exports = router;
