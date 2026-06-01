const jwt = require("jsonwebtoken");

function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  req.flash("error_msg", "Please log in first.");
  res.redirect("/auth/login");
}

function ensureGuest(req, res, next) {
  if (!req.session.user) return next();
  res.redirect("/");
}

// JWT middleware for API routes
function jwtAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "jwt-secret");
    req.jwtUser = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

module.exports = { ensureAuth, ensureGuest, jwtAuth };
