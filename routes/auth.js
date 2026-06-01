const router  = require("express").Router();
const { body, validationResult } = require("express-validator");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const { ensureGuest, ensureAuth } = require("../middleware/auth");

const JWT_SECRET  = process.env.JWT_SECRET  || "jwt-secret";
const JWT_EXPIRES = "15m";   // access token
const RF_EXPIRES  = "7d";    // refresh token

function issueTokens(userId) {
  const payload = { id: userId };
  const accessToken  = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: RF_EXPIRES });
  return { accessToken, refreshToken };
}

// GET /auth/login
router.get("/login", ensureGuest, (req, res) => {
  res.render("login", { title: "Login" });
});

// POST /auth/login
router.post("/login", ensureGuest, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await user.matchPassword(req.body.password))) {
      req.flash("error_msg", "Invalid username or password.");
      return res.redirect("/auth/login");
    }

    // Issue JWT tokens
    const { accessToken, refreshToken } = issueTokens(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();

    // Store in session + set cookie
    req.session.user = { _id: user._id, username: user.username, avatar: user.avatar };
    req.session.accessToken = accessToken;
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    req.flash("success_msg", `Welcome back, ${user.username}!`);
    res.redirect("/");
  } catch (e) {
    req.flash("error_msg", "Server error.");
    res.redirect("/auth/login");
  }
});

// GET /auth/register
router.get("/register", ensureGuest, (req, res) => {
  res.render("register", { title: "Register", errors: [] });
});

// POST /auth/register
router.post("/register", ensureGuest, [
  body("username").trim().isLength({ min: 3, max: 20 }).withMessage("Username must be 3-20 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Letters, numbers, underscores only"),
  body("email").isEmail().withMessage("Enter a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("password2").custom((v, { req }) => {
    if (v !== req.body.password) throw new Error("Passwords do not match");
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("register", { title: "Register", errors: errors.array(), old: req.body });
  }
  try {
    const exists = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
    if (exists) {
      return res.render("register", { title: "Register", errors: [{ msg: "Username or email already taken." }], old: req.body });
    }
    const user = await User.create({ username: req.body.username, email: req.body.email, password: req.body.password });

    const { accessToken, refreshToken } = issueTokens(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();

    req.session.user = { _id: user._id, username: user.username, avatar: user.avatar };
    req.session.accessToken = accessToken;
    res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: "lax" });

    req.flash("success_msg", "Welcome to SocialSphere!");
    res.redirect("/");
  } catch (e) {
    res.render("register", { title: "Register", errors: [{ msg: "Server error." }], old: req.body });
  }
});

// POST /auth/refresh  — get new access token using refresh token
router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(token)) {
      return res.status(403).json({ error: "Refresh token revoked." });
    }
    const { accessToken, refreshToken: newRefresh } = issueTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t !== token);
    user.refreshTokens.push(newRefresh);
    await user.save();
    res.cookie("refreshToken", newRefresh, { httpOnly: true, maxAge: 7*24*60*60*1000, sameSite: "lax" });
    res.json({ accessToken });
  } catch (e) {
    res.status(403).json({ error: "Invalid refresh token." });
  }
});

// GET /auth/logout
router.get("/logout", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== token);
        await user.save();
      }
    } catch (_) {}
  }
  res.clearCookie("refreshToken");
  req.session.destroy(() => res.redirect("/auth/login"));
});

module.exports = router;
