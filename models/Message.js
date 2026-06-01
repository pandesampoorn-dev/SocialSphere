const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  from:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body:  { type: String, required: true, maxlength: 2000 },
  read:  { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model("Message", MessageSchema);
