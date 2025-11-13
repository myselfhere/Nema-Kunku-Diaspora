// Backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "nkdSecret123@2025";

/** Create a signed JWT for a member document or plain object */
export function signToken(u) {
  return jwt.sign(
    {
      id: String(u._id || u.id || ""),
      memberId: u.memberId,
      role: (u.role || "member"),
      email: u.email,
      name: u.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/** Verify Bearer token and attach req.user */
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

/** Ensure the logged‐in user has one of the roles */
export function requireRoles(...roles) {
  const allow = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!allow.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

export default { signToken, requireAuth, requireRoles };