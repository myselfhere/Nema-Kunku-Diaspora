// routes/contributionRoutes.js
import express from "express";
import Contribution from "../models/contributionModel.js";

const router = express.Router();

/**
 * Helper to normalise and map the incoming payload
 * from the frontend to our Contribution schema.
 */
function buildPayload(body = {}) {
  const isMember = body.isMember !== false; // default true

  // Date: frontend sends YYYY-MM-DD, we store as Date
  const rawDate = body.date;
  const date = rawDate ? new Date(rawDate) : null;

  // Plan / method mapping from frontend names
  const plan =
    body.contributionPlan ||
    body.plan ||
    "Annually";

  const method =
    body.paymentMethod ||
    body.method ||
    "Cash";

  // Years paid – guarantee array of strings
  const yearsPaid = Array.isArray(body.yearsPaid)
    ? body.yearsPaid.map(String)
    : [];

  // Receipt: if user typed something not "auto", we accept it,
  // otherwise leave undefined so the model auto-generates REC-000x.
  let receiptNumber = body.receiptNumber;
  if (typeof receiptNumber === "string") {
    const val = receiptNumber.trim().toLowerCase();
    if (!val || val === "auto") {
      receiptNumber = undefined;
    }
  } else {
    receiptNumber = undefined;
  }

  const memberId = body.memberId || "";
  const memberName = body.memberName || "";

  const payerName = body.payerName || (isMember ? memberName : "");
  const payerContact = body.payerContact || "";

  return {
    // core
    receiptNumber,
    date,

    // member / payer
    isMember,
    memberId,
    memberName: memberName || payerName || "",
    payerName,
    payerContact,

    // money
    amountEUR: body.amountEUR ?? 0,
    amountGMD: body.amountGMD ?? 0,
    rate: body.rate ?? 75,

    // meta
    plan,
    method,
    position: body.position || "",
    confirmedBy: body.confirmedBy || "",
    yearsPaid,
    remarks: body.remarks || "",
    createdBy: body.createdBy || body._userEmail || "",

    // penalty
    penaltyApplied: !!body.penaltyApplied,
    penaltyAmountGMD: body.penaltyAmountGMD ?? 0,
    penaltyReason: body.penaltyReason || "",
  };
}

/* ───────────────── GET all (with optional filters) ─────────────────
   - Admin page (no memberId)  → all records
   - Member pages (memberId=NKD0xx) → ONLY that member's records
------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const { memberId, year, page = "1", limit = "10000" } = req.query;
    const query = {};

    // 🔹 If memberId is provided (member dashboards), only that member's records
    if (memberId) {
      query.memberId = memberId;
    }

    // 🔹 Optional year filter (future use / dropdown)
    if (year) {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        const from = new Date(y, 0, 1);
        const to   = new Date(y + 1, 0, 1);
        query.date = { $gte: from, $lt: to };
      }
    }

    const pageNum  = parseInt(page, 10)  || 1;
    const limitNum = parseInt(limit, 10) || 10000;

    const items = await Contribution.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Contribution.countDocuments(query);

    res.json({ ok: true, items, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ───────────────── GET one ───────────────── */
router.get("/:id", async (req, res) => {
  try {
    const c = await Contribution.findById(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: c });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ───────────────── POST create ───────────────── */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = buildPayload(body);

    // Basic validation
    if (!payload.date) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing required field: date" });
    }

    if (payload.isMember) {
      // Member contribution: must have member id + name
      if (!payload.memberId || !payload.memberName) {
        return res.status(400).json({
          ok: false,
          error: "Missing memberId or memberName for member contribution",
        });
      }
    } else {
      // Unregistered payer: must have payerName
      if (!payload.payerName) {
        return res.status(400).json({
          ok: false,
          error: "Missing payerName for unregistered payer",
        });
      }
    }

    const c = await Contribution.create(payload);
    // receiptNumber will be auto-generated in the model if missing
    res.status(201).json({ ok: true, data: c });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ───────────────── PUT update ───────────────── */
router.put("/:id", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = buildPayload(body);
    const c = await Contribution.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    });
    if (!c) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: c });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ───────────────── DELETE ───────────────── */
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