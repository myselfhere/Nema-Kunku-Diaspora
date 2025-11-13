// Backend/scripts/seedAdmin.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Member from "../models/memberModel.js";

async function addAdmin() {
  try {
    // === Connect to DB ===
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB");

    // === Check if admin already exists ===
    const existing = await Member.findOne({ email: "salmemture@gmail.com" });
    if (existing) {
      console.log("⚠️ Admin already exists");
      await mongoose.connection.close();
      return;
    }

    // === Hash password ===
    const hashedPassword = await bcrypt.hash("Password1", 10);

    // === Create admin record ===
    const newAdmin = new Member({
      name: "Salme Ture",
      email: "salmemture@gmail.com",
      passwordHash: hashedPassword, // correct field name
      role: "admin",
      memberId: "NKD001",
      phone: "+44 7534445005",
      position: "Administrator",
      country: "United Kingdom",
      memberSince: new Date("2018-01-03"), // ISO format preferred
      contributionPlan: "Annually (€100)",
      contactMethod: "email",
      totalPaidGMD: 0,
      mustChangePassword: false,
      status: "Active",
    });

    await newAdmin.save();
    console.log("✅ Admin member created successfully");

    await mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    await mongoose.connection.close();
  }
}

addAdmin();