const router = require("express").Router();
const { ensureAuth } = require("../middleware/auth");
const { uploadPost, deleteLocalFile } = require("../middleware/upload");
const Post = require("../models/Post");

function handleUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadPost(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

// ── CREATE form ───────────────────────────────────────────
router.get("/create", ensureAuth, (req, res) => {
  res.render("create-post", { title: "New Post", errors: [] });
});

// ── CREATE submit ─────────────────────────────────────────
router.post("/create", ensureAuth, async (req, res) => {
  try {
    await handleUpload(req, res);
  } catch (err) {
    return res.render("create-post", {
      title: "New Post",
      errors: [{ msg: err.message || "Upload failed. Check file type/size." }],
      old: req.body,
    });
  }

  const { title, body, tags } = req.body;
  const errors = [];
  if (!title || title.trim().length < 3)
    errors.push({ msg: "Title must be at least 3 characters." });
  if (errors.length) return res.render("create-post", { title: "New Post", errors, old: req.body });

  try {
    const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const media = (req.files || []).map((f) => ({
      url:          "/uploads/posts/" + f.filename,
      type:         f.mimetype.startsWith("video/") ? "video" : "image",
      originalName: f.originalname,
    }));

    const post = await Post.create({
      title:  title.trim(),
      body:   (body || "").trim(),
      author: req.session.user._id,
      tags:   tagList,
      media,
    });

    req.flash("success_msg", "Post published!");
    res.redirect("/posts/" + post._id);
  } catch (e) {
    console.error(e);
    res.render("create-post", { title: "New Post", errors: [{ msg: "Server error." }], old: req.body });
  }
});

// ── Single post ───────────────────────────────────────────
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username avatar bio")
      .populate("comments.author", "username avatar");
    if (!post) return res.status(404).render("404", { title: "Not Found" });
    const isAuthor = post.author._id.equals(req.session.user._id);
    const liked    = post.likes.map(String).includes(String(req.session.user._id));
    res.render("single-post", { title: post.title, post, isAuthor, liked });
  } catch (e) { res.redirect("/"); }
});

// ── Edit form ─────────────────────────────────────────────
router.get("/:id/edit", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.author.equals(req.session.user._id)) return res.redirect("/");
    res.render("edit-post", { title: "Edit Post", post, errors: [] });
  } catch (e) { res.redirect("/"); }
});

// ── Edit submit ───────────────────────────────────────────
router.post("/:id/edit", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || !post.author.equals(req.session.user._id)) return res.redirect("/");
    post.title = req.body.title;
    post.body  = req.body.body || "";
    post.tags  = req.body.tags ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    await post.save();
    req.flash("success_msg", "Post updated!");
    res.redirect("/posts/" + post._id);
  } catch (e) { res.redirect("/"); }
});

// ── Delete ────────────────────────────────────────────────
router.post("/:id/delete", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post && post.author.equals(req.session.user._id)) {
      // Delete media files from disk
      for (const m of post.media) {
        if (m.url) deleteLocalFile(m.url);
      }
      await post.deleteOne();
    }
    req.flash("success_msg", "Post deleted.");
    res.redirect("/");
  } catch (e) { res.redirect("/"); }
});

// ── Like / Unlike ─────────────────────────────────────────
router.post("/:id/like", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.redirect("back");
    const uid = String(req.session.user._id);
    const idx = post.likes.map(String).indexOf(uid);
    if (idx === -1) post.likes.push(req.session.user._id);
    else post.likes.splice(idx, 1);
    await post.save();
  } catch (e) {}
  res.redirect("back");
});

// ── Comment ───────────────────────────────────────────────
router.post("/:id/comment", ensureAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.redirect("back");
    const body = req.body.comment ? req.body.comment.trim() : "";
    if (body) post.comments.push({ author: req.session.user._id, body });
    await post.save();
  } catch (e) {}
  res.redirect("back");
});

module.exports = router;
