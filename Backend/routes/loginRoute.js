// routes/loginRoute.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Member from "../models/memberModel.js";

const router = express.Router();

/**
 * POST /api/login
 * Body: { email?, memberId?, password }
 * You can log in with either email or memberId.
 */
router.post("/", async (req, res) => {
  try {
    const { email, memberId, password } = req.body || {};

    if (!password || (!email && !memberId)) {
      return res
        .status(400)
        .json({ error: "Email or Member ID and password are required." });
    }

    // Look up user by email or memberId
    const where = email ? { email } : { memberId };
    const user = await Member.findOne(where);
    if (!user) return res.status(401).json({ error: "Invalid credentials." });

    // If password not set yet (first-time reset flow)
    if (!user.passwordHash) {
      return res
        .status(403)
        .json({ error: "Password not set. Ask admin to send a reset link." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials." });

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        name: user.name,
        memberId: user.memberId,
      },
      process.env.JWT_SECRET || "nkdSecret123@2025",
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email || "",
        memberId: user.memberId,
        role: user.role,
        mustChangePassword: !!user.mustChangePassword,
      },
    });
  } catch (err) {
    console.error("⚠️ Login error:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message || String(err) });
  }
});

/* Optional quick probe to verify mount: GET /api/login/ping */
router.get("/ping", (_req, res) => res.json({ ok: true, at: "loginRoute" }));

export default router;