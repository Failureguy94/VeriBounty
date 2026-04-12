import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas");
};
