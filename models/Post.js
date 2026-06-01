const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body:   { type: String, required: true, maxlength: 500 },
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true, maxlength: 100 },
  body:     { type: String, default: "", maxlength: 5000 },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tags:     [{ type: String, trim: true }],
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [CommentSchema],
  media: [{
    url:          { type: String, required: true }, // e.g. /uploads/posts/12345.jpg
    type:         { type: String, enum: ["image", "video"] },
    originalName: { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model("Post", PostSchema);
