require('dotenv').config();

const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await db.init();

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://127.0.0.1:${PORT}`);
    });

    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other server or start this app with a different PORT.`);
      } else {
        console.error('server error', err);
      }
      await db.prisma.$disconnect();
      process.exit(1);
    });

    const shutdown = async () => {
      server.close(async () => {
        await db.prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('failed to start server', err);
    process.exit(1);
  }
})();
