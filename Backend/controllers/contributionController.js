// Backend/controllers/contributionController.js
const Contribution = require('../models/contributionModel');

/* ============================================
   GET /api/contributions
   ?page=1&limit=50
============================================ */
exports.getContributions = async (req, res) => {
  try {
    const page  = parseInt(req.query.page, 10)  || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Contribution.find().sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      Contribution.countDocuments(),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('getContributions error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================
   GET /api/contributions/:id
============================================ */
exports.getContributionById = async (req, res) => {
  try {
    const contrib = await Contribution.findById(req.params.id);
    if (!contrib) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    res.json(contrib);
  } catch (err) {
    console.error('getContributionById error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================
   POST /api/contributions
============================================ */
exports.createContribution = async (req, res) => {
  try {
    const payload = {
      date: req.body.date,
      memberId: req.body.memberId,
      memberName: req.body.memberName,
      contributionPlan: req.body.contributionPlan || req.body.plan,
      paymentMethod: req.body.paymentMethod || req.body.method,
      amountEUR: req.body.amountEUR || req.body.eur || 0,
      amountGMD: req.body.amountGMD || req.body.gmd || 0,
      yearsCovered: req.body.yearsCovered || [],
      position: req.body.position || '',
      confirmedBy: req.body.confirmedBy || '',
      remarks: req.body.remarks || '',
    };

    const contrib = new Contribution(payload);
    const saved = await contrib.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('createContribution error:', err);
    res.status(400).json({ message: err.message });
  }
};

/* ============================================
   PUT /api/contributions/:id
============================================ */
exports.updateContribution = async (req, res) => {
  try {
    const update = {
      ...req.body,
    };

    // If someone passes plan/method under short names
    if (req.body.plan) {
      update.contributionPlan = req.body.plan;
    }
    if (req.body.method) {
      update.paymentMethod = req.body.method;
    }

    const updated = await Contribution.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('updateContribution error:', err);
    res.status(400).json({ message: err.message });
  }
};

/* ============================================
   DELETE /api/contributions/:id
============================================ */
exports.deleteContribution = async (req, res) => {
  try {
    const deleted = await Contribution.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Contribution not found' });
    }
    res.json({ message: 'Contribution deleted' });
  } catch (err) {
    console.error('deleteContribution error:', err);
    res.status(500).json({ message: err.message });
  }
};