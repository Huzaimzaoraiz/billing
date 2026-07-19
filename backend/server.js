require('dotenv').config();

const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await db.init({
      force: process.env.DB_SYNC_FORCE === 'true',
      alter: process.env.DB_SYNC_ALTER === 'true',
    });

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://127.0.0.1:${PORT}`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await db.sequelize.close();
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
