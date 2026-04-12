import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const reputationSchema = new Schema(
  {
    wallet: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalResolved: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalCorrect: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

export type Reputation = InferSchemaType<typeof reputationSchema>;
export type ReputationModel = Model<Reputation>;

export const ReputationModel =
  (models.Reputation as ReputationModel) || model<Reputation>("Reputation", reputationSchema);
