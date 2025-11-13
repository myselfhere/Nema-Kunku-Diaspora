import express from "express";
import Project from "../models/projectModel.js";
import { nextProjectId } from "../utils/ids.js";

const router = express.Router();

/* ---------- GET list (filters + pagination) ---------- */
router.get("/", async (req, res) => {
  try {
    const {
      q = "",
      status,                 // optional: ongoing | completed | pending
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};
    if (q) {
      where.$or = [
        { name: new RegExp(q, "i") },
        { projectId: new RegExp(q, "i") },
        { responsible: new RegExp(q, "i") },
      ];
    }
    if (status) where.status = status;

    const pg = Math.max(1, Number(page));
    const lim = Math.min(200, Math.max(1, Number(limit)));
    const skip = (pg - 1) * lim;

    const [items, total] = await Promise.all([
      Project.find(where).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Project.countDocuments(where),
    ]);

    res.json({ items, total, page: pg, limit: lim });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Failed to load projects" });
  }
});

/* ---------- GET one ---------- */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Project.findById(req.params.id);
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

    // Auto-generate projectId if blank
    const projectId = (b.projectId || "").trim() || await nextProjectId(Project);

    const doc = await Project.create({
      projectId,
      name: b.name,
      status: b.status || "pending", // pending | ongoing | completed
      startDate: b.startDate || null,
      endDate: b.endDate || null,
      description: b.description || "",
      milestones: b.milestones || [],
      challenges: b.challenges || "",
      budgetGMD: Number(b.budgetGMD || 0),
      budgetEUR: Number(b.budgetEUR || 0),
      expenditureGMD: Number(b.expenditureGMD || 0),
      expenditureEUR: Number(b.expenditureEUR || 0),
      responsible: b.responsible || "",
      comments: b.comments || "",
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Failed to create project" });
  }
});

/* ---------- PUT update ---------- */
router.put("/:id", async (req, res) => {
  try {
    const doc = await Project.findByIdAndUpdate(req.params.id, req.body, {
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
    const removed = await Project.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || "Delete failed" });
  }
});

export default router;