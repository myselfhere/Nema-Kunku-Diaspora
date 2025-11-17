// Backend/controllers/memberController.js
const Member = require('../models/memberModel'); // or '../models/Member' if that’s your filename

/* ============================================
   GET ALL MEMBERS
============================================ */
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (err) {
    console.error('getAllMembers error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================
   GET MEMBER BY ID (Mongo _id)
============================================ */
exports.getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    res.json(member);
  } catch (err) {
    console.error('getMemberById error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ============================================
   CREATE MEMBER
============================================ */
exports.createMember = async (req, res) => {
  try {
    const newMember = new Member(req.body);
    const saved = await newMember.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('createMember error:', err);
    res.status(400).json({ message: err.message });
  }
};

/* ============================================
   UPDATE MEMBER
============================================ */
exports.updateMember = async (req, res) => {
  try {
    const updated = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('updateMember error:', err);
    res.status(400).json({ message: err.message });
  }
};

/* ============================================
   DELETE MEMBER
============================================ */
exports.deleteMember = async (req, res) => {
  try {
    const deleted = await Member.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('deleteMember error:', err);
    res.status(500).json({ message: err.message });
  }
};