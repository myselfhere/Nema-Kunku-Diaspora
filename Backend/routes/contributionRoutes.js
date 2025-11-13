import express from "express";
import Contribution from "../models/contributionModel.js";

const router = express.Router();

// Generate next receipt number REC-0001, REC-0002, ...
async function nextReceiptNumber() {
  const last = await Contribution.findOne().sort({ createdAt: -1 });
  const lastNum = last?.receiptNumber?.replace("REC-", "") || "0000";
  const next = String(Number(lastNum) + 1).padStart(4, "0");
  return `REC-${next}`;
}

// GET all
router.get("/", async (_req, res) => {
  try {
    const items = await Contribution.find().sort({ date: -1, createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET one
router.get("/:id", async (req, res) => {
  try {
    const c = await Contribution.findById(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: "Not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST create
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.memberName || !body.memberId || !body.date) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    const receiptNumber = await nextReceiptNumber();
    const c = await Contribution.create({ ...body, receiptNumber });
    res.status(201).json({ ok: true, data: c });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT update
router.put("/:id", async (req, res) => {
  try {
    const c = await Contribution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: c });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const c = await Contribution.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, deleted: c._id });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;