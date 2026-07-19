const express = require('express');

const { models } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const { Branch, Course, Student, BranchStatistic, SystemStatistic } = models;

router.use(authMiddleware);

router.get('/summary', asyncHandler(async (req, res) => {
  const branchWhere = req.user.role === 'SUPER_ADMIN' ? {} : { id: req.user.branch_id };
  const childBranchWhere = req.user.role === 'SUPER_ADMIN' ? {} : { branch_id: req.user.branch_id };

  const [branches, branchCount, courseCount, studentCount, activeStudentCount, systemStatistic] = await Promise.all([
    Branch.findAll({
      where: branchWhere,
      include: [{ model: BranchStatistic }],
      order: [['name', 'ASC']],
    }),
    Branch.count({ where: branchWhere }),
    Course.count({ where: childBranchWhere }),
    Student.count({ where: childBranchWhere }),
    Student.count({ where: { ...childBranchWhere, status: 'ACTIVE' } }),
    SystemStatistic.findOne({ order: [['created_at', 'DESC']] }),
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
