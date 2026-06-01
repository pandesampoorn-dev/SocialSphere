const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

// Ensure upload folders exist
const POSTS_DIR   = path.join(__dirname, "../public/uploads/posts");
const AVATARS_DIR = path.join(__dirname, "../public/uploads/avatars");
fs.mkdirSync(POSTS_DIR,   { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });

// ── Allowed types ─────────────────────────────────────────
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_ALL   = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];
const ALLOWED_AVATAR= ALLOWED_IMAGE;

// ── Unique filename helper ────────────────────────────────
function uniqueName(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return Date.now() + "-" + Math.round(Math.random() * 1e6) + ext;
}

// ── Post media storage (images + videos) ─────────────────
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, POSTS_DIR),
  filename:    (req, file, cb) => cb(null, uniqueName(file.originalname)),
});

const postFilter = (req, file, cb) => {
  ALLOWED_ALL.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Only images (JPG/PNG/GIF/WEBP) and videos (MP4/WEBM/MOV) are allowed."), false);
};

const uploadPost = multer({
  storage:   postStorage,
  fileFilter: postFilter,
  limits:    { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
}).array("media", 5);

// ── Avatar storage (images only) ─────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename:    (req, file, cb) => cb(null, uniqueName(file.originalname)),
});

const avatarFilter = (req, file, cb) => {
  ALLOWED_AVATAR.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Avatar must be JPG, PNG or WEBP."), false);
};

const uploadAvatar = multer({
  storage:   avatarStorage,
  fileFilter: avatarFilter,
  limits:    { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("avatar");

// ── Helper: delete a local file safely ───────────────────
function deleteLocalFile(relativePath) {
  if (!relativePath) return;
  // relativePath is like /uploads/posts/12345.jpg
  const abs = path.join(__dirname, "../public", relativePath);
  fs.unlink(abs, () => {}); // silent fail if already gone
}

module.exports = { uploadPost, uploadAvatar, deleteLocalFile };
