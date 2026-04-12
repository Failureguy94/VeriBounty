import { app } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(env.PORT, () => {
      console.log(`Backend server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

void startServer();
