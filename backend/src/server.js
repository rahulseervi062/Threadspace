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
// MongoDB Connection
// ============================================
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI is not defined in environment variables");
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected Successfully");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};
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

// ============================================
// Express + Socket.IO Setup
// ============================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
});

const otpStore = new Map();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173"
  }
});
const port = Number(process.env.PORT || 4000);
const demoEmail = process.env.DEMO_EMAIL || "demo@site.com";
const demoPassword = process.env.DEMO_PASSWORD || "Password@123";
const demoPhone = process.env.DEMO_PHONE || "9999999999";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../../frontend/dist");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================
// Seed Demo Data
// ============================================
const seedDemoData = async () => {
  const existingUser = await User.findOne({ email: demoEmail });
  if (!existingUser) {
    await User.create({
      uid: 1,
      name: "Demo User",
      email: demoEmail,
      phone: demoPhone,
      password: demoPassword
    });
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
// CORS + Middleware
// ============================================
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://threadspace-e2sj.onrender.com",
        /.*\.vercel\.app$/
      ];
      if (!origin || allowedOrigins.some(allowed =>
        typeof allowed === "string" ? allowed === origin : allowed.test(origin)
      )) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  })
);
app.use(express.json());

// ============================================
// Health
// ============================================
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "login-api" });
});

// ============================================
// Auth Routes
// ============================================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email and password are required." });
  }

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) {
    return res.status(401).json({ ok: false, message: "Invalid email or password.", showForgotPassword: true });
  }

  if (user.password === password) {
    return res.json({ ok: true, message: "Login successful.", user: { name: user.name, email: user.email, phone: user.phone || "" } });
  }

  // Wrong password → send OTP
  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
  otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  console.log(`OTP for ${email}: ${otp}`);
  transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Login Verification OTP",
    text: `Your OTP for login is: ${otp}. It expires in 5 minutes.`
  }, (err) => { if (err) console.error("Email error:", err); });

  return res.status(401).json({ ok: false, message: "Incorrect password. A verification OTP has been sent to your email.", requiresOtp: true, email });
});

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body ?? {};
  if (!email || !otp) return res.status(400).json({ ok: false, message: "Email and OTP are required." });

  const stored = otpStore.get(email);
  if (!stored) return res.status(401).json({ ok: false, message: "No OTP found for this email." });
  if (Date.now() > stored.expiresAt) { otpStore.delete(email); return res.status(401).json({ ok: false, message: "OTP has expired." }); }
  if (stored.otp !== otp) return res.status(401).json({ ok: false, message: "Invalid OTP." });

  const user = await User.findOne({ email: normalizeEmail(email) });
  otpStore.delete(email);
  return res.json({ ok: true, message: "Login successful via OTP.", user: { name: user.name, email: user.email, phone: user.phone || "" } });
});

app.post("/api/signup", async (req, res) => {
  const { name, email, password, phone } = req.body ?? {};
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!name || !email || !password || !normalizedPhone) {
    return res.status(400).json({ ok: false, message: "Name, email, mobile number and password are required." });
  }

  const existingUser = await User.findOne({ email: normalizeEmail(email) });
  if (existingUser) return res.status(409).json({ ok: false, message: "An account with this email already exists." });

  const existingPhone = await User.findOne({ phone: normalizedPhone });
  if (existingPhone) return res.status(409).json({ ok: false, message: "An account with this mobile number already exists." });

  const newUser = await User.create({ uid: Date.now(), name, email: normalizeEmail(email), phone: normalizedPhone, password });
  return res.status(201).json({ ok: true, message: "Account created successfully.", user: { name: newUser.name, email: newUser.email, phone: newUser.phone || "" } });
});

app.post("/api/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ ok: false, message: "Email is required." });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "No account found with this email." });

  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
  otpStore.set(`${email}-reset`, { otp, expiresAt: Date.now() + 5 * 60 * 1000, email: user.email });
  console.log(`Password reset OTP for ${user.email}: ${otp}`);

  return transporter.sendMail({ from: process.env.GMAIL_USER, to: user.email, subject: "Password Reset OTP", text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.` })
    .then(() => res.json({ ok: true, message: "A password reset OTP has been sent to your email.", requiresOtp: true, email: user.email }))
    .catch((err) => res.status(500).json({ ok: false, message: err.message || "Failed to send reset OTP." }));
});

app.post("/api/reset-password-otp", async (req, res) => {
  const { otp, newPassword } = req.body ?? {};
  const email = normalizeEmail(req.body?.email);
  if (!email || !otp || !newPassword) return res.status(400).json({ ok: false, message: "Email, OTP, and new password are required." });

  const resetKey = `${email}-reset`;
  const stored = otpStore.get(resetKey);
  if (!stored) return res.status(401).json({ ok: false, message: "No OTP found for this email." });
  if (Date.now() > stored.expiresAt) { otpStore.delete(resetKey); return res.status(401).json({ ok: false, message: "OTP has expired." }); }
  if (stored.otp !== otp) return res.status(401).json({ ok: false, message: "Invalid OTP." });

  const user = await User.findOneAndUpdate({ email }, { password: newPassword });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  otpStore.delete(resetKey);
  return res.json({ ok: true, message: "Password has been reset successfully." });
});

app.get("/api/users", async (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const filter = query
    ? { $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }] }
    : {};
  const users = await User.find(filter).select("uid name email phone");
  res.json({ ok: true, users: users.map(u => ({ id: u.uid, name: u.name, email: u.email, phone: u.phone || "" })) });
});

app.patch("/api/account", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name || "").trim();
  const phone = normalizePhoneNumber(req.body?.phone);
  if (!email || !name || !phone) return res.status(400).json({ ok: false, message: "Email, name, and mobile number are required." });

  const user = await User.findOneAndUpdate({ email }, { name, phone }, { new: true });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  return res.json({ ok: true, user: { name: user.name, email: user.email, phone: user.phone } });
});

app.post("/api/account/password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!email || !currentPassword || !newPassword) return res.status(400).json({ ok: false, message: "Email, current password, and new password are required." });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, message: "User not found." });
  if (user.password !== currentPassword) return res.status(401).json({ ok: false, message: "Current password is incorrect." });

  user.password = newPassword;
  await user.save();
  return res.json({ ok: true, message: "Password updated successfully." });
});

// ============================================
// Subreddits
// ============================================
app.get("/api/subreddits", async (_req, res) => {
  const subreddits = await Subreddit.find().sort({ _id: -1 });
  res.json({ ok: true, subreddits });
});

app.post("/api/subreddits", async (req, res) => {
  const { name, title, description } = req.body ?? {};
  if (!name || !title) return res.status(400).json({ ok: false, message: "Subreddit name and title are required." });

  const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, "");
  const exists = await Subreddit.findOne({ name: normalizedName });
  if (exists) return res.status(409).json({ ok: false, message: "This subreddit already exists." });

  const subreddit = await Subreddit.create({ id: Date.now(), name: normalizedName, title: String(title).trim(), description: String(description || "").trim() });
  return res.status(201).json({ ok: true, subreddit });
});

// ============================================
// Search
// ============================================
app.get("/api/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  const type = String(req.query.type || "all").toLowerCase();
  if (!query) return res.json({ ok: true, results: { posts: [], subreddits: [], users: [] } });

  const results = { posts: [], subreddits: [], users: [] };
  const re = { $regex: query, $options: "i" };

  if (type === "all" || type === "posts") {
    results.posts = await Post.find({ $or: [{ caption: re }, { subreddit: re }, { authorName: re }] });
  }
  if (type === "all" || type === "subreddits") {
    results.subreddits = await Subreddit.find({ $or: [{ name: re }, { title: re }, { description: re }] });
  }
  if (type === "all" || type === "users") {
    const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("uid name email phone");
    results.users = users.map(u => ({ id: u.uid, name: u.name, email: u.email, phone: u.phone || "" }));
  }

  res.json({ ok: true, results });
});

// ============================================
// Posts
// ============================================
app.get("/api/posts", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const sort = req.query.sort || "new";

  let sortQuery = { createdAt: -1 };
  if (sort === "top") sortQuery = { likes: -1 };

  const total = await Post.countDocuments();
  let posts;

  if (sort === "hot") {
    // hot = likes*2 + comments count — needs aggregation
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
});

app.get("/api/posts/trending", async (_req, res) => {
  const posts = await Post.aggregate([
    { $addFields: { _score: { $add: [{ $multiply: ["$likes", 3] }, { $multiply: [{ $size: "$comments" }, 2] }, { $size: "$savedBy" }] } } },
    { $sort: { _score: -1 } },
    { $limit: 20 }
  ]);
  res.json({ ok: true, posts });
});

app.get("/api/posts/recommended", async (req, res) => {
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
});

app.get("/api/posts/following", async (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });

  const user = await User.findOne({ email: normalizeEmail(userEmail) });
  const following = user?.following || [];
  const posts = await Post.find({ authorEmail: { $in: following } }).sort({ createdAt: -1 });
  res.json({ ok: true, posts });
});

app.post("/api/posts", async (req, res) => {
  const { caption, imageUrl, subreddit, authorName, authorEmail } = req.body ?? {};
  if (!caption || !imageUrl || !subreddit || !authorName || !authorEmail) {
    return res.status(400).json({ ok: false, message: "Caption, image, subreddit and author are required." });
  }

  const newPost = await Post.create({ id: Date.now(), caption, imageUrl, subreddit, authorName, authorEmail });
  return res.status(201).json({ ok: true, post: newPost });
});

app.patch("/api/posts/:id", async (req, res) => {
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
});

app.post("/api/posts/:id/react", async (req, res) => {
  const postId = Number(req.params.id);
  const { reaction, userEmail } = req.body ?? {};
  if (!["like", "dislike"].includes(reaction) || !userEmail) {
    return res.status(400).json({ ok: false, message: "Reaction must be like or dislike." });
  }

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
});

app.post("/api/posts/:id/comments", async (req, res) => {
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
});

app.patch("/api/posts/:postId/comments/:commentId", async (req, res) => {
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
});

app.post("/api/posts/:postId/comments/:commentId/replies", async (req, res) => {
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
});

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

app.delete("/api/posts/:postId/comments/:commentId", deleteCommentHandler);
app.post("/api/posts/:postId/comments/:commentId/delete", deleteCommentHandler);

app.post("/api/posts/:id/save", async (req, res) => {
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
});

app.delete("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const userEmail = String(req.query.userEmail || "");

  const post = await Post.findOne({ id: postId });
  if (!post) return res.status(404).json({ ok: false, message: "Post not found." });
  if (post.authorEmail !== userEmail) return res.status(403).json({ ok: false, message: "Only the post owner can delete this post." });

  await Post.deleteOne({ id: postId });
  return res.json({ ok: true, post });
});

// ============================================
// Upload
// ============================================
app.post("/api/upload", upload.single("file"), async (req, res) => {
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
});

// ============================================
// Notifications
// ============================================
app.get("/api/notifications", async (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });
  const notifications = await Notification.find({ toEmail: userEmail }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = notifications.filter(n => !n.read).length;
  res.json({ ok: true, notifications, unreadCount });
});

app.post("/api/notifications/read", async (req, res) => {
  const { userEmail } = req.body ?? {};
  if (!userEmail) return res.status(400).json({ ok: false });
  await Notification.updateMany({ toEmail: userEmail, read: false }, { read: true });
  res.json({ ok: true });
});

// ============================================
// Presence
// ============================================
const onlineUsers = new Map();

app.get("/api/presence", (_req, res) => {
  const onlineList = [...onlineUsers.keys()].map(email => ({ email }));
  res.json({ ok: true, onlineUsers: onlineList });
});

// ============================================
// Push helpers
// ============================================
function pushNotification(toEmail, notification) {
  io.to(toEmail).emit("notification", notification);
  // Persist to MongoDB
  Notification.create({ ...notification, toEmail }).catch(err => console.error("Notification save error:", err));
}
function pushMessage(message) {
  io.to(message.toEmail).emit("newMessage", message);
  io.to(message.fromEmail).emit("newMessage", message);
}

// ============================================
// Messages
// ============================================
app.get("/api/messages", async (req, res) => {
  const userEmail = req.query.userEmail;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required" });

  const messages = await Message.find({ $or: [{ fromEmail: userEmail }, { toEmail: userEmail }] }).sort({ createdAt: 1 });

  const convMap = new Map();
  messages.forEach(msg => {
    const other = msg.fromEmail === userEmail ? msg.toEmail : msg.fromEmail;
    const otherName = msg.fromEmail === userEmail ? msg.toName : msg.fromName;
    if (!convMap.has(other)) {
      convMap.set(other, { otherEmail: other, otherName, messages: [], lastAt: msg.createdAt, unread: 0 });
    }
    const conv = convMap.get(other);
    conv.messages.push(msg);
    if (new Date(msg.createdAt) > new Date(conv.lastAt)) conv.lastAt = msg.createdAt;
    if (msg.toEmail === userEmail && !msg.read) conv.unread++;
  });

  const conversations = [...convMap.values()]
    .map(c => ({ ...c, lastMessage: c.messages.at(-1)?.text || "Sent an attachment", messages: undefined }))
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

  res.json({ ok: true, conversations });
});

app.get("/api/messages/:otherEmail", async (req, res) => {
  const myEmail = req.query.userEmail;
  const otherEmail = decodeURIComponent(req.params.otherEmail);
  if (!myEmail) return res.status(400).json({ ok: false, message: "userEmail required" });

  const messages = await Message.find({
    $or: [
      { fromEmail: myEmail, toEmail: otherEmail },
      { fromEmail: otherEmail, toEmail: myEmail }
    ]
  }).sort({ createdAt: 1 });

  // Mark as read
  await Message.updateMany({ toEmail: myEmail, fromEmail: otherEmail, read: false }, { read: true });

  res.json({ ok: true, messages });
});

app.post("/api/messages", async (req, res) => {
  const { fromEmail, fromName, toEmail, toName, text, mediaUrl, mediaType, replyTo } = req.body ?? {};
  if (!fromEmail || !toEmail) return res.status(400).json({ ok: false, message: "fromEmail and toEmail required" });

  const message = await Message.create({ id: Date.now(), fromEmail, fromName, toEmail, toName, text: text || "", mediaUrl: mediaUrl || "", mediaType: mediaType || "", replyTo: replyTo || null });

  pushMessage(message.toObject());

  if (toEmail && toEmail !== fromEmail) {
    pushNotification(toEmail, { id: Date.now() + 1, type: "message", title: "New message", message: `${fromName || fromEmail}: ${text || "Sent an attachment"}`, actorEmail: fromEmail, actorName: fromName, createdAt: new Date().toISOString() });
  }

  res.json({ ok: true, message });
});

app.delete("/api/messages/:id", async (req, res) => {
  const msgId = Number(req.params.id);
  const userEmail = req.query.userEmail;

  const msg = await Message.findOne({ id: msgId });
  if (!msg) return res.status(404).json({ ok: false, message: "Message not found" });
  if (msg.fromEmail !== userEmail) return res.status(403).json({ ok: false, message: "Unauthorized" });

  await Message.deleteOne({ id: msgId });
  io.to(msg.toEmail).emit("messageDeleted", { messageId: msgId, fromEmail: msg.fromEmail, toEmail: msg.toEmail });
  io.to(msg.fromEmail).emit("messageDeleted", { messageId: msgId, fromEmail: msg.fromEmail, toEmail: msg.toEmail });
  res.json({ ok: true });
});

app.patch("/api/messages/:id", async (req, res) => {
  const msgId = Number(req.params.id);
  const { userEmail, text } = req.body ?? {};

  const msg = await Message.findOne({ id: msgId });
  if (!msg) return res.status(404).json({ ok: false, message: "Message not found" });
  if (msg.fromEmail !== userEmail) return res.status(403).json({ ok: false, message: "Unauthorized" });

  msg.text = text;
  msg.isEdited = true;
  await msg.save();
  io.to(msg.toEmail).emit("messageEdited", msg.toObject());
  io.to(msg.fromEmail).emit("messageEdited", msg.toObject());
  res.json({ ok: true, message: msg });
});

app.post("/api/messages/:id/react", async (req, res) => {
  const msgId = Number(req.params.id);
  const { userEmail, reaction } = req.body ?? {};

  const msg = await Message.findOne({ id: msgId });
  if (!msg) return res.status(404).json({ ok: false, message: "Not found" });

  const reactions = msg.reactions || new Map();
  if (reactions.get(userEmail) === reaction) {
    reactions.delete(userEmail);
  } else {
    reactions.set(userEmail, reaction);
  }
  msg.reactions = reactions;
  await msg.save();
  io.to(msg.toEmail).emit("messageReacted", msg.toObject());
  io.to(msg.fromEmail).emit("messageReacted", msg.toObject());
  res.json({ ok: true, message: msg });
});

// ============================================
// Static + Catch-all
// ============================================
import fs from "fs";
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(publicDir, "index.html"));
  });
}

// ============================================
// Socket.IO
// ============================================
io.on("connection", (socket) => {
  socket.on("join", (email) => {
    if (email) {
      onlineUsers.set(email, socket.id);
      socket.join(email);
      io.emit("presenceUpdate", { email, online: true });
    }
  });

  socket.on("typing", ({ fromEmail, toEmail }) => {
    io.to(toEmail).emit("typing", { fromEmail });
  });

  socket.on("stopTyping", ({ fromEmail, toEmail }) => {
    io.to(toEmail).emit("stopTyping", { fromEmail });
  });

  socket.on("disconnect", () => {
    for (const [email, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(email);
        io.emit("presenceUpdate", { email, online: false });
        break;
      }
    }
  });
});

// ============================================
// Start
// ============================================
server.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});