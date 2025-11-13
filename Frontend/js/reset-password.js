// Backend/routes/resetRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Member from "../models/memberModel.js"; // adjust path if your model is named differently

const router = express.Router();

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || "devSecret";
const FRONTEND_BASE =
  process.env.FRONTEND_BASE || "http://127.0.0.1:5500/Frontend";

// Create a short-lived token (30 mins)
function signResetToken(member) {
  return jwt.sign(
    { uid: String(member._id), memberId: member.memberId, act: "reset" },
    JWT_SECRET,
    { expiresIn: "30m" }
  );
}

// Verify token
function verifyResetToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * POST /api/reset/request
 * { identifier: "email@x.com" | "NKD###", channel: "email" | "sms", phone?: "+44..." }
 */
router.post("/request", async (req, res) => {
  try {
    const { identifier, channel = "email", phone = "" } = req.body || {};
    if (!identifier) return res.status(400).json({ error: "Identifier required." });

    const member = await Member.findOne({
      $or: [{ email: identifier }, { memberId: identifier }],
    });
    if (!member) return res.status(404).json({ error: "Member not found." });

    const token = signResetToken(member);
    const link = `${FRONTEND_BASE}/set-new-password.html?token=${encodeURIComponent(
      token
    )}`;

    // NOTE: You can plug an email/SMS sender here.
    // For now we just log + return a friendly message.
    if (channel === "sms") {
      console.log(`[SMS RESET] to ${phone || member.phone || "unknown"}: ${link}`);
      return res.json({
        ok: true,
        channel: "sms",
        message: "Reset link generated (SMS mocked).",
        link, // helpful while developing
      });
    } else {
      console.log(`[EMAIL RESET] to ${member.email}: ${link}`);
      return res.json({
        ok: true,
        channel: "email",
        message: "Reset link generated (email mocked).",
        link, // helpful while developing
      });
    }
  } catch (err) {
    console.error("reset/request error:", err);
    res.status(500).json({ error: "Unable to process request." });
  }
});

/**
 * GET /api/reset/validate?token=...
 * -> Confirms token is valid before showing the "set new password" form
 */
router.get("/validate", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token required." });
    const payload = verifyResetToken(token);
    if (payload.act !== "reset") return res.status(400).json({ error: "Bad token." });

    const member = await Member.findById(payload.uid).lean();
    if (!member) return res.status(404).json({ error: "Member not found." });

    res.json({
      ok: true,
      member: {
        id: String(member._id),
        memberId: member.memberId,
        name: member.name,
        email: member.email,
      },
    });
  } catch (err) {
    console.error("reset/validate error:", err);
    return res.status(400).json({ error: "Invalid or expired token." });
  }
});

/**
 * POST /api/reset/complete
 * { token, newPassword }
 */
router.post("/complete", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword)
      return res.status(400).json({ error: "Token and newPassword required." });

    if (String(newPassword).length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });

    const payload = verifyResetToken(token);
    if (payload.act !== "reset") return res.status(400).json({ error: "Bad token." });

    const member = await Member.findById(payload.uid);
    if (!member) return res.status(404).json({ error: "Member not found." });

    const hash = await bcrypt.hash(String(newPassword), 10);
    member.password = hash;
    member.mustChangePassword = false;
    await member.save();

    res.json({ ok: true, message: "Password updated. You can now login." });
  } catch (err) {
    console.error("reset/complete error:", err);
    return res.status(400).json({ error: "Invalid or expired token." });
  }
});

export default router;