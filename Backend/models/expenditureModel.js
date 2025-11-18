// Backend/models/expenditureModel.js
import mongoose from "mongoose";

const expenditureSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String, // e.g. EXP-0001
      unique: true,
    },

    date: {
      type: Date,
      required: true,
    },

    payee: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    amountEUR: {
      type: Number,
      default: 0,
    },

    amountGMD: {
      type: Number,
      default: 0,
    },

    category: {
      type: String,
      default: "",
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank", "Wave", "Bizum", "Other"],
      default: "Cash",
    },

    paidBy: {
      type: String,
      default: "",
    },

    comments: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Auto-generate EXP-0001, EXP-0002, ...
expenditureSchema.pre("save", async function (next) {
  if (this.referenceNumber) return next();

  try {
    const last = await mongoose
      .model("Expenditure")
      .findOne({ referenceNumber: { $regex: /^EXP-\d+$/ } })
      .sort({ referenceNumber: -1 })
      .lean();

    let nextNum = 1;

    if (last && last.referenceNumber) {
      const m = last.referenceNumber.match(/^EXP-(\d+)$/);
      if (m && m[1]) {
        nextNum = parseInt(m[1], 10) + 1;
      }
    }

    const padded = String(nextNum).padStart(4, "0");
    this.referenceNumber = "EXP-" + padded;

    next();
  } catch (err) {
    next(err);
  }
});

const Expenditure = mongoose.model("Expenditure", expenditureSchema);
export default Expenditure;