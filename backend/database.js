const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = {
  prisma,
  init: async () => {
    try {
      await prisma.$connect();
      console.log('Successfully connected to the database via Prisma.');

      if (process.env.BOOTSTRAP_ADMIN_EMAIL) {
        const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL.trim();
        const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (!existingAdmin) {
          await prisma.user.create({
            data: {
              name: process.env.BOOTSTRAP_ADMIN_NAME || 'Super Admin',
              email: adminEmail,
              role: 'SUPER_ADMIN',
            }
          });
          console.log(`Bootstrapped super admin account: ${adminEmail}`);
        }
      }
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      process.exit(1);
    }
  },
};
