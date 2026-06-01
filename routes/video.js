const router = require("express").Router();
const { ensureAuth } = require("../middleware/auth");
const User = require("../models/User");

// Video call room page
router.get("/call/:username", ensureAuth, async (req, res) => {
  try {
    const other = await User.findOne({ username: req.params.username }).select("username avatar _id");
    if (!other) return res.status(404).render("404", { title: "User Not Found" });
    if (other._id.equals(req.session.user._id)) return res.redirect("/");

    const me = await User.findById(req.session.user._id).select("username avatar _id");
    res.render("video-call", { title: `Call with ${other.username}`, me, other });
  } catch (e) {
    console.error(e);
    res.redirect("/");
  }
});

module.exports = router;
