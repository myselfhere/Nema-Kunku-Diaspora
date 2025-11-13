// scripts/seedAdmin.js
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Member from "../models/memberModel.js";

/**
 * ENV you can override:
 *  - MONGO_URI=mongodb://127.0.0.1:27017/nkd
 *  - ADMIN_EMAIL=salmemture@gmail.com
 *  - ADMIN_NAME="Salme Ture"
 *  - ADMIN_PASS="Password1"
 *  - ADMIN_MEMBER_ID=NKD001   (optional; will auto-generate if missing)
 *  - ADMIN_COUNTRY="United Kingdom"
 *  - ADMIN_POSITION="Administrator"
 *  - ADMIN_CONTACT="email"
 *  - ADMIN_ROLE="admin"
 *  - ADMIN_PLAN="Annually"
 *  - ADMIN_MEMBER_SINCE="2018-01-03"
 */

const {
  MONGO_URI,
  ADMIN_EMAIL = "salmemture@gmail.com",
  ADMIN_NAME = "Salme Ture",
  ADMIN_PASS = "Password1",
  ADMIN_MEMBER_ID,
  ADMIN_COUNTRY = "United Kingdom",
  ADMIN_POSITION = "Administrator",
  ADMIN_CONTACT = "email",
  ADMIN_ROLE = "admin",
  ADMIN_PLAN = "Annually",
  ADMIN_MEMBER_SINCE = "2018-01-03",
} = process.env;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not set in .env");
  process.exit(1);
}

async function nextMemberId() {
  const last = await Member.find({ memberId: /^NKD\d{3}$/ })
    .sort({ memberId: -1 })
    .limit(1);

  if (!last.length) return "NKD001";

  const n = parseInt(last[0].memberId.replace("NKD", ""), 10) || 0;
  const next = String(n + 1).padStart(3, "0");
  return `NKD${next}`;
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log(`✅ MongoDB Connected: ${MONGO_URI}`);

    let admin = await Member.findOne({ email: ADMIN_EMAIL });
    const passwordHash = await bcrypt.hash(ADMIN_PASS, 10);

    if (!admin) {
      const memberId =
        ADMIN_MEMBER_ID && ADMIN_MEMBER_ID.trim()
          ? ADMIN_MEMBER_ID.trim()
          : await nextMemberId();

      admin = await Member.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        memberId,
        role: ADMIN_ROLE,
        phone: "",
        position: ADMIN_POSITION,
        country: ADMIN_COUNTRY,
        contactMethod: ADMIN_CONTACT,
        contributionPlan: ADMIN_PLAN,
        memberSince: new Date(ADMIN_MEMBER_SINCE),
        status: "Active",
        totalPaidGMD: 0,
        passwordHash,
        mustChangePassword: false,
        resetToken: undefined,
        resetTokenExpires: undefined,
      });

      console.log(
        `✅ Admin created: ${admin.email}  ID: ${admin.memberId}  (password set)`
      );
    } else {
      admin.name = ADMIN_NAME;
      admin.role = ADMIN_ROLE;
      admin.position = ADMIN_POSITION;
      admin.country = ADMIN_COUNTRY;
      admin.contactMethod = ADMIN_CONTACT;
      admin.contributionPlan = ADMIN_PLAN;
      admin.memberSince = new Date(ADMIN_MEMBER_SINCE);
      admin.status = "Active";

      if (!admin.memberId || !/^NKD\d{3}$/.test(admin.memberId)) {
        admin.memberId =
          ADMIN_MEMBER_ID && ADMIN_MEMBER_ID.trim()
            ? ADMIN_MEMBER_ID.trim()
            : await nextMemberId();
      }

      admin.passwordHash = passwordHash;
      admin.mustChangePassword = false;
      admin.resetToken = undefined;
      admin.resetTokenExpires = undefined;

      await admin.save();
      console.log(
        `🔁 Admin updated: ${admin.email}  ID: ${admin.memberId}  (password reset)`
      );
    }
  } catch (err) {
    console.error("❌ Seed error:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();