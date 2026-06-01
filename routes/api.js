const router  = require("express").Router();
const { jwtAuth } = require("../middleware/auth");
const Post    = require("../models/Post");
const User    = require("../models/User");

// GET /api/token — return session access token for JS clients
router.get("/token", (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not logged in." });
  res.json({ token: req.session.accessToken });
});

// GET /api/me
router.get("/me", jwtAuth, async (req, res) => {
  try {
    const user = await User.findById(req.jwtUser.id).select("-password -refreshTokens");
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Server error." }); }
});

// GET /api/feed
router.get("/feed", jwtAuth, async (req, res) => {
  try {
    const me  = await User.findById(req.jwtUser.id);
    const ids = [...(me.following || []), me._id];
    const posts = await Post.find({ author: { $in: ids } })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (e) { res.status(500).json({ error: "Server error." }); }
});

// GET /api/posts/:id
router.get("/posts/:id", jwtAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author", "username avatar");
    if (!post) return res.status(404).json({ error: "Not found." });
    res.json(post);
  } catch (e) { res.status(500).json({ error: "Server error." }); }
});

// POST /api/posts/:id/like
router.post("/posts/:id/like", jwtAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found." });
    const uid = String(req.jwtUser.id);
    const idx = post.likes.map(String).indexOf(uid);
    if (idx === -1) post.likes.push(req.jwtUser.id);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (e) { res.status(500).json({ error: "Server error." }); }
});

module.exports = router;
