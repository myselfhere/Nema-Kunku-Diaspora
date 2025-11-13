import express from "express";
import Member from "../models/memberModel.js";
import Contribution from "../models/contributionModel.js";
import Meeting from "../models/meetingModel.js";

const router = express.Router();

router.get("/dashboard", async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const from = new Date(`${year}-01-01T00:00:00Z`);
    const to   = new Date(`${year + 1}-01-01T00:00:00Z`);

    const totalMembers = await Member.countDocuments({});
    const activeMembers = await Member.countDocuments({ status: "Active" });

    const [sum] = await Contribution.aggregate([
      { $match: { date: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: null,
          eur: { $sum: "$amountEUR" },
          gmd: { $sum: "$amountGMD" },
        },
      },
    ]);

    const meetings = await Meeting.countDocuments({ date: { $gte: from, $lt: to } });

    res.json({
      members: { total: totalMembers, active: activeMembers },
      contributions: {
        eur: sum?.eur || 0,
        gmd: sum?.gmd || 0,
      },
      meetings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;