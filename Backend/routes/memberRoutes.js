// /routes/memberRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import Member from "../models/memberModel.js";
import { nextMemberId } from "../utils/ids.js";
import { requireFields, cleanDate } from "../utils/validate.js";

const router = express.Router();

/* -----------------------------------------
   GET /api/members/stats  (for dashboards)
   ----------------------------------------- */
router.get("/stats", async (_req, res) => {
  try {
    const total = await Member.countDocuments({});
    const active = await Member.countDocuments({ status: "Active" });

    // plan buckets
    const planAgg = await Member.aggregate([
      { $group: { _id: "$contributionPlan", n: { $sum: 1 } } },
    ]);
    const plans = planAgg.reduce(
      (acc, r) => ((acc[r._id || "Unknown"] = r.n), acc),
      {}
    );

    res.json({
      total,
      active,
      plans: {
        "Semi-Annual": plans["Semi-Annual"] || 0,
        Annually: plans["Annually"] || 0,
        Unknown: plans["Unknown"] || 0,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to load member stats" });
  }
});

/* ---------------------------------------------------
   GET /api/members  (list with q/role/plan + paging)
   - also supports ?memberId=NKD001 for a single fetch
   --------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const { q = "", role, plan, page = 1, limit = 50, memberId } = req.query;

    // Quick single fetch by memberId if provided
    if (memberId) {
      const doc = await Member.findOne({ memberId: String(memberId).trim() });
      if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
      return res.json({ items: [doc], total: 1, page: 1, limit: 1 });
    }

    const where = {};
    if (q) {
      where.$or = [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { memberId: new RegExp(q, "i") },
        { country: new RegExp(q, "i") },
      ];
    }
    if (role) where.role = role;
    if (plan) where.contributionPlan = plan;

    const pg = Math.max(1, Number(page));
    const lim = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pg - 1) * lim;

    const [items, total] = await Promise.all([
      Member.find(where).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Member.countDocuments(where),
    ]);

    res.json({ items, total, page: pg, limit: lim });
  } catch (err) {
    res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to load members" });
  }
});

/* -----------------------------------------
   GET /api/members/:id  (single by _id)
   ----------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Member.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Invalid id" });
  }
});

/* -----------------------------------------
   POST /api/members  (create)
   ----------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};

    // Required (memberId is auto if blank)
    requireFields(b, ["name", "role", "contributionPlan", "memberSince", "status"]);

    const memberId =
      (b.memberId || "").trim() || (await nextMemberId(Member));
    const memberSince = cleanDate(b.memberSince);
    const email = (b.email || "").trim().toLowerCase();

    // Optional password; if not provided, force first-time change
    let passwordHash;
    let mustChangePassword = false;
    if (b.password && String(b.password).length >= 8) {
      passwordHash = await bcrypt.hash(String(b.password), 10);
    } else if (!b.password) {
      mustChangePassword = true;
    }

    // Unique memberId
    const exists = await Member.findOne({ memberId });
    if (exists) throw new Error("memberId already exists.");

    const doc = await Member.create({
      name: b.name,
      memberId,
      email,
      phone: b.phone || "",
      country: b.country || "",
      position: b.position || "",
      contactMethod: b.preferredContact || b.contactMethod || "Not set",
      role: b.role,
      contributionPlan: b.contributionPlan,
      memberSince,
      status: b.status,
      totalPaidGMD: Number(b.totalPaidGMD || 0),

      // auth
      passwordHash,
      mustChangePassword,
      resetToken: undefined,
      resetTokenExpires: undefined,
    });

    res.status(201).json(doc);
  } catch (err) {
    res
      .status(400)
      .json({ ok: false, error: err.message || "Failed to create member" });
  }
});

/* -----------------------------------------
   PUT /api/members/:id  (update)
   ----------------------------------------- */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const b = { ...req.body };
    delete b.password; // use dedicated route for password

    if (b.memberSince) b.memberSince = cleanDate(b.memberSince);
    if (b.email) b.email = String(b.email).trim().toLowerCase();
    if (b.preferredContact && !b.contactMethod)
      b.contactMethod = b.preferredContact;

    const doc = await Member.findByIdAndUpdate(id, b, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Update failed" });
  }
});

/* -----------------------------------------
   DELETE /api/members/:id
   ----------------------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const removed = await Member.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Delete failed" });
  }
});

/* ------------------------------------------------
   POST /api/members/:id/reset   (start reset)
   ------------------------------------------------ */
router.post("/:id/reset", async (req, res) => {
  try {
    const m = await Member.findById(req.params.id);
    if (!m) return res.status(404).json({ ok: false, error: "Not found" });

    m.resetToken = crypto.randomBytes(24).toString("hex");
    m.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    m.mustChangePassword = true;
    await m.save();

    res.json({ ok: true, token: m.resetToken });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Reset init failed" });
  }
});

/* ------------------------------------------------
   POST /api/members/reset/confirm   (finish reset)
   body: { token, newPassword }
   ------------------------------------------------ */
router.post("/reset/confirm", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || String(newPassword).length < 8)
      return res.status(400).json({ ok: false, error: "Invalid request" });

    const m = await Member.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });
    if (!m) return res.status(400).json({ ok: false, error: "Token invalid/expired" });

    m.passwordHash = await bcrypt.hash(String(newPassword), 10);
    m.resetToken = undefined;
    m.resetTokenExpires = undefined;
    m.mustChangePassword = false;
    await m.save();

    res.json({ ok: true });
  } catch (err) {
    res
      .status(400)
      .json({ ok: false, error: err.message || "Reset confirm failed" });
  }
});

export default router;