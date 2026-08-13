const express = require('express');
const { z } = require('zod');
const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { branchWhere, canAccessBranch } = require('./shared');

const router = express.Router();
router.use(authMiddleware);

const expenseSchema = z.object({
  branch_id: z.string().uuid(),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  expense_date: z.string().optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const { branch_id, start_date, end_date } = req.query;
  const where = branchWhere(req.user, { branchId: branch_id });
  
  if (start_date || end_date) {
    where.expense_date = {};
    if (start_date) where.expense_date.gte = new Date(start_date);
    if (end_date) where.expense_date.lte = new Date(end_date);
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { expense_date: 'desc' },
    include: {
      Branch: { select: { name: true } },
      Creator: { select: { name: true } },
    }
  });

  res.json(expenses);
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = expenseSchema.parse(req.body);
  
  if (!canAccessBranch(req.user, data.branch_id)) {
    return res.status(403).json({ error: 'forbidden branch access' });
  }

  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        branch_id: data.branch_id,
        amount: data.amount,
        category: data.category,
        description: data.description,
        expense_date: data.expense_date ? new Date(data.expense_date) : new Date(),
        created_by: req.user.id,
      }
    });

    await tx.branchStatistic.upsert({
      where: { branch_id: data.branch_id },
      create: {
        branch_id: data.branch_id,
        total_expense: data.amount,
        month_expense: data.amount,
        today_expense: data.amount,
      },
      update: {
        total_expense: { increment: data.amount },
        month_expense: { increment: data.amount },
        today_expense: { increment: data.amount },
      }
    });

    const sysStat = await tx.systemStatistic.findFirst();
    if (sysStat) {
      await tx.systemStatistic.update({
        where: { id: sysStat.id },
        data: {
          total_expense: { increment: data.amount },
          month_expense: { increment: data.amount },
          today_expense: { increment: data.amount },
        }
      });
    } else {
      await tx.systemStatistic.create({
        data: {
          total_expense: data.amount,
          month_expense: data.amount,
          today_expense: data.amount,
        }
      });
    }

    return newExpense;
  });

  res.status(201).json(expense);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return res.status(404).json({ error: 'expense not found' });
  
  if (!canAccessBranch(req.user, expense.branch_id)) {
    return res.status(403).json({ error: 'forbidden branch access' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } });

    await tx.branchStatistic.update({
      where: { branch_id: expense.branch_id },
      data: {
        total_expense: { decrement: expense.amount },
        month_expense: { decrement: expense.amount },
        today_expense: { decrement: expense.amount },
      }
    });

    const sysStat = await tx.systemStatistic.findFirst();
    if (sysStat) {
      await tx.systemStatistic.update({
        where: { id: sysStat.id },
        data: {
          total_expense: { decrement: expense.amount },
          month_expense: { decrement: expense.amount },
          today_expense: { decrement: expense.amount },
        }
      });
    }
  });

  res.json({ success: true });
}));

module.exports = router;
