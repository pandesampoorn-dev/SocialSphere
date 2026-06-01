const router  = require("express").Router();
const { ensureAuth } = require("../middleware/auth");
const Message = require("../models/Message");
const User    = require("../models/User");

// List all DM conversations
router.get("/", ensureAuth, async (req, res) => {
  try {
    const uid = req.session.user._id;
    const sent  = await Message.distinct("to",   { from: uid });
    const recvd = await Message.distinct("from", { to:   uid });
    const allIds = [...new Set([...sent.map(String), ...recvd.map(String)])];
    const contacts = await User.find({ _id: { $in: allIds } }).select("username avatar");

    const withUnread = await Promise.all(contacts.map(async (c) => {
      const unread = await Message.countDocuments({ from: c._id, to: uid, read: false });
      const latest = await Message.findOne({
        $or: [{ from: uid, to: c._id }, { from: c._id, to: uid }]
      }).sort({ createdAt: -1 });
      return { user: c, unread, latest };
    }));

    // Sort by latest message
    withUnread.sort((a, b) => {
      const aT = a.latest ? a.latest.createdAt : 0;
      const bT = b.latest ? b.latest.createdAt : 0;
      return bT - aT;
    });

    res.render("dm-list", { title: "Messages", contacts: withUnread });
  } catch (e) { console.error(e); res.redirect("/"); }
});

// Chat with a specific user
router.get("/:username", ensureAuth, async (req, res) => {
  try {
    const me    = req.session.user;
    const other = await User.findOne({ username: req.params.username });
    if (!other) return res.status(404).render("404", { title: "User Not Found" });
    if (String(other._id) === String(me._id)) return res.redirect("/");

    // Load history
    const messages = await Message.find({
      $or: [
        { from: me._id, to: other._id },
        { from: other._id, to: me._id },
      ],
    }).sort({ createdAt: 1 }).limit(100);

    // Mark received messages as read
    await Message.updateMany({ from: other._id, to: me._id, read: false }, { read: true });

    res.render("dm-chat", {
      title: `Chat with ${other.username}`,
      other,
      messages,
      me,
    });
  } catch (e) { console.error(e); res.redirect("/dm"); }
});

module.exports = router;
