import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    memberId: { type: String, unique: true },
    email: { type: String, unique: true, sparse: true },
    role: { type: String, default: "member" },
    contributionPlan: { type: String, default: "Annually" },
    phone: String,
    country: String,
    status: { type: String, default: "Active" },

    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },

    memberSince: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// helpers
MemberSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

MemberSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

export default mongoose.model("Member", MemberSchema);