require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');

const port = Number(process.env.PORT || 5000);

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Gate Pass API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(`API startup failed: ${error.message}`);
  process.exitCode = 1;
});