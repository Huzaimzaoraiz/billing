const express = require('express');
const { getAuth } = require('@clerk/express');
const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/sync', asyncHandler(async (req, res) => {
  const auth = getAuth ? getAuth(req) : req.auth;
  const clerkId = auth?.userId;
  
  if (!clerkId) return res.status(401).json({ error: 'unauthorized' });

  const { clerkClient } = require('@clerk/express');
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
  
  if (!email) return res.status(400).json({ error: 'email is required' });

  let user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    if (user.clerk_id !== clerkId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerk_id: clerkId, name: name }
      });
    }
  } else {
    const count = await prisma.user.count();
    user = await prisma.user.create({
      data: {
        clerk_id: clerkId,
        email,
        name,
        role: count === 0 ? 'SUPER_ADMIN' : 'STAFF'
      }
    });
  }

  res.json({ message: 'User synced successfully', user });
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json(req.user);
}));

module.exports = router;
