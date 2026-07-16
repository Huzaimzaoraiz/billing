require('dotenv').config();
const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 3000;

(async () => {
  await db.init();
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
})();
