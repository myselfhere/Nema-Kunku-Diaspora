import mongoose from "mongoose";
import { getNextSeq } from "./Counter.js";

const expenditureSchema = new mongoose.Schema(
  {
    refNumber: { type: String, unique: true }, // EXP-0001
    date: { type: Date, required: true },

    payee: { type: String, required: true },
    payeeContact: { type: String, default: "" },

    category: {
      type: String,
      default: "Operations",
      index: true,
    }, // e.g., Operations, Project, Admin, Logistics...
    method: {
      type: String,
      enum: ["Cash", "Bank", "Transfer", "Wave", "Other"],
      default: "Cash",
      index: true,
    },

    description: { type: String, default: "" },

    amountEUR: { type: Number, default: 0 },
    amountGMD: { type: Number, default: 0 },
    rate: { type: Number, default: 75 },

    projectId: { type: String, default: "" }, // PRJ-0001 (optional link)
    paidBy: { type: String, default: "" },    // staff/member name
    comments: { type: String, default: "" },
  },
  { timestamps: true }
);

// Auto ID: EXP-0001++
expenditureSchema.pre("save", async function (next) {
  if (!this.refNumber) {
    const n = await getNextSeq("expenditure");
    this.refNumber = `EXP-${String(n).padStart(4, "0")}`;
  }
  // auto-convert
  if ((this.amountEUR ?? 0) > 0 && (this.amountGMD ?? 0) === 0) {
    this.amountGMD = Math.round((this.amountEUR * this.rate + Number.EPSILON) * 100) / 100;
  } else if ((this.amountGMD ?? 0) > 0 && (this.amountEUR ?? 0) === 0 && this.rate > 0) {
    this.amountEUR = Math.round(((this.amountGMD / this.rate) + Number.EPSILON) * 100) / 100;
  }
  next();
});

expenditureSchema.index({ date: -1 });
expenditureSchema.index({ category: 1, date: -1 });

export default mongoose.model("Expenditure", expenditureSchema);