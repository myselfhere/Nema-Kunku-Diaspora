// Backend/middleware/auth.js
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, memberId, role, email, name }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * requireRoles("admin") or requireRoles("admin","financial")
 */
function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = { verifyToken, requireRoles };