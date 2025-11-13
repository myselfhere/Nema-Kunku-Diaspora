import express from "express";
import Expenditure from "../models/expenditureModel.js";

const router = express.Router();

// GET all expenditures
router.get("/", async (req, res) => {
  try {
    const items = await Expenditure.find().sort({ date: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one expenditure
router.get("/:id", async (req, res) => {
  try {
    const item = await Expenditure.findById(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new expenditure
router.post("/", async (req, res) => {
  try {
    const newItem = new Expenditure(req.body);
    await newItem.save();
    res.json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update expenditure
router.put("/:id", async (req, res) => {
  try {
    const updated = await Expenditure.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;