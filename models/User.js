const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true },
  bio:           { type: String, default: "", maxlength: 150 },
  avatar:        { type: String, default: "" },   // local path: /uploads/avatars/filename.jpg
  followers:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  refreshTokens: [{ type: String }],              // JWT refresh tokens
}, { timestamps: true });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.matchPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model("User", UserSchema);
