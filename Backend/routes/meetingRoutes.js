// routes/meetingRoutes.js
import express from "express";
import Meeting from "../models/meetingModel.js";
import { nextMeetingId } from "../utils/ids.js";

const router = express.Router();

/* ---------- GET list (filters + pagination) ---------- */
router.get("/", async (req, res) => {
  try {
    const {
      q = "",
      type,            // general | emergency | special
      status,          // scheduled | held | cancelled
      date,            // optional ISO date "YYYY-MM-DD" to filter that day
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};
    if (q) {
      where.$or = [
        { meetingId: new RegExp(q, "i") },
        { topic: new RegExp(q, "i") },
        { location: new RegExp(q, "i") },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { $gte: start, $lt: end };
    }

    const pg = Math.max(1, Number(page));
    const lim = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pg - 1) * lim;

    const [items, total] = await Promise.all([
      Meeting.find(where).sort({ date: -1, createdAt: -1 }).skip(skip).limit(lim),
      Meeting.countDocuments(where),
    ]);

    res.json({ items, total, page: pg, limit: lim });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load meetings" });
  }
});

/* ---------- GET one ---------- */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Meeting.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Invalid id" });
  }
});

/* ---------- POST create ---------- */
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const date = b.date ? new Date(b.date) : new Date();

    const meetingId = (b.meetingId || "").trim() || await nextMeetingId(Meeting, date);

    const doc = await Meeting.create({
      meetingId,
      date,
      type: b.type || "general",
      topic: b.topic || "",
      location: b.location || "",
      status: b.status || "scheduled",
      notes: b.notes || "",
      attendees: Array.isArray(b.attendees) ? b.attendees : [],
      createdBy: b.createdBy || "",
      updatedBy: b.updatedBy || "",
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Failed to create meeting" });
  }
});

/* ---------- PUT update ---------- */
router.put("/:id", async (req, res) => {
  try {
    const b = req.body || {};
    if (b.date) b.date = new Date(b.date);

    const doc = await Meeting.findByIdAndUpdate(req.params.id, b, {
      new: true, runValidators: true
    });
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Update failed" });
  }
});

/* ---------- DELETE ---------- */
router.delete("/:id", async (req, res) => {
  try {
    const removed = await Meeting.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Delete failed" });
  }
});

export default router;