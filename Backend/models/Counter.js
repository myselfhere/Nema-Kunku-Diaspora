import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  { _id: { type: String, required: true }, seq: { type: Number, default: 0 } },
  { versionKey: false }
);

export default mongoose.model("Counter", counterSchema);

/**
 * Get next sequential number for a given key.
 * Usage: const n = await getNextSeq('receipt'); // 1,2,3...
 */
export async function getNextSeq(key) {
  const doc = await mongoose.model("Counter").findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}