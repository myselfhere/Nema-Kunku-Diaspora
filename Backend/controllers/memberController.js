const Member = require('../models/Member');

// GET all members
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET member by ID
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE member
exports.createMember = async (req, res) => {
  try {
    const newMember = new Member(req.body);
    const saved = await newMember.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// UPDATE member
exports.updateMember = async (req, res) => {
  try {
    const updated = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!updated) return res.status(404).json({ message: 'Member not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE member
exports.deleteMember = async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Member not found' });
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
