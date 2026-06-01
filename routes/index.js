const router = require("express").Router();
const { ensureAuth } = require("../middleware/auth");
const Post = require("../models/Post");
const User = require("../models/User");

// Guest or feed
router.get("/", async (req, res) => {
  if (!req.session.user) return res.render("guest", { title: "Welcome" });
  try {
    const me = await User.findById(req.session.user._id);
    const ids = [...(me.following || []), me._id];
    const posts = await Post.find({ author: { $in: ids } })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 }).limit(30);
    const suggested = await User.find({ _id: { $nin: ids } }).limit(5).select("username avatar bio");
    res.render("index", { title: "Home", posts, suggested, me });
  } catch (e) {
    res.render("index", { title: "Home", posts: [], suggested: [], me: null });
  }
});

// Follow / Unfollow
router.post("/follow/:id", ensureAuth, async (req, res) => {
  try {
    const me   = await User.findById(req.session.user._id);
    const them = await User.findById(req.params.id);
    if (!them || them._id.equals(me._id)) return res.redirect("back");
    const already = me.following.map(String).includes(String(them._id));
    if (already) {
      me.following   = me.following.filter(id => !id.equals(them._id));
      them.followers = them.followers.filter(id => !id.equals(me._id));
    } else {
      me.following.push(them._id);
      them.followers.push(me._id);
    }
    await me.save(); await them.save();
  } catch (e) { console.error(e); }
  res.redirect("back");
});

// Group chat
router.get("/chat", ensureAuth, (req, res) => {
  res.render("chat", { title: "Live Chat" });
});

module.exports = router;
