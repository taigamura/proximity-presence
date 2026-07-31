import { createApp, runMigrations } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

runMigrations()
  .then(() => {
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`proximity-presence server listening on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed, refusing to start:', err);
    process.exit(1);
  });
