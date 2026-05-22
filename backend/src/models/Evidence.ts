import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const evidenceSchema = new Schema(
  {
    bountyPDA: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    factCheckerWallet: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    evidenceText: {
      type: String,
      required: true,
      trim: true
    },
    sourceURLs: {
      type: [String],
      default: []
    },
    ipfsHash: {
      type: String,
      required: true,
      trim: true
    },
    verdict: {
      type: Boolean,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    versionKey: false
  }
);

export type Evidence = InferSchemaType<typeof evidenceSchema>;
export type EvidenceModel = Model<Evidence>;

export const EvidenceModel =
  (models.Evidence as EvidenceModel) || model<Evidence>("Evidence", evidenceSchema);
