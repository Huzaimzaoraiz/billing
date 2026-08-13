const { getAuth } = require('@clerk/express');
const { prisma } = require('../database');

const authMiddleware = async (req, res, next) => {
  try {
    const auth = getAuth ? getAuth(req) : req.auth;
    const clerkId = auth?.userId;
    
    if (!clerkId) return res.status(401).json({ error: 'unauthorized' });

    const user = await prisma.user.findUnique({
      where: { clerk_id: clerkId }
    });

    if (!user) {
       return res.status(401).json({ error: 'User not synced with database' });
    }

    req.user = {
      user_id: user.id,
      clerk_id: user.clerk_id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authMiddleware };
