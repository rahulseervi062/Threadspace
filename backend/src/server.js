 import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import path from "path";
import { Server } from "socket.io";
import { v2 as cloudinary } from "cloudinary";
import { fileURLToPath } from "url";
import dns from "dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

// ============================================
// DNS Setup
// ============================================
const dnsServers = (process.env.MONGODB_DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length) {
  dns.setServers(dnsServers);
  console.log("🔧 Using DNS servers:", dnsServers.join(", "));
}

// ============================================
// MongoDB Connection — with retry logic
// ============================================
const connectDB = async (retries = 5, delay = 3000) => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    process.exit(1);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000, // 10s timeout per attempt
        socketTimeoutMS: 45000,
      });
      console.log("✅ MongoDB Connected Successfully");
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`🔁 Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  console.error("❌ All MongoDB connection attempts failed. Exiting.");
  process.exit(1);
};

// Handle mongoose disconnection events
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Attempting reconnect...");
  connectDB(3, 5000);
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err.message);
});

connectDB();

// ============================================
// Mongoose Models
// ============================================

// --- User ---
const UserSchema = new mongoose.Schema({
  uid: { type: Number, default: () => Date.now() },
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  phone: String,
  password: String,
  following: [String],
  followingSubreddits: [String],
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// --- Post ---
const ReplySchema = new mongoose.Schema({
  id: Number,
  authorName: String,
  authorEmail: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const CommentSchema = new mongoose.Schema({
  id: Number,
  authorName: String,
  authorEmail: String,
  text: String,
  replies: [ReplySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});
const PostSchema = new mongoose.Schema({
  id: { type: Number, default: () => Date.now() },
  caption: String,
  imageUrl: String,
  subreddit: String,
  authorName: String,
  authorEmail: String,
  poll: {
    question: String,
    options: [String],
    votes: { type: Map, of: Number, default: {} }
  },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [String],
  dislikedBy: [String],
  savedBy: [String],
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});
const Post = mongoose.models.Post || mongoose.model("Post", PostSchema);

// --- Subreddit ---
const SubredditSchema = new mongoose.Schema({
  id: { type: Number, default: () => Date.now() },
  name: { type: String, unique: true },
  title: String,
  description: String
});
const Subreddit = mongoose.models.Subreddit || mongoose.model("Subreddit", SubredditSchema);

// --- Message ---
const MessageSchema = new mongoose.Schema({
  id: { type: Number, default: () => Date.now() },
  fromEmail: String,
  fromName: String,
  toEmail: String,
  toName: String,
  text: { type: String, default: "" },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  replyTo: mongoose.Schema.Types.Mixed,
  reactions: { type: Map, of: String, default: {} },
  read: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.models.Message || mongoose.model("Message", MessageSchema);

// --- Notification ---
const NotificationSchema = new mongoose.Schema({
  id: Number,
  toEmail: String,
  type: String,
  title: String,
  message: String,
  postId: Number,
  actorEmail: String,
  actorName: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

// --- OTP (persistent) ---
const OtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  purpose: { type: String, default: "login" },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true }
});
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);

// ============================================
// Express + Socket.IO Setup
// ============================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
});

transporter.verify().then(() => {
  console.log("✅ Email transporter verified");
}).catch((err) => {
  console.warn("⚠️ Email transporter verification failed:", err.message || err);
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173"
  }
});

const PORT = Number(process.env.PORT) || 4000;

const demoEmail = process.env.DEMO_EMAIL || "demo@site.com";
const demoPassword = process.env.DEMO_PASSWORD || "Password@123";
const demoPhone = process.env.DEMO_PHONE || "9999999999";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../../frontend/dist");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================
// Middleware
// ============================================
app.use(helmet());
app.use(express.json());

const rawCorsOrigins = String(process.env.CORS_ORIGIN || "").trim();
const allowedOrigins = rawCorsOrigins === "*"
  ? []
  : rawCorsOrigins
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
  origin: rawCorsOrigins === "*" || !rawCorsOrigins ? true : function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(a => {
      try {
        if (a.startsWith("/") || a.includes(".*")) {
          return new RegExp(a).test(origin);
        }
        return a === origin;
      } catch {
        return a === origin;
      }
    });
    if (allowed) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  }
}));

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { ok: false, message: "Too many requests, please try again later." }
});
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 200 });
app.use(generalLimiter);

// ============================================
// DB readiness middleware — returns 503 if MongoDB not connected
// ============================================
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ ok: false, message: "Server is starting up, please try again in a moment." });
  }
  next();
});

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============================================
// Seed Demo Data
// ============================================
const seedDemoData = async () => {
  try {
    const existingUser = await User.findOne({ email: demoEmail });
    if (!existingUser) {
      const hashed = await bcrypt.hash(demoPassword, 10);
      await User.create({ uid: 1, name: "Demo User", email: demoEmail, phone: demoPhone, password: hashed });
      console.log("✅ Demo user seeded");
    }

    const subCount = await Subreddit.countDocuments();
    if (subCount === 0) {
      await Subreddit.insertMany([
        { id: 1, name: "announcements", title: "Announcements", description: "Official updates and highlights from the community." },
        { id: 2, name: "photography", title: "Photography", description: "Share your favorite moments and visual stories." },
        { id: 3, name: "campuslife", title: "Campus Life", description: "Talk about events, student life, and day-to-day updates." }
      ]);
      console.log("✅ Default subreddits seeded");
    }
  } catch (err) {
    console.error("Seed error:", err);
  }
};

mongoose.connection.once("open", seedDemoData);

// ============================================
// Helpers
// ============================================
function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

// ============================================
// Root + Health
// ============================================
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Threadspace backend is running" });
});

app.get("/api/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({ ok: dbStatus === 1, service: "login-api", db: statusMap[dbStatus] || "unknown" });
});

// ============================================
// Auth Routes
// ============================================
app.post("/api/login", authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ ok: false, message: "Email and password are required." });

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) return res.status(401).json({ ok: false, message: "Invalid email or password.", showForgotPassword: true });

  // Try bcrypt comparison first
  let match = await bcrypt.compare(password, user.password).catch(() => false);
  
  // Fallback: If bcrypt fails and password looks like plain text, compare directly
  if (!match && !user.password.startsWith("$2")) {
    match = password === user.password;
    if (match) {
      // Hash the password for future use
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }
  }
  
  if (match) return res.json({ ok: true, message: "Login successful.", user: { name: user.name, email: user.email, phone: user.phone || "" } });

  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await Otp.create({ email: normalizeEmail(email), otp, purpose: "login", expiresAt });

  transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Login Verification OTP",
    text: `Your OTP for login is: ${otp}. It expires in 5 minutes.`
  }).catch(err => console.error("Email error:", err));

  return res.status(401).json({ ok: false, message: "Incorrect password. A verification OTP has been sent to your email.", requiresOtp: true, email });
}));

app.post("/api/verify-otp", authLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) return res.status(400).json({ ok: false, message: "Email and OTP are required." });

  const record = await Otp.findOne({ email: normalizeEmail(email), otp });
  if (!record) return res.status(401).json({ ok: false, message: "No OTP found for this email or OTP invalid." });
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    await Otp.deleteOne({ _id: record._id });
    return res.status(401).json({ ok: false, message: "OTP has expired." });
  }

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });

  await Otp.deleteOne({ _id: record._id });
  return res.json({ ok: true, message: "Login successful via OTP.", user: { name: user.name, email: user.email, phone: user.phone || "" } });
}));

app.post("/api/signup", authLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body ?? {};
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!name || !email || !password || !normalizedPhone) return res.status(400).json({ ok: false, message: "Name, email, mobile number and password are required." });

  const existingUser = await User.findOne({ email: normalizeEmail(email) });
  if (existingUser) return res.status(409).json({ ok: false, message: "An account with this email already exists." });

  const existingPhone = await User.findOne({ phone: normalizedPhone });
  if (existingPhone) return res.status(409).json({ ok: false, message: "An account with this mobile number already exists." });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = await User.create({ uid: Date.now(), name, email: normalizeEmail(email), phone: normalizedPhone, password: hashed });
  return res.status(201).json({ ok: true, message: "Account created successfully.", user: { name: newUser.name, email: newUser.email, phone: newUser.phone || "" } });
}));

app.post("/api/forgot-password", authLimiter, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ ok: false, message: "Email is required." });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "No account found with this email." });

  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await Otp.create({ email: user.email, otp, purpose: "reset", expiresAt });

  return transporter.sendMail({ from: process.env.GMAIL_USER, to: user.email, subject: "Password Reset OTP", text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.` })
    .then(() => res.json({ ok: true, message: "A password reset OTP has been sent to your email.", requiresOtp: true, email: user.email }))
    .catch((err) => {
      console.error("Send reset OTP error:", err);
      return res.status(500).json({ ok: false, message: "Failed to send reset OTP." });
    });
}));

app.post("/api/reset-password-otp", authLimiter, asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body ?? {};
  const email = normalizeEmail(req.body?.email);
  if (!email || !otp || !newPassword) return res.status(400).json({ ok: false, message: "Email, OTP, and new password are required." });

  const record = await Otp.findOne({ email, otp, purpose: "reset" });
  if (!record) return res.status(401).json({ ok: false, message: "No OTP found for this email." });
  if (Date.now() > new Date(record.expiresAt).getTime()) {
    await Otp.deleteOne({ _id: record._id });
    return res.status(401).json({ ok: false, message: "OTP has expired." });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await Otp.deleteOne({ _id: record._id });
  return res.json({ ok: true, message: "Password has been reset successfully." });
}));

// ============================================
// Users
// ============================================
app.get("/api/users", asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const filter = query
    ? { $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }] }
    : {};
  const users = await User.find(filter).select("uid name email phone");
  res.json({ ok: true, users: users.map(u => ({ id: u.uid, name: u.name, email: u.email, phone: u.phone || "" })) });
}));

app.patch("/api/account", asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name || "").trim();
  const phone = normalizePhoneNumber(req.body?.phone);
  if (!email || !name || !phone) return res.status(400).json({ ok: false, message: "Email, name, and mobile number are required." });

  const user = await User.findOneAndUpdate({ email }, { name, phone }, { new: true });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  return res.json({ ok: true, user: { name: user.name, email: user.email, phone: user.phone } });
}));

app.post("/api/account/password", asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!email || !currentPassword || !newPassword) return res.status(400).json({ ok: false, message: "Email, current password, and new password are required." });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(401).json({ ok: false, message: "Current password is incorrect." });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json({ ok: true, message: "Password updated successfully." });
}));

// ============================================
// Subreddits
// ============================================
app.get("/api/subreddits", asyncHandler(async (_req, res) => {
  const subreddits = await Subreddit.find().sort({ _id: -1 });
  res.json({ ok: true, subreddits });
}));

app.post("/api/subreddits", asyncHandler(async (req, res) => {
  const { name, title, description } = req.body ?? {};
  if (!name || !title) return res.status(400).json({ ok: false, message: "Subreddit name and title are required." });

  const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, "");
  const exists = await Subreddit.findOne({ name: normalizedName });
  if (exists) return res.status(409).json({ ok: false, message: "This subreddit already exists." });

  const subreddit = await Subreddit.create({ id: Date.now(), name: normalizedName, title: String(title).trim(), description: String(description || "").trim() });
  return res.status(201).json({ ok: true, subreddit });
}));

// ============================================
// Search
// ============================================
app.get("/api/search", asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const type = String(req.query.type || "all").toLowerCase();
  if (!query) return res.json({ ok: true, results: { posts: [], subreddits: [], users: [] } });

  const results = { posts: [], subreddits: [], users: [] };
  const re = { $regex: query, $options: "i" };

  if (type === "all" || type === "posts") results.posts = await Post.find({ $or: [{ caption: re }, { subreddit: re }, { authorName: re }] });
  if (type === "all" || type === "subreddits") results.subreddits = await Subreddit.find({ $or: [{ name: re }, { title: re }, { description: re }] });
  if (type === "all" || type === "users") {
    const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("uid name email phone");
    results.users = users.map(u => ({ id: u.uid, name: u.name, email: u.email, phone: u.phone || "" }));
  }

  res.json({ ok: true, results });
}));

// ============================================
// Posts
// ============================================
app.get("/api/posts", asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const sort = req.query.sort || "new";
  let sortQuery = { createdAt: -1 };
  if (sort === "top") sortQuery = { likes: -1 };

  const total = await Post.countDocuments();
  let posts;

  if (sort === "hot") {
    posts = await Post.aggregate([
      { $addFields: { _score: { $add: [{ $multiply: ["$likes", 2] }, { $size: "$comments" }] } } },
      { $sort: { _score: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);
  } else {
    posts = await Post.find().sort(sortQuery).skip((page - 1) * limit).limit(limit);
  }

  res.json({ ok: true, posts, hasMore: page * limit < total, total });
}));

app.get("/api/posts/trending", asyncHandler(async (_req, res) => {
  const posts = await Post.aggregate([
    { $addFields: { _score: { $add: [{ $multiply: ["$likes", 3] }, { $multiply: [{ $size: "$comments" }, 2] }, { $size: "$savedBy" }] } } },
    { $sort: { _score: -1 } },
    { $limit: 20 }
  ]);
  res.json({ ok: true, posts });
}));

app.get("/api/posts/recommended", asyncHandler(async (req, res) => {
  const userEmail = req.query.userEmail;
  const user = userEmail ? await User.findOne({ email: normalizeEmail(userEmail) }) : null;
  const following = user?.following || [];
  const circles = user?.followingSubreddits || [];

  const posts = await Post.aggregate([
    {
      $addFields: {
        _score: {
          $add: [
            { $cond: [{ $in: ["$authorEmail", following] }, 10, 0] },
            { $cond: [{ $in: ["$subreddit", circles] }, 5, 0] },
            { $multiply: ["$likes", 0.5] },
            { $multiply: [{ $size: "$comments" }, 0.3] }
          ]
        }
      }
    },
    { $sort: { _score: -1 } },
    { $limit: 20 }
  ]);
  res.json({ ok: true, posts });
}));

app.get("/api/posts/following", asyncHandler(async (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });

  const user = await User.findOne({ email: normalizeEmail(userEmail) });
  const following = user?.following || [];
  const posts = await Post.find({ authorEmail: { $in: following } }).sort({ createdAt: -1 });
  res.json({ ok: true, posts });
}));

app.post("/api/posts", asyncHandler(async (req, res) => {
  const { caption, imageUrl, subreddit, authorName, authorEmail, poll } = req.body ?? {};
  if (!caption || !subreddit || !authorName || !authorEmail) {
    return res.status(400).json({ ok: false, message: "Caption, subreddit and author are required." });
  }
  // Either imageUrl (media post) or poll (poll post) is required
  if (!imageUrl && !poll) {
    return res.status(400).json({ ok: false, message: "Either an image or a poll is required." });
  }
  const newPost = await Post.create({
    id: Date.now(),
    caption,
    imageUrl: imageUrl || "",
    subreddit,
    authorName,
    authorEmail,
    poll: poll || null
  });
  return res.status(201).json({ ok: true, post: newPost });
}));

app.patch("/api/posts/:id", asyncHandler(async (req, res) => {
  const postId = Number(req.params.id);
  const { caption, subreddit, imageUrl, userEmail } = req.body ?? {};

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });
  if (post.authorEmail !== userEmail) return res.status(403).json({ ok: false, message: "Only the post owner can edit this post." });

  post.caption = String(caption || post.caption).trim();
  post.subreddit = String(subreddit || post.subreddit).trim();
  post.imageUrl = imageUrl || post.imageUrl;
  post.updatedAt = new Date();
  await post.save();
  return res.json({ ok: true, post });
}));

app.post("/api/posts/:id/react", asyncHandler(async (req, res) => {
  const postId = Number(req.params.id);
  const { reaction, userEmail } = req.body ?? {};
  if (!["like", "dislike"].includes(reaction) || !userEmail) return res.status(400).json({ ok: false, message: "Reaction must be like or dislike." });

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  if (reaction === "like") {
    if (post.likedBy.includes(userEmail)) {
      post.likedBy = post.likedBy.filter(e => e !== userEmail);
    } else {
      post.likedBy.push(userEmail);
      post.dislikedBy = post.dislikedBy.filter(e => e !== userEmail);
    }
  } else {
    if (post.dislikedBy.includes(userEmail)) {
      post.dislikedBy = post.dislikedBy.filter(e => e !== userEmail);
    } else {
      post.dislikedBy.push(userEmail);
      post.likedBy = post.likedBy.filter(e => e !== userEmail);
    }
  }

  post.likes = post.likedBy.length;
  post.dislikes = post.dislikedBy.length;
  await post.save();

  if (reaction === "like" && post.likedBy.includes(userEmail) && post.authorEmail && post.authorEmail !== userEmail) {
    pushNotification(post.authorEmail, { id: Date.now(), type: "like", title: "New like", message: "Someone liked your post", postId: post.id, actorEmail: userEmail, createdAt: new Date().toISOString() });
  }

  return res.json({ ok: true, post });
}));

app.post("/api/posts/:id/comments", asyncHandler(async (req, res) => {
  const postId = Number(req.params.id);
  const { text, authorName, authorEmail } = req.body ?? {};
  if (!text || !authorName || !authorEmail) return res.status(400).json({ ok: false, message: "Comment text and author are required." });

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  const comment = { id: Date.now(), authorName, authorEmail, text: String(text).trim(), replies: [] };
  post.comments.unshift(comment);
  await post.save();

  if (post.authorEmail && post.authorEmail !== authorEmail) {
    pushNotification(post.authorEmail, { id: Date.now(), type: "comment", title: "New comment", message: `${authorName} commented on your post`, postId, actorEmail: authorEmail, actorName: authorName, createdAt: new Date().toISOString() });
  }

  return res.status(201).json({ ok: true, post });
}));

app.patch("/api/posts/:postId/comments/:commentId", asyncHandler(async (req, res) => {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  const { text, userEmail } = req.body ?? {};

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ ok: false, message: "Comment not found." });
  if (normalizeEmail(comment.authorEmail) !== normalizeEmail(userEmail)) return res.status(403).json({ ok: false, message: "Only the comment owner can edit this comment." });

  comment.text = String(text || "").trim();
  comment.updatedAt = new Date();
  await post.save();
  return res.json({ ok: true, post });
}));

app.post("/api/posts/:postId/comments/:commentId/replies", asyncHandler(async (req, res) => {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  const { text, authorName, authorEmail } = req.body ?? {};
  if (!text || !authorName || !authorEmail) return res.status(400).json({ ok: false, message: "Reply text and author are required." });

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ ok: false, message: "Comment not found." });

  comment.replies = comment.replies || [];
  comment.replies.unshift({ id: Date.now(), authorName, authorEmail, text: String(text).trim() });
  await post.save();
  return res.status(201).json({ ok: true, post });
}));

async function deleteCommentHandler(req, res) {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  const userEmail = normalizeEmail(req.query.userEmail || req.body?.userEmail);
  if (!userEmail) return res.status(403).json({ ok: false, message: "You must be logged in to delete this comment." });

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  const idx = post.comments.findIndex(c => c.id === commentId);
  if (idx === -1) return res.status(404).json({ ok: false, message: "Comment not found." });

  post.comments.splice(idx, 1);
  await post.save();
  return res.json({ ok: true, post });
}

app.delete("/api/posts/:postId/comments/:commentId", asyncHandler(deleteCommentHandler));
app.post("/api/posts/:postId/comments/:commentId/delete", asyncHandler(deleteCommentHandler));

app.post("/api/posts/:id/save", asyncHandler(async (req, res) => {
  const postId = Number(req.params.id);
  const { userEmail } = req.body ?? {};
  if (!userEmail) return res.status(400).json({ ok: false, message: "User email is required." });

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });

  if (post.savedBy.includes(userEmail)) {
    post.savedBy = post.savedBy.filter(e => e !== userEmail);
  } else {
    post.savedBy.push(userEmail);
  }
  await post.save();
  return res.json({ ok: true, post });
}));

app.delete("/api/posts/:id", asyncHandler(async (req, res) => {
  const postId = Number(req.params.id);
  const userEmail = String(req.query.userEmail || "");

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });
  if (post.authorEmail !== userEmail) return res.status(403).json({ ok: false, message: "Only the post owner can delete this post." });

  await Post.deleteOne({ id: postId });
  return res.json({ ok: true, post });
}));

// ============================================
// Upload
// ============================================
app.post("/api/upload", asyncHandler(upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: "No file provided" });
  try {
    const b64 = req.file.buffer.toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI, { resource_type: "auto" });
    const mediaType = req.file.mimetype.startsWith("video") ? "video" : req.file.mimetype.startsWith("audio") ? "audio" : "image";
    res.json({ ok: true, mediaUrl: result.secure_url, mediaType });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}));

// ============================================
// Notifications
// ============================================
app.get("/api/notifications", asyncHandler(async (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });
  const notifications = await Notification.find({ toEmail: userEmail }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = notifications.filter(n => !n.read).length;
  res.json({ ok: true, notifications, unreadCount });
}));

app.post("/api/notifications/read", asyncHandler(async (req, res) => {
  const { userEmail } = req.body ?? {};
  if (!userEmail) return res.status(400).json({ ok: false });
  await Notification.updateMany({ toEmail: userEmail, read: false }, { read: true });
  res.json({ ok: true });
}));

// ============================================
// Presence
// ============================================
const onlineUsers = new Map();

app.get("/api/presence", (_req, res) => {
  res.json({ ok: true, onlineUsers: [...onlineUsers.keys()].map(email => ({ email })) });
});

// ============================================
// Push helpers
// ============================================
function pushNotification(toEmail, notification) {
  try {
    io.to(toEmail).emit("notification", notification);
  } catch (err) {
    console.error("Socket emit error:", err);
  }
  Notification.create({ ...notification, toEmail }).catch(err => console.error("Notification save error:", err));
}

function pushMessage(message) {
  try {
    io.to(message.toEmail).emit("newMessage", message);
    io.to(message.fromEmail).emit("newMessage", message);
  } catch (err) {
    console.error("Socket emit error:", err);
  }
}

// ============================================
// Messages
// ============================================
app.get("/api/messages", asyncHandler(async (req, res) => {
  const userEmail = normalizeEmail(String(req.query.userEmail || ""));
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });

  const messages = await Message.find({ $or: [{ fromEmail: userEmail }, { toEmail: userEmail }] }).sort({ createdAt: 1 });

  const convMap = new Map();
  messages.forEach(msg => {
    const other = msg.fromEmail === userEmail ? msg.toEmail : msg.fromEmail;
    const list = convMap.get(other) || [];
    list.push(msg);
    convMap.set(other, list);
  });

  const conversations = [];
  for (const [otherEmail, msgs] of convMap.entries()) {
    const lastMessage = msgs[msgs.length - 1];
    const otherName = lastMessage.fromEmail === userEmail ? lastMessage.toName : lastMessage.fromName;
    conversations.push({
      otherEmail,
      otherName,
      messages: msgs,
      lastAt: lastMessage.createdAt,
      unread: msgs.filter(m => m.toEmail === userEmail && !m.read).length,
      lastMessage: lastMessage.text || (lastMessage.mediaType ? `${lastMessage.mediaType} attachment` : "")
    });
  }

  res.json({ ok: true, conversations });
}));

app.get("/api/messages/:otherEmail", asyncHandler(async (req, res) => {
  const otherEmail = normalizeEmail(String(req.params.otherEmail || ""));
  const userEmail = normalizeEmail(String(req.query.userEmail || ""));
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });
  if (!otherEmail) return res.status(400).json({ ok: false, message: "otherEmail required" });

  const messages = await Message.find({
    $or: [
      { fromEmail: userEmail, toEmail: otherEmail },
      { fromEmail: otherEmail, toEmail: userEmail }
    ]
  }).sort({ createdAt: 1 });

  res.json({ ok: true, messages });
}));

app.post("/api/messages", asyncHandler(async (req, res) => {
  const { fromEmail, fromName, toEmail, toName, text, mediaUrl, mediaType, replyTo } = req.body ?? {};
  if (!fromEmail || !toEmail) return res.status(400).json({ ok: false, message: "fromEmail and toEmail are required" });

  const message = await Message.create({
    id: Date.now(),
    fromEmail: normalizeEmail(fromEmail),
    fromName: fromName || "",
    toEmail: normalizeEmail(toEmail),
    toName: toName || "",
    text: String(text || ""),
    mediaUrl: mediaUrl || "",
    mediaType: mediaType || "",
    replyTo: replyTo || null
  });

  pushMessage(message);
  return res.status(201).json({ ok: true, message });
}));

app.post("/api/messages/read", asyncHandler(async (req, res) => {
  const { userEmail, fromEmail } = req.body ?? {};
  if (!userEmail || !fromEmail) return res.status(400).json({ ok: false });
  await Message.updateMany({ fromEmail, toEmail: userEmail, read: false }, { read: true });
  res.json({ ok: true });
}));

// ============================================
// Socket.IO
// ============================================
io.on("connection", (socket) => {
  socket.on("identify", (email) => {
    if (!email) return;
    const normalized = normalizeEmail(email);
    socket.join(normalized);
    onlineUsers.set(normalized, socket.id);
    io.emit("presence", { online: [...onlineUsers.keys()] });
  });

  socket.on("disconnect", () => {
    for (const [email, id] of onlineUsers.entries()) {
      if (id === socket.id) { onlineUsers.delete(email); break; }
    }
    io.emit("presence", { online: [...onlineUsers.keys()] });
  });

  socket.on("sendMessage", async (payload) => {
    try {
      const { fromEmail, toEmail, text, mediaUrl, mediaType } = payload || {};
      if (!fromEmail || !toEmail) return;
      const message = await Message.create({
        id: Date.now(),
        fromEmail: normalizeEmail(fromEmail),
        fromName: payload.fromName || "",
        toEmail: normalizeEmail(toEmail),
        toName: payload.toName || "",
        text: String(text || ""),
        mediaUrl: mediaUrl || "",
        mediaType: mediaType || ""
      });
      pushMessage(message);
    } catch (err) {
      console.error("sendMessage error:", err);
    }
  });
});

// ============================================
// Static file serving
// ============================================
if (process.env.SERVE_STATIC === "true") {
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

// ============================================
// Error handler
// ============================================
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, message: err?.message || "Internal server error" });
});

// ============================================
// Admin: Hash all passwords (temporary, remove after use)
// ============================================
app.post("/api/admin/migrate-passwords", asyncHandler(async (req, res) => {
  const { adminToken } = req.body ?? {};
  if (adminToken !== "migrate-now-112008") {
    return res.status(403).json({ ok: false, message: "Unauthorized" });
  }

  const users = await User.find({});
  let updated = 0;

  for (let user of users) {
    // Only hash if it doesn't look like a bcrypt hash
    if (user.password && !user.password.startsWith("$2")) {
      user.password = await bcrypt.hash(user.password, 10);
      await user.save();
      updated++;
    }
  }

  return res.json({ ok: true, message: `Migrated ${updated} password(s)` });
}));

// ============================================
// Start
// ============================================
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});