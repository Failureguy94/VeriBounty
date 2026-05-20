import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  // Start HTTP server immediately — DB is connected in the background
  const server = app.listen(env.PORT, () => {
    console.log(`✅ Backend server running on port ${env.PORT}`);
  });

  try {
    await connectDatabase();
  } catch (error) {
    console.error("⚠️  MongoDB connection failed — metadata endpoints will be unavailable.");
    console.error("   On-chain Solana reads/writes still work via the frontend.");
    console.error("   Fix: update MONGODB_URI in backend/.env or start a local MongoDB.");
    console.error("   Error:", (error as Error).message);
    // Do NOT call process.exit — server stays up for health checks and Solana integration
  }

  // Graceful shutdown
  process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
  process.on("SIGINT",  () => { server.close(() => process.exit(0)); });
};

void startServer();

