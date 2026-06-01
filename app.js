require("dotenv").config();
const express      = require("express");
const http         = require("http");
const socketio     = require("socket.io");
const mongoose     = require("mongoose");
const session      = require("express-session");
const MongoStore   = require("connect-mongo");
const flash        = require("connect-flash");
const cookieParser = require("cookie-parser");
const path         = require("path");

const app    = express();
const server = http.createServer(app);
const io     = socketio(server);

// ── Database ──────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/socialsphere")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("DB Error:", err));

// ── View Engine ───────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ────────────────────────────────────────────
app.set("trust proxy", 1); // trust Render/Heroku reverse proxy
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// ── Session ───────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || "socialsphere-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/socialsphere",
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "lax" : false,
  },
}));

app.use(flash());

// ── Global Locals ─────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user        = req.session.user || null;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg   = req.flash("error_msg");
  next();
});

// ── Routes ────────────────────────────────────────────────
app.use("/",       require("./routes/index"));
app.use("/auth",   require("./routes/auth"));
app.use("/posts",  require("./routes/posts"));
app.use("/users",  require("./routes/users"));
app.use("/ai",     require("./routes/ai"));
app.use("/api",    require("./routes/api"));
app.use("/dm",     require("./routes/dm"));
app.use("/video",  require("./routes/video"));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

// ── Socket.IO Controllers ─────────────────────────────────
require("./controllers/chatController")(io);
require("./controllers/dmController")(io);
require("./controllers/videoController")(io);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SocialSphere running at http://localhost:${PORT}`);
});
 