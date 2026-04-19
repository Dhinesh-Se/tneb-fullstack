const jwt = require("jsonwebtoken");

/**
 * Verifies Bearer token and attaches decoded payload to req.user
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorised: No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { adminId, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorised: Invalid or expired token" });
  }
};

/**
 * Role-based access: pass one or more roles e.g. authorize("ADMIN") or authorize("ADMIN","MANAGER")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
