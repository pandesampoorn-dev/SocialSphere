const router = require("express").Router();
const { ensureAuth } = require("../middleware/auth");
const { uploadAvatar, deleteLocalFile } = require("../middleware/upload");
const User = require("../models/User");
const Post = require("../models/Post");

// ── User Search ───────────────────────────────────────────
router.get("/search/results", ensureAuth, async (req, res) => {
  const q = (req.query.q || "").trim();
  try {
    const users = q
      ? await User.find({
          _id: { $ne: req.session.user._id },
          $or: [
            { username: { $regex: q, $options: "i" } },
            { bio:      { $regex: q, $options: "i" } },
          ],
        })
          .select("username avatar bio followers")
          .limit(20)
      : [];

    const me = await User.findById(req.session.user._id).select("following");
    const followingSet = new Set(me.following.map(String));

    const results = users.map((u) => ({
      ...u.toObject(),
      isFollowing: followingSet.has(String(u._id)),
    }));

    res.render("search", { title: "Search Users", results, q });
  } catch (e) {
    console.error(e);
    res.render("search", { title: "Search Users", results: [], q });
  }
});

function handleAvatarUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadAvatar(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

// ── Profile page ──────────────────────────────────────────
router.get("/:username", ensureAuth, async (req, res) => {
  try {
    const profile = await User.findOne({ username: req.params.username });
    if (!profile) return res.status(404).render("404", { title: "User Not Found" });
    const posts = await Post.find({ author: profile._id }).sort({ createdAt: -1 });
    const me = await User.findById(req.session.user._id);
    const isFollowing = me.following.map(String).includes(String(profile._id));
    const isOwn = profile._id.equals(me._id);
    res.render("profile", { title: profile.username, profile, posts, isFollowing, isOwn });
  } catch (e) { res.redirect("/"); }
});

// ── Settings page ─────────────────────────────────────────
router.get("/:username/settings", ensureAuth, async (req, res) => {
  if (req.params.username !== req.session.user.username) return res.redirect("/");
  const user = await User.findById(req.session.user._id);
  res.render("settings", { title: "Settings", user, errors: [] });
});

// ── Settings submit ───────────────────────────────────────
router.post("/:username/settings", ensureAuth, async (req, res) => {
  if (req.params.username !== req.session.user.username) return res.redirect("/");

  try {
    await handleAvatarUpload(req, res);
  } catch (err) {
    const user = await User.findById(req.session.user._id);
    return res.render("settings", {
      title: "Settings", user,
      errors: [{ msg: err.message || "Avatar upload failed. Must be JPG/PNG/WEBP under 5 MB." }],
    });
  }

  try {
    const user = await User.findById(req.session.user._id);
    user.bio = req.body.bio || "";

    if (req.file) {
      // Delete old avatar from disk
      if (user.avatar && user.avatar.startsWith("/uploads/")) {
        deleteLocalFile(user.avatar);
      }
      user.avatar = "/uploads/avatars/" + req.file.filename;
      req.session.user.avatar = user.avatar;
    }

    await user.save();
    req.flash("success_msg", "Profile updated!");
    res.redirect("/users/" + user.username);
  } catch (e) {
    req.flash("error_msg", "Error updating profile.");
    res.redirect("back");
  }
});

module.exports = router;
