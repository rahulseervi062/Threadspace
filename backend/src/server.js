import process from "process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import { fileURLToPath } from "url";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { createServer } from "http";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
 
 dotenv.config();
 
 let transporter = null;
 try {
   if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
     transporter = nodemailer.createTransport({
       service: 'gmail',
       auth: {
         user: process.env.GMAIL_USER,
         pass: process.env.GMAIL_PASS
       }
     });
   } else {
     console.warn("⚠️  GMAIL_USER or GMAIL_PASS not set — email sending disabled.");
   }
 } catch (err) {
   console.error("Failed to create mail transporter:", err.message);
 }
 
 const otpStore = new Map();
 
 const app = express();
 const server = createServer(app);
 // Track connected users
 const onlineUsers = new Map(); // email -> socketId

const io = new Server(server, {
   cors: {
     origin: function(origin, callback) {
    const allowed = [
      'https://threadspace-frontend.vercel.app',
      'http://localhost:5173'
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
   }
 });
 // Socket.io connection handler
 io.on("connection", (socket) => {
   socket.on("join", (email) => {
     if (email) {
       onlineUsers.set(email, socket.id);
       socket.join(email);
     }
   });

   socket.on("sendMessage", (message) => {
     if (message?.toEmail) {
       io.to(message.toEmail).emit("newMessage", message);
     }
   });

   socket.on("disconnect", () => {
     for (const [email, id] of onlineUsers.entries()) {
       if (id === socket.id) {
         onlineUsers.delete(email);
         break;
       }
     }
   });
 });

 const port = Number(process.env.PORT || 4001);
 const demoEmail = process.env.DEMO_EMAIL || "demo@site.com";
 const demoPassword = process.env.DEMO_PASSWORD || "Password@123";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoPhone = process.env.DEMO_PHONE || "9999999999";
const MAX_MESSAGE_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_MESSAGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/threadspace")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  id: Number,
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  avatar: String,
  createdAt: String,
  following: [Number],
  followers: [Number],
  followingSubreddits: [String],
  karma: { type: Number, default: 0 }
});

const postSchema = new mongoose.Schema({
  id: Number,
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
  comments: { type: Array, default: [] },
  createdAt: String,
  updatedAt: String
});

const subredditSchema = new mongoose.Schema({
  id: Number,
  name: { type: String, unique: true },
  title: String,
  description: String,
  rules: String,
  moderators: [String]
});

const messageSchema = new mongoose.Schema({
  id: Number,
  fromEmail: String,
  fromName: String,
  toEmail: String,
  toName: String,
  text: String,
  mediaUrl: String,
  mediaType: String,
  createdAt: String,
  read: { type: Boolean, default: false }
});

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);
const Subreddit = mongoose.model("Subreddit", subredditSchema);
const Message = mongoose.model("Message", messageSchema);

// Helper functions (async, MongoDB-based)
async function readUsers() {
  return await User.find({}).lean();
}

async function writeUsers(users) {
  // Not needed with MongoDB - updates done directly
}

async function readPosts() {
  const posts = await Post.find({}).sort({ createdAt: -1 }).lean();
  return posts.map((post) => ({
    likes: 0,
    dislikes: 0,
    comments: [],
    likedBy: [],
    dislikedBy: [],
    savedBy: [],
    ...post
  }));
}

async function writePosts(posts) {
  // Not needed with MongoDB
}

async function readSubreddits() {
  return await Subreddit.find({}).lean();
}

async function writeSubreddits(subreddits) {
  // Not needed with MongoDB
}

async function readMessages() {
  return await Message.find({}).sort({ createdAt: 1 }).lean();
}

async function writeMessages(messages) {
  // Not needed with MongoDB
}

// Seed default data if empty
async function seedData() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create({
      id: 1,
      name: "Demo User",
      email: demoEmail,
      phone: demoPhone,
      password: demoPassword,
      createdAt: new Date().toISOString(),
      following: [],
      followers: [],
      karma: 0
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
}

mongoose.connection.once("open", seedData);
 
 // Configure Cloudinary
 try {
   if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
     cloudinary.config({
       cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
       api_key: process.env.CLOUDINARY_API_KEY,
       api_secret: process.env.CLOUDINARY_API_SECRET
     });
   } else {
     console.warn("⚠️  Cloudinary env vars not set — image uploads will be disabled.");
   }
 } catch (err) {
   console.error("Failed to configure Cloudinary:", err.message);
 }
 
 // Configure multer for file uploads
 const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
 

 // Data is now stored in MongoDB - seeded via seedData()

 
 function normalizePhoneNumber(value) {
   return String(value || "").replace(/\D/g, "");
 }
 
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getMessageMediaType(file) {
  if (!file?.mimetype) return null;
  if (file.mimetype === "image/gif") return "gif";
  if (file.mimetype.startsWith("image/")) return "image";
  if (file.mimetype.startsWith("video/")) return "video";
  return null;
}

function buildDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype.startsWith("video/") ? "video" : "image";
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "threadspace/messages",
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}
 
 function findPostIndex(posts, postId) {
   return posts.findIndex((item) => item.id === postId);
 }
 
 function findCommentIndex(post, commentId) {
   return (post.comments || []).findIndex((item) => item.id === commentId);
 }
 
 app.get("/", async (req, res) => {
   res.send("Server is running 🚀");
 });

 app.use(
   cors({
     origin: function(origin, callback) {
    const allowed = [
      'https://threadspace-frontend.vercel.app',
      'http://localhost:5173'
    ];
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
   })
 );
 app.use(express.json({ limit: "50mb" }));
 app.use(express.urlencoded({ limit: "50mb", extended: true }));
 
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "login-api" });
});

app.post("/api/uploads/message-media", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ ok: false, message: "A media file is required." });
  }

  if (!ALLOWED_MESSAGE_MEDIA_TYPES.has(file.mimetype)) {
    return res.status(400).json({
      ok: false,
      message: "Only JPG, PNG, WEBP, GIF, MP4, WEBM, and MOV files are allowed."
    });
  }

  if (file.size > MAX_MESSAGE_MEDIA_BYTES) {
    return res.status(400).json({
      ok: false,
      message: "Media is too large. The limit is 10MB."
    });
  }

  const mediaType = getMessageMediaType(file);
  if (!mediaType) {
    return res.status(400).json({ ok: false, message: "Unsupported media type." });
  }

  try {
    const hasCloudinaryConfig =
      Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
      Boolean(process.env.CLOUDINARY_API_KEY) &&
      Boolean(process.env.CLOUDINARY_API_SECRET);

    const mediaUrl = hasCloudinaryConfig
      ? (await uploadToCloudinary(file)).secure_url
      : buildDataUri(file);

    return res.status(201).json({
      ok: true,
      mediaUrl,
      mediaType
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || "Failed to upload media."
    });
  }
});
 
 app.post("/api/login", async (req, res) => {
   const { email, password } = req.body ?? {};
 
   if (!email || !password) {
     return res.status(400).json({
       ok: false,
       message: "Email and password are required."
     });
   }
 
   const users = await User.find({}).lean();
   const user = users.find((item) => item.email === email);
 
   if (!user) {
     return res.status(401).json({
       ok: false,
       message: "Invalid email or password.",
       showForgotPassword: true
     });
   }
 
   // Support both plain text (old) and hashed (new) passwords
  const passwordMatch = user.password.startsWith("$2b$") || user.password.startsWith("$2a$")
    ? await bcrypt.compare(password, user.password)
    : user.password === password;

  if (passwordMatch) {
    // If password was plain text, upgrade to hashed
    if (!user.password.startsWith("$2b$") && !user.password.startsWith("$2a$")) {
      const users2 = readUsers();
      const idx = users2.findIndex(u => u.email === email);
      if (idx !== -1) {
        users2[idx].password = await bcrypt.hash(password, 10);
        writeUsers(users2);
      }
    }
     return res.json({
       ok: true,
       message: "Login successful.",
       user: {
         name: user.name,
         email: user.email,
         phone: user.phone || ""
       }
     });
   }
 
   // Password wrong, send OTP
   const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
   const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
   otpStore.set(email, { otp, expiresAt });
 
   // Send email
   const mailOptions = {
     from: process.env.GMAIL_USER,
     to: email,
     subject: 'Login Verification OTP',
     text: `Your OTP for login is: ${otp}. It expires in 5 minutes.`
   };
 
   console.log(`OTP for ${email}: ${otp}`); // For testing - remove in production
 
   if (transporter) {
     transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
         console.error('Error sending email:', error);
       } else {
         console.log('Email sent:', info.response);
       }
     });
   } else {
     console.warn("Email not sent — transporter not configured.");
   }
 
   return res.status(401).json({
     ok: false,
     message: "Incorrect password. A verification OTP has been sent to your email.",
     requiresOtp: true,
     email: email
   });
 });
 
 app.post("/api/verify-otp", async (req, res) => {
   const { email, otp } = req.body ?? {};
 
   if (!email || !otp) {
     return res.status(400).json({
       ok: false,
       message: "Email and OTP are required."
     });
   }
 
   const stored = otpStore.get(email);
   if (!stored) {
     return res.status(401).json({
       ok: false,
       message: "No OTP found for this email."
     });
   }
 
   if (Date.now() > stored.expiresAt) {
     otpStore.delete(email);
     return res.status(401).json({
       ok: false,
       message: "OTP has expired."
     });
   }
 
   if (stored.otp !== otp) {
     return res.status(401).json({
       ok: false,
       message: "Invalid OTP."
     });
   }
 
   // OTP valid, login the user
   const users = await User.find({}).lean();
   const user = users.find((item) => item.email === email);
   otpStore.delete(email);
 
   return res.json({
     ok: true,
     message: "Login successful via OTP.",
     user: {
       name: user.name,
       email: user.email,
       phone: user.phone || ""
     }
   });
 });
 
 app.post("/api/signup", async (req, res) => {
   const { name, email, password, phone } = req.body ?? {};
   const normalizedPhone = normalizePhoneNumber(phone);
 
   if (!name || !email || !password) {
     return res.status(400).json({
       ok: false,
       message: "Name, email and password are required."
     });
   }
 
   const users = await User.find({}).lean();
   const existingUser = users.find((item) => item.email === email);
   const existingPhone = users.find(
     (item) => normalizePhoneNumber(item.phone) === normalizedPhone
   );
 
   if (existingUser) {
     return res.status(409).json({
       ok: false,
       message: "An account with this email already exists."
     });
   }
 
   if (normalizedPhone && existingPhone) {
     return res.status(409).json({
       ok: false,
       message: "An account with this mobile number already exists."
     });
   }
 
   const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
     id: Date.now(),
     name,
     email,
     phone: normalizedPhone,
     password: hashedPassword,
     createdAt: new Date().toISOString(),
     following: [],
     followers: [],
     karma: 0
   };

   await User.create(newUser);
 
   return res.status(201).json({
     ok: true,
     message: "Account created successfully.",
     user: {
       name: newUser.name,
       email: newUser.email,
       phone: newUser.phone || ""
     }
   });
 });
 
 app.post("/api/forgot-password", async (req, res) => {
   const email = normalizeEmail(req.body?.email);
 
   if (!email) {
     return res.status(400).json({
       ok: false,
       message: "Email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const user = users.find((item) => normalizeEmail(item.email) === email);
 
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "No account found with this email."
     });
   }
 
   const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
   const expiresAt = Date.now() + 5 * 60 * 1000;
   otpStore.set(`${email}-reset`, {
     otp,
     expiresAt,
     email: user.email
   });
 
   const mailOptions = {
     from: process.env.GMAIL_USER,
     to: user.email,
     subject: "Password Reset OTP",
     text: `Your OTP for password reset is: ${otp}. It expires in 5 minutes.`
   };
 
   console.log(`Password reset OTP for ${user.email}: ${otp}`);
 
   if (!transporter) {
     return res.json({
       ok: true,
       message: "A password reset OTP has been sent to your email.",
       requiresOtp: true,
       email: user.email
     });
   }
 
   return transporter.sendMail(mailOptions)
     .then(() =>
       res.json({
         ok: true,
         message: "A password reset OTP has been sent to your email.",
         requiresOtp: true,
         email: user.email
       })
     )
     .catch((error) =>
       res.status(500).json({
         ok: false,
         message: error.message || "Failed to send reset OTP."
       })
     );
 });
 
 app.post("/api/reset-password-otp", async (req, res) => {
   const { otp, newPassword } = req.body ?? {};
   const email = normalizeEmail(req.body?.email);
 
   if (!email || !otp || !newPassword) {
     return res.status(400).json({
       ok: false,
       message: "Email, OTP, and new password are required."
     });
   }
 
   const resetKey = `${email}-reset`;
   const stored = otpStore.get(resetKey);
   if (!stored) {
     return res.status(401).json({
       ok: false,
       message: "No OTP found for this email."
     });
   }
 
   if (Date.now() > stored.expiresAt) {
     otpStore.delete(resetKey);
     return res.status(401).json({
       ok: false,
       message: "OTP has expired."
     });
   }
 
   if (stored.otp !== otp) {
     return res.status(401).json({
       ok: false,
       message: "Invalid OTP."
     });
   }
 
   const users = await User.find({}).lean();
   const user = users.find((item) => normalizeEmail(item.email) === email);
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   user.password = await bcrypt.hash(newPassword, 10);
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
   otpStore.delete(resetKey);
 
   return res.json({
     ok: true,
     message: "Password has been reset successfully."
   });
 });
 
 app.get("/api/users", async (req, res) => {
   const query = String(req.query.q || "").trim().toLowerCase();
   const users = (await User.find({}).lean()).map((user) => ({
     id: user.id,
     name: user.name,
     email: user.email,
     phone: user.phone || ""
   }));
 
   const filtered = query
     ? users.filter(
         (user) =>
           user.name.toLowerCase().includes(query) ||
           user.email.toLowerCase().includes(query)
       )
     : users;
 
   res.json({
     ok: true,
     users: filtered
   });
 });
 
 app.patch("/api/account", async (req, res) => {
   const email = normalizeEmail(req.body?.email);
   const name = String(req.body?.name || "").trim();
   const phone = normalizePhoneNumber(req.body?.phone);
 
   if (!email || !name || !phone) {
     return res.status(400).json({
       ok: false,
       message: "Email, name, and mobile number are required."
     });
   }
 
   const users = await User.find({}).lean();
   const userIndex = users.findIndex((item) => normalizeEmail(item.email) === email);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   await User.findOneAndUpdate({ email }, { name, phone });
  users[userIndex] = { ...users[userIndex], name, phone };
 
   return res.json({
     ok: true,
     user: {
       name: users[userIndex].name,
       email: users[userIndex].email,
       phone: users[userIndex].phone
     }
   });
 });
 
 app.post("/api/account/password", async (req, res) => {
   const email = normalizeEmail(req.body?.email);
   const currentPassword = String(req.body?.currentPassword || "");
   const newPassword = String(req.body?.newPassword || "");
 
   if (!email || !currentPassword || !newPassword) {
     return res.status(400).json({
       ok: false,
       message: "Email, current password, and new password are required."
     });
   }
 
   const users = await User.find({}).lean();
   const userIndex = users.findIndex((item) => normalizeEmail(item.email) === email);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const currentMatch = users[userIndex].password.startsWith("$2b$") || users[userIndex].password.startsWith("$2a$")
    ? await bcrypt.compare(currentPassword, users[userIndex].password)
    : users[userIndex].password === currentPassword;
  if (!currentMatch) {
     return res.status(401).json({
       ok: false,
       message: "Current password is incorrect."
     });
   }
 
   const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  users[userIndex] = {
     ...users[userIndex],
     password: hashedNewPassword
   };
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
 
   return res.json({
     ok: true,
     message: "Password updated successfully."
   });
 });
 
 // Following endpoints
 app.post("/api/users/:id/follow", async (req, res) => {
   const targetUserId = Number(req.params.id);
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const currentUserIndex = users.findIndex((user) => user.email === userEmail);
   const targetUserIndex = users.findIndex((user) => user.id === targetUserId);
 
   if (currentUserIndex === -1 || targetUserIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   if (currentUserIndex === targetUserIndex) {
     return res.status(400).json({
       ok: false,
       message: "Cannot follow yourself."
     });
   }
 
   const currentUser = users[currentUserIndex];
   const targetUser = users[targetUserIndex];
 
   if (currentUser.following.includes(targetUserId)) {
     return res.status(409).json({
       ok: false,
       message: "Already following this user."
     });
   }
 
   currentUser.following.push(targetUserId);
   targetUser.followers.push(currentUser.id);
 
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
 
   return res.json({
     ok: true,
     message: "User followed successfully."
   });
 });
 
 app.delete("/api/users/:id/follow", async (req, res) => {
   const targetUserId = Number(req.params.id);
   const userEmail = String(req.query.userEmail || "");
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const currentUserIndex = users.findIndex((user) => user.email === userEmail);
   const targetUserIndex = users.findIndex((user) => user.id === targetUserId);
 
   if (currentUserIndex === -1 || targetUserIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const currentUser = users[currentUserIndex];
   const targetUser = users[targetUserIndex];
 
   currentUser.following = currentUser.following.filter(id => id !== targetUserId);
   targetUser.followers = targetUser.followers.filter(id => id !== currentUser.id);
 
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
 
   return res.json({
     ok: true,
     message: "User unfollowed successfully."
   });
 });
 
 // Follow subreddit
 app.post("/api/subreddits/:name/follow", async (req, res) => {
   const subredditName = req.params.name;
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const userIndex = users.findIndex((user) => user.email === userEmail);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const user = users[userIndex];
   if (!user.followingSubreddits) {
     user.followingSubreddits = [];
   }
 
   if (user.followingSubreddits.includes(subredditName)) {
     return res.status(409).json({
       ok: false,
       message: "Already following this subreddit."
     });
   }
 
   user.followingSubreddits.push(subredditName);
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
 
   return res.json({
     ok: true,
     message: "Subreddit followed successfully."
   });
 });
 
 app.delete("/api/subreddits/:name/follow", async (req, res) => {
   const subredditName = req.params.name;
   const userEmail = String(req.query.userEmail || "");
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const userIndex = users.findIndex((user) => user.email === userEmail);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const user = users[userIndex];
   if (user.followingSubreddits) {
     user.followingSubreddits = user.followingSubreddits.filter(name => name !== subredditName);
   }
 
   for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
 
   return res.json({
     ok: true,
     message: "Subreddit unfollowed successfully."
   });
 });
 
 app.get("/api/subreddits", (_req, res) => {
   res.json({
     ok: true,
     subreddits: readSubreddits()
   });
 });
 
 app.post("/api/subreddits", async (req, res) => {
   const { name, title, description, rules } = req.body ?? {};
 
   if (!name || !title) {
     return res.status(400).json({
       ok: false,
       message: "Subreddit name and title are required."
     });
   }
 
   const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, "");
   const subreddits = await Subreddit.find({}).lean();
   const exists = subreddits.find((item) => item.name === normalizedName);
 
   if (exists) {
     return res.status(409).json({
       ok: false,
       message: "This subreddit already exists."
     });
   }
 
   const subreddit = {
     id: Date.now(),
     name: normalizedName,
     title: String(title).trim(),
     description: String(description || "").trim(),
     rules: String(rules || "").trim(),
     moderators: [req.body.creatorEmail || "demo@site.com"] // Add creator as mod
   };
 
   await Subreddit.create(subreddit);
 
   return res.status(201).json({
     ok: true,
     subreddit
   });
 });
 
 app.get("/api/search", async (req, res) => {
   const query = String(req.query.q || "").trim().toLowerCase();
   const type = String(req.query.type || "all").toLowerCase();
 
   if (!query) {
     return res.json({
       ok: true,
       results: { posts: [], subreddits: [], users: [] }
     });
   }
 
   const results = { posts: [], subreddits: [], users: [] };
 
   if (type === "all" || type === "posts") {
     const posts = await readPosts();
     results.posts = posts.filter((post) =>
       post.caption.toLowerCase().includes(query) ||
       post.subreddit.toLowerCase().includes(query) ||
       post.authorName.toLowerCase().includes(query)
     );
   }
 
   if (type === "all" || type === "subreddits") {
     const subreddits = await Subreddit.find({}).lean();
     results.subreddits = subreddits.filter((subreddit) =>
       subreddit.name.toLowerCase().includes(query) ||
       subreddit.title.toLowerCase().includes(query) ||
       subreddit.description.toLowerCase().includes(query)
     );
   }
 
   if (type === "all" || type === "users") {
     const users = await User.find({}).lean();
     results.users = users.filter((user) =>
       user.name.toLowerCase().includes(query) ||
       user.email.toLowerCase().includes(query)
     ).map((user) => ({
       id: user.id,
       name: user.name,
       email: user.email,
       phone: user.phone || ""
     }));
   }
 
   res.json({
     ok: true,
     results
   });
 });
 
 app.get("/api/posts", async (_req, res) => {
   const posts = await readPosts();
   res.json({
     ok: true,
     posts
   });
 });
 
 // ⚠️ These MUST be defined before /api/posts/:id to avoid Express matching
 // "trending" and "recommended" as the :id param.
 
 // Trending posts
 app.get("/api/posts/trending", async (_req, res) => {
   const posts = await readPosts();
   const now = Date.now();
   const oneDayAgo = now - (24 * 60 * 60 * 1000);
 
   const trendingPosts = posts
     .filter(post => new Date(post.createdAt).getTime() > oneDayAgo)
     .map(post => ({
       ...post,
       score: (post.likes || 0) + (post.comments?.length || 0) * 2
     }))
     .sort((a, b) => b.score - a.score)
     .slice(0, 10);
 
   res.json({
     ok: true,
     posts: trendingPosts
   });
 });
 
 // Recommended posts
 app.get("/api/posts/recommended", async (req, res) => {
   const userEmail = String(req.query.userEmail || "");
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = await User.find({}).lean();
   const user = users.find(u => u.email === userEmail);
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const posts = await readPosts();
   const followedSubreddits = user.followingSubreddits || [];
   const followedUsers = user.following || [];
 
   // Get posts from followed subreddits and users
   const recommendedPosts = posts.filter(post =>
     followedSubreddits.includes(post.subreddit) ||
     followedUsers.some(userId => {
       const followedUser = users.find(u => u.id === userId);
       return followedUser && followedUser.email === post.authorEmail;
     })
   ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 
   res.json({
     ok: true,
     posts: recommendedPosts
   });
 });
 
 app.post("/api/posts", async (req, res) => {
   const { caption, imageUrl, subreddit, authorName, authorEmail } = req.body ?? {};
 
   if (!caption || !imageUrl || !subreddit || !authorName || !authorEmail) {
     return res.status(400).json({
       ok: false,
       message: "Caption, image, subreddit and author are required."
     });
   }
 
   const posts = await readPosts();
   const newPost = {
     id: Date.now(),
     caption,
     imageUrl,
     subreddit,
     authorName,
     authorEmail,
     likes: 0,
     dislikes: 0,
     comments: [],
     likedBy: [],
     dislikedBy: [],
     savedBy: [],
     createdAt: new Date().toISOString()
   };
 
   await Post.create(newPost);
 
   return res.status(201).json({
     ok: true,
     post: newPost
   });
 });
 
  app.patch("/api/posts/:id", async (req, res) => {
  const postId = Number(req.params.id);
  const { caption, subreddit, imageUrl, userEmail } = req.body ?? {};

  const posts = await readPosts();
  const postIndex = posts.findIndex((item) => item.id === postId);

  if (postIndex === -1) {
    return res.status(404).json({
      ok: false,
      message: "Post not found."
    });
  }

  if (posts[postIndex].authorEmail !== userEmail) {
    return res.status(403).json({
      ok: false,
      message: "Only the post owner can edit this post."
    });
  }

  posts[postIndex] = {
    ...posts[postIndex],
    caption: String(caption || posts[postIndex].caption).trim(),
    subreddit: String(subreddit || posts[postIndex].subreddit).trim(),
    imageUrl: imageUrl || posts[postIndex].imageUrl,
    updatedAt: new Date().toISOString()
  };

  await Post.deleteMany({}); await Post.insertMany(posts);

  return res.json({
    ok: true,
    post: posts[postIndex]
  });
});

 
 app.post("/api/posts/:id/react", async (req, res) => {
   const postId = Number(req.params.id);
   const { reaction, userEmail } = req.body ?? {};
 
   if (!["like", "dislike"].includes(reaction) || !userEmail) {
     return res.status(400).json({
       ok: false,
       message: "Reaction must be like or dislike."
     });
   }
 
   const posts = await readPosts();
   const postIndex = posts.findIndex((item) => item.id === postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const post = posts[postIndex];
   post.likedBy = post.likedBy || [];
   post.dislikedBy = post.dislikedBy || [];
 
   if (reaction === "like") {
     if (post.likedBy.includes(userEmail)) {
       post.likedBy = post.likedBy.filter((email) => email !== userEmail);
     } else {
       post.likedBy = [...post.likedBy, userEmail];
       post.dislikedBy = post.dislikedBy.filter((email) => email !== userEmail);
     }
   } else if (post.dislikedBy.includes(userEmail)) {
     post.dislikedBy = post.dislikedBy.filter((email) => email !== userEmail);
   } else {
     post.dislikedBy = [...post.dislikedBy, userEmail];
     post.likedBy = post.likedBy.filter((email) => email !== userEmail);
   }
 
   post.likes = post.likedBy.length;
   post.dislikes = post.dislikedBy.length;
 
   // Update karma for post author
   const users = await User.find({}).lean();
   const authorIndex = users.findIndex(user => user.email === post.authorEmail);
   if (authorIndex !== -1) {
     // Reset karma calculation
     users[authorIndex].karma = 0;
     posts.forEach(p => {
       if (p.authorEmail === post.authorEmail) {
         users[authorIndex].karma += (p.likes || 0);
         users[authorIndex].karma += (p.comments?.length || 0) * 2; // Comments give karma too
       }
     });
     for (const u of users) { await User.findOneAndUpdate({ email: u.email }, u, { upsert: true }); }
   }
 
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   // Emit socket event for real-time updates
   io.emit('postReaction', { postId, post, userEmail, reaction });
 
   return res.json({
     ok: true,
     post
   });
 });
 
 app.post("/api/posts/:id/comments", async (req, res) => {
   const postId = Number(req.params.id);
   const { text, authorName, authorEmail } = req.body ?? {};
 
   if (!text || !authorName) {
     return res.status(400).json({
       ok: false,
       message: "Comment text and author are required."
     });
   }
 
   const posts = await readPosts();
   const postIndex = posts.findIndex((item) => item.id === postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const comment = {
     id: Date.now(),
     authorName,
     authorEmail: authorEmail || "",
     text: String(text).trim(),
     createdAt: new Date().toISOString()
   };
 
   posts[postIndex].comments.unshift(comment);
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.status(201).json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 app.patch("/api/posts/:postId/comments/:commentId", async (req, res) => {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const { text, userEmail } = req.body ?? {};
   const posts = await readPosts();
   const postIndex = findPostIndex(posts, postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const commentIndex = findCommentIndex(posts[postIndex], commentId);
   if (commentIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Comment not found."
     });
   }
 
   const comment = posts[postIndex].comments[commentIndex];
   if (normalizeEmail(comment.authorEmail) !== normalizeEmail(userEmail)) {
     return res.status(403).json({
       ok: false,
       message: "Only the comment owner can edit this comment."
     });
   }
 
   posts[postIndex].comments[commentIndex] = {
     ...comment,
     text: String(text || "").trim(),
     updatedAt: new Date().toISOString()
   };
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 app.post("/api/posts/:postId/comments/:commentId/replies", async (req, res) => {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const { text, authorName, authorEmail } = req.body ?? {};
   const posts = await readPosts();
   const postIndex = findPostIndex(posts, postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const commentIndex = findCommentIndex(posts[postIndex], commentId);
   if (commentIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Comment not found."
     });
   }
 
   if (!text || !authorName || !authorEmail) {
     return res.status(400).json({
       ok: false,
       message: "Reply text and author are required."
     });
   }
 
   const reply = {
     id: Date.now(),
     authorName,
     authorEmail: authorEmail || "",
     text: String(text).trim(),
     createdAt: new Date().toISOString()
   };
 
   posts[postIndex].comments[commentIndex].replies = posts[postIndex].comments[commentIndex].replies || [];
   posts[postIndex].comments[commentIndex].replies.unshift(reply);
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.status(201).json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 async function deleteCommentHandler(req, res) {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const userEmail = normalizeEmail(req.query.userEmail || req.body?.userEmail);
   const posts = await readPosts();
   const postIndex = posts.findIndex((item) => item.id === postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const post = posts[postIndex];
   const commentIndex = (post.comments || []).findIndex((item) => item.id === commentId);
 
   if (commentIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Comment not found."
     });
   }
 
   const comment = post.comments[commentIndex];
   if (!userEmail) {
     return res.status(403).json({
       ok: false,
       message: "You must be logged in to delete this comment."
     });
   }
 
   post.comments.splice(commentIndex, 1);
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.json({
     ok: true,
     post
   });
 }
 
 app.delete("/api/posts/:postId/comments/:commentId", deleteCommentHandler);
 app.post("/api/posts/:postId/comments/:commentId/delete", deleteCommentHandler);
 
 app.post("/api/posts/:id/save", async (req, res) => {
   const postId = Number(req.params.id);
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const posts = await readPosts();
   const postIndex = posts.findIndex((item) => item.id === postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   const post = posts[postIndex];
   post.savedBy = post.savedBy || [];
 
   if (post.savedBy.includes(userEmail)) {
     post.savedBy = post.savedBy.filter((email) => email !== userEmail);
   } else {
     post.savedBy = [...post.savedBy, userEmail];
   }
 
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.json({
     ok: true,
     post
   });
 });
 
 app.delete("/api/posts/:id", async (req, res) => {
   const postId = Number(req.params.id);
   const userEmail = String(req.query.userEmail || "");
   const posts = await readPosts();
   const postIndex = posts.findIndex((item) => item.id === postId);
 
   if (postIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "Post not found."
     });
   }
 
   if (posts[postIndex].authorEmail !== userEmail) {
     return res.status(403).json({
       ok: false,
       message: "Only the post owner can delete this post."
     });
   }
 
   const [deletedPost] = posts.splice(postIndex, 1);
   await Post.deleteMany({}); await Post.insertMany(posts);
 
   return res.json({
     ok: true,
     post: deletedPost
   });
 });
 
 // Avatar upload endpoint
 app.post("/api/account/avatar", async (req, res) => {
   const email = normalizeEmail(req.body?.email);
   const avatar = req.body?.avatar;

   if (!email || !avatar) {
     return res.status(400).json({ ok: false, message: "Email and avatar are required." });
   }

   // Validate base64 image (max ~2MB)
   if (avatar.length > 3 * 1024 * 1024) {
     return res.status(400).json({ ok: false, message: "Image too large. Max 2MB." });
   }

   const users = await User.find({}).lean();
   const userIndex = users.findIndex((u) => normalizeEmail(u.email) === email);

   if (userIndex === -1) {
     return res.status(404).json({ ok: false, message: "User not found." });
   }

   await User.findOneAndUpdate({ email }, { avatar });

   return res.json({ ok: true, avatar });
 });

 // Get user profile including avatar
 app.get("/api/account", async (req, res) => {
   const email = normalizeEmail(req.query.email);
   if (!email) return res.status(400).json({ ok: false, message: "Email required." });

   const users = await User.find({}).lean();
   const user = users.find((u) => normalizeEmail(u.email) === email);
   if (!user) return res.status(404).json({ ok: false, message: "User not found." });

   return res.json({
     ok: true,
     user: {
       id: user.id,
       name: user.name,
       email: user.email,
       phone: user.phone || "",
       avatar: user.avatar || "",
       karma: user.karma || 0,
       following: user.following || [],
       followers: user.followers || []
     }
   });
 });

 
// ── MESSAGING ROUTES ──

// Get all conversations for a user
app.get("/api/messages", async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required." });

  const messages = await Message.find({}).sort({ createdAt: 1 }).lean();
  const users = await User.find({}).lean();

  // Group messages into conversations
  const convMap = {};
  messages.forEach((msg) => {
    if (msg.fromEmail !== userEmail && msg.toEmail !== userEmail) return;
    const otherEmail = msg.fromEmail === userEmail ? msg.toEmail : msg.fromEmail;
    if (!convMap[otherEmail]) {
      const otherUser = users.find((u) => u.email === otherEmail);
      convMap[otherEmail] = {
        otherEmail,
        otherName: otherUser?.name || otherEmail,
        messages: [],
        lastAt: msg.createdAt,
        unread: 0
      };
    }
    convMap[otherEmail].messages.push(msg);
    if (msg.toEmail === userEmail && !msg.read) convMap[otherEmail].unread++;
    if (msg.createdAt > convMap[otherEmail].lastAt) convMap[otherEmail].lastAt = msg.createdAt;
  });

  const conversations = Object.values(convMap).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return res.json({ ok: true, conversations });
});

// Get messages between two users
app.get("/api/messages/:otherEmail", async (req, res) => {
  const { userEmail } = req.query;
  const otherEmail = decodeURIComponent(req.params.otherEmail);
  if (!userEmail) return res.status(400).json({ ok: false, message: "userEmail required." });

  await Message.updateMany(
    {
      fromEmail: otherEmail,
      toEmail: userEmail,
      read: false
    },
    { $set: { read: true } }
  );

  const thread = await Message.find({
    $or: [
      { fromEmail: userEmail, toEmail: otherEmail },
      { fromEmail: otherEmail, toEmail: userEmail }
    ]
  }).sort({ createdAt: 1 }).lean();

  const users = await User.find({}).lean();
  const otherUser = users.find((u) => u.email === otherEmail);

  return res.json({ ok: true, messages: thread, otherName: otherUser?.name || otherEmail });
});

// Send a message
app.post("/api/messages", async (req, res) => {
  const { fromEmail, toEmail, text, mediaUrl, mediaType } = req.body ?? {};
  if (!fromEmail || !toEmail || (!text?.trim() && !mediaUrl)) {
    return res.status(400).json({ ok: false, message: "fromEmail, toEmail and text or media are required." });
  }

  if (mediaUrl && !["image", "gif", "video"].includes(mediaType)) {
    return res.status(400).json({ ok: false, message: "Invalid media type." });
  }

  const users = await User.find({}).lean();
  const sender = users.find((u) => u.email === fromEmail);
  const receiver = users.find((u) => u.email === toEmail);

  if (!sender || !receiver) {
    return res.status(404).json({ ok: false, message: "User not found." });
  }

  const newMsg = {
    id: Date.now(),
    fromEmail,
    fromName: sender.name,
    toEmail,
    toName: receiver.name,
    text: text ? String(text).trim() : "",
    mediaUrl,
    mediaType,
    createdAt: new Date().toISOString(),
    read: false
  };

  await Message.create(newMsg);

  // Emit real-time message to recipient
  io.to(toEmail).emit("newMessage", newMsg);

  return res.status(201).json({ ok: true, message: newMsg });
});

/* Catch-all for unknown routes */
 app.use((req, res) => {
   if (req.path.startsWith("/api/")) {
     return res.status(404).json({
       ok: false,
       message: "API route not found"
     });
   }
   // Frontend is served by Vercel — not here
   return res.status(404).json({
     ok: false,
     message: "Not found. Frontend is hosted on Vercel."
   });
 });
 
 /* ✅ FIXED SERVER START */
 server.listen(port, () => {
   console.log(`Backend running at http://localhost:${port}`);
 });
