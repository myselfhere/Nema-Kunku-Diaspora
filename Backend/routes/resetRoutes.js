import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
// import twilio from "twilio"; // optional later

const router = express.Router();

// Temporary in-memory store (replace with MongoDB later)
const resetTokens = new Map();

// ✅ Send reset link via Email
router.post("/request", async (req, res) => {
  const { loginId, method, phone } = req.body;

  // Demo lookup: you'd query MongoDB for member/admin by ID/email
  if (!loginId) return res.status(400).json({ error: "Login ID required" });

  const token = crypto.randomBytes(32).toString("hex");
  const link = `${process.env.SITE_URL}/Frontend/reset-password.html?token=${token}`;

  // Save token temporarily
  resetTokens.set(token, { loginId, expires: Date.now() + 30 * 60 * 1000 });

  try {
    if (method === "email") {
      // ⚙️ Set up Nodemailer
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Nema Kunku Diaspora" <${process.env.EMAIL_USER}>`,
        to: loginId,
        subject: "Password Reset Link",
        html: `
          <h2>Password Reset</h2>
          <p>You requested to reset your password. Click the link below:</p>
          <a href="${link}">${link}</a>
          <p>This link expires in 30 minutes.</p>
        `,
      });

      return res.json({ message: `Reset link sent to ${loginId}` });
    }

    // ✅ Optional SMS (Twilio)
    if (method === "sms") {
      // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
      // await client.messages.create({
      //   from: process.env.TWILIO_PHONE,
      //   to: phone,
      //   body: `Reset your NKD password: ${link}`,
      // });
      return res.json({ message: `Reset link sent via SMS to ${phone}` });
    }

    res.status(400).json({ error: "Invalid method" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send reset link" });
  }
});

// ✅ Reset password confirmation
router.post("/confirm", (req, res) => {
  const { token, newPassword } = req.body;
  const record = resetTokens.get(token);
  if (!record) return res.status(400).json({ error: "Invalid or expired token" });

  // TODO: Update password in MongoDB
  // await Member.updateOne({ email: record.loginId }, { password: hashedPassword });

  resetTokens.delete(token);
  res.json({ message: "Password updated successfully" });
});

export default router;