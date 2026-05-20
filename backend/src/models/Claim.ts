import { InferSchemaType, Model, Schema, model, models } from "mongoose";

export const claimStatuses = ["open", "claimed", "verdict_submitted", "resolved"] as const;

const claimSchema = new Schema(
  {
    claimText: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    category: {
      type: String,
      default: "Other",
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    submitterWallet: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    solAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: claimStatuses,
      default: "open",
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    bountyPDA: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    versionKey: false
  }
);

export type Claim = InferSchemaType<typeof claimSchema>;
export type ClaimModel = Model<Claim>;

export const ClaimModel = (models.Claim as ClaimModel) || model<Claim>("Claim", claimSchema);
