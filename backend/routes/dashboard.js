const express = require('express');

const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { branchWhere } = require('./shared');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', asyncHandler(async (req, res) => {
  const where = branchWhere(req.user, { branchKey: 'id' });
  const childWhere = branchWhere(req.user);

  const [branches, branchCount, courseCount, studentCount, activeStudentCount, systemStatistic] = await Promise.all([
    prisma.branch.findMany({
      where,
      include: { BranchStatistic: true },
      orderBy: { name: 'asc' },
    }),
    prisma.branch.count({ where }),
    prisma.course.count({ where: childWhere }),
    prisma.student.count({ where: childWhere }),
    prisma.student.count({ where: { ...childWhere, status: 'ACTIVE' } }),
    prisma.systemStatistic.findFirst(),
  ]);

  const branchCards = branches.map((branch) => {
    const stats = branch.BranchStatistic || {};
    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      city: branch.city,
      total_income: Number(stats.total_income || 0),
      month_income: Number(stats.month_income || 0),
      total_students: Number(stats.total_students || 0),
      active_students: Number(stats.active_students || 0),
    };
  });

  const totalIncome = req.user.role === 'SUPER_ADMIN'
    ? Number(systemStatistic?.total_income || branchCards.reduce((sum, branch) => sum + branch.total_income, 0))
    : Number(branchCards[0]?.total_income || 0);

  res.json({
    totals: {
      branches: branchCount,
      courses: courseCount,
      students: studentCount,
      active_students: activeStudentCount,
      total_income: totalIncome,
    },
    branches: branchCards,
  });
}));

module.exports = router;
