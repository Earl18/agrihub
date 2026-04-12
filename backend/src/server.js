import 'dotenv/config';
import app from './app.js';
import { connectToDatabase } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
