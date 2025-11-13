import mongoose from "mongoose";
import { getNextSeq } from "./Counter.js";

const contributionSchema = new mongoose.Schema(
  {
    // Core
    receiptNumber: { type: String, unique: true }, // REC-0001
    date: { type: Date, required: true },

    // Member link (denormalized for fast lists)
    memberId: { type: String, required: true, index: true }, // NKD###
    memberName: { type: String, required: true },

    // Amounts
    amountEUR: { type: Number, default: 0 },
    amountGMD: { type: Number, default: 0 },
    rate: { type: Number, default: 75 }, // GMD per €

    // Meta
    plan: {
      type: String,
      enum: ["Monthly", "Quarterly", "Annually", "Yearly", "None"],
      default: "Annually",
    },
    method: {
      type: String,
      enum: ["Cash", "Bank", "Wave", "Transfer", "Other"],
      default: "Cash",
      index: true,
    },
    position: { type: String, default: "" },     // member position (optional)
    confirmedBy: { type: String, default: "" },  // staff confirming
    remarks: { type: String, default: "" },
    createdBy: { type: String, default: "" },    // admin email or id
  },
  { timestamps: true }
);

// Auto ID: REC-0001, REC-0002...
contributionSchema.pre("save", async function (next) {
  if (!this.receiptNumber) {
    const n = await getNextSeq("receipt");
    this.receiptNumber = `REC-${String(n).padStart(4, "0")}`;
  }
  // normalize: if only one currency provided, back-fill using rate
  if ((this.amountEUR ?? 0) > 0 && (this.amountGMD ?? 0) === 0) {
    this.amountGMD = Math.round((this.amountEUR * this.rate + Number.EPSILON) * 100) / 100;
  } else if ((this.amountGMD ?? 0) > 0 && (this.amountEUR ?? 0) === 0 && this.rate > 0) {
    this.amountEUR = Math.round(((this.amountGMD / this.rate) + Number.EPSILON) * 100) / 100;
  }
  next();
});

contributionSchema.index({ date: -1 });
contributionSchema.index({ memberId: 1, date: -1 });

export default mongoose.model("Contribution", contributionSchema);