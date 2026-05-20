import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,  // fail fast if unreachable
    connectTimeoutMS: 5000,
  });
  console.log("✅ Connected to MongoDB");
};
