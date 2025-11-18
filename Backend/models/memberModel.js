// Backend/models/memberModel.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      unique: true, // e.g. NKD001
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "financial", "project-manager", "secretary", "viewer", "member"],
      default: "member",
    },

    phone: {
      type: String,
      default: "",
    },

    position: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    memberSince: {
      type: Date,
      default: Date.now,
    },

    contributionPlan: {
      type: String,
      enum: ["Annually", "Semi-annually", "Quarterly", "Monthly", "Other", ""],
      default: "",
    },

    contactMethod: {
      type: String,
      enum: ["WhatsApp", "Phone", "Email", "Other", ""],
      default: "",
    },

    totalPaidGMD: {
      type: Number,
      default: 0,
    },

    totalPaidEUR: {
      type: Number,
      default: 0,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Member = mongoose.model("Member", memberSchema);
export default Member;