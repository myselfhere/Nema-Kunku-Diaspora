// Backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const Member = require('../models/memberModel'); // adjust if your path differs

/**
 * Expects { identity, password }
 * identity can be email OR memberId
 * Responds with { success, user } where user has: id, memberId, name, email, role, mustChangePassword
 */
exports.login = async (req, res) => {
  try {
    const { identity, password } = req.body || {};

    if (!identity || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing credentials' });
    }

    // Find by email OR memberId
    const user = await Member.findOne({
      $or: [{ email: identity }, { memberId: identity }],
    }).lean();

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    // Compare password (user.password must be a bcrypt hash)
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    // Build payload your frontend expects
    const payload = {
      id: user._id?.toString?.() || user.id,
      memberId: user.memberId,
      name: user.name,
      email: user.email,
      role: user.role || 'member',
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    return res.json({ success: true, user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};