// Backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import Member from "../models/memberModel.js";

const router = express.Router();

/**
 * POST /api/auth/change-password
 * Body: { identifier, currentPassword, newPassword }
 * - identifier: memberId (e.g., NKD002) or email
 * - If member.mustChangePassword === true, currentPassword is optional
 */
router.post("/change-password", async (req, res) => {
  try {
    const { identifier, currentPassword, newPassword } = req.body || {};
    if (!identifier || !newPassword) {
      return res.status(400).json({ ok: false, error: "identifier and newPassword are required." });
    }

    // Resolve member by memberId OR email
    const needle = String(identifier).trim().toLowerCase();
    const m = await Member.findOne({
      $or: [
        { memberId: needle.toUpperCase() },               // allow NKD### case-insensitive
        { email: needle }                                  // email is already lowercased generally
      ]
    });

    if (!m) return res.status(404).json({ ok: false, error: "Member not found." });

    // Basic new password checks
    if (String(newPassword).length < 8) {
      return res.status(400).json({ ok: false, error: "New password must be at least 8 characters." });
    }

    // If not in 'must change' mode, verify current password
    if (!m.mustChangePassword) {
      if (!currentPassword) return res.status(400).json({ ok: false, error: "Current password is required." });
      const ok = await m.comparePassword(currentPassword);
      if (!ok) return res.status(401).json({ ok: false, error: "Current password is incorrect." });
    }

    // Prevent reusing the same password
    const same = await bcrypt.compare(newPassword, m.passwordHash || "");
    if (same) return res.status(400).json({ ok: false, error: "New password must be different from the current password." });

    // Save new password
    await m.setPassword(newPassword);
    m.mustChangePassword = false;
    await m.save();

    return res.json({ ok: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("change-password error:", err);
    return res.status(500).json({ ok: false, error: "Server error updating password." });
  }
});

export default router;