 import process from "process";
import cors from "cors";
 import dotenv from "dotenv";
 import express from "express";
 import fs from "fs";
 import nodemailer from "nodemailer";
 import otpGenerator from "otp-generator";
 import path from "path";
 import { fileURLToPath } from "url";
 import multer from "multer";
 import { v2 as cloudinary } from "cloudinary";
 import { createServer } from "http";
 import { Server } from "socket.io";
 
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
 const io = new Server(server, {
   cors: {
     origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173"
   }
 });
 const port = Number(process.env.PORT || 4001);
 const demoEmail = process.env.DEMO_EMAIL || "demo@site.com";
 const demoPassword = process.env.DEMO_PASSWORD || "Password@123";
 const __filename = fileURLToPath(import.meta.url);
 const __dirname = path.dirname(__filename);
 const dataDir = path.resolve(__dirname, "../data");
 const postsFile = path.join(dataDir, "posts.json");
 const usersFile = path.join(dataDir, "users.json");
 const subredditsFile = path.join(dataDir, "subreddits.json");
 const messagesFile = path.join(dataDir, "messages.json");
 const collectionsFile = path.join(dataDir, "collections.json");
 const demoPhone = process.env.DEMO_PHONE || "9999999999";
 
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
 
 if (!fs.existsSync(dataDir)) {
   fs.mkdirSync(dataDir, { recursive: true });
 }
 
 if (!fs.existsSync(postsFile)) {
   fs.writeFileSync(postsFile, "[]", "utf8");
 }
 
 if (!fs.existsSync(messagesFile)) {
   fs.writeFileSync(messagesFile, "[]", "utf8");
 }
 
 if (!fs.existsSync(collectionsFile)) {
   fs.writeFileSync(collectionsFile, "[]", "utf8");
 }
 
 if (!fs.existsSync(usersFile)) {
   fs.writeFileSync(
     usersFile,
     JSON.stringify(
       [
         {
           id: 1,
           name: "Demo User",
           email: demoEmail,
           phone: demoPhone,
           password: demoPassword,
           createdAt: new Date().toISOString(),
           following: [],
           followers: [20000000000],
           karma: 0
         }
       ],
       null,
       2
     ),
     "utf8"
   );
 }
 
 if (!fs.existsSync(subredditsFile)) {
   fs.writeFileSync(
     subredditsFile,
     JSON.stringify(
       [
         {
           id: 1,
           name: "announcements",
           title: "Announcements",
           description: "Official updates and highlights from the community."
         },
         {
           id: 2,
           name: "photography",
           title: "Photography",
           description: "Share your favorite moments and visual stories."
         },
         {
           id: 3,
           name: "campuslife",
           title: "Campus Life",
           description: "Talk about events, student life, and day-to-day updates."
         }
       ],
       null,
       2
     ),
     "utf8"
   );
 }
 
 function readPosts() {
   try {
     const raw = fs.readFileSync(postsFile, "utf8");
     const posts = JSON.parse(raw);
     return posts.map((post) => ({
       likes: 0,
       dislikes: 0,
       comments: [],
       likedBy: [],
       dislikedBy: [],
       savedBy: [],
       ...post
     })).map((post) => ({
       ...post,
       comments: (post.comments || []).map((comment) => ({
         replies: [],
         ...comment,
         replies: (comment.replies || []).map((reply) => ({
           ...reply
         }))
       }))
     }));
   } catch {
     return [];
   }
 }
 
 function writePosts(posts) {
   fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2), "utf8");
 }
 
 function readUsers() {
   try {
     const raw = fs.readFileSync(usersFile, "utf8");
     const users = JSON.parse(raw);
     let changed = false;
 
     const normalizedUsers = users.map((user) => {
       if (!user.phone && user.email === demoEmail) {
         changed = true;
         return {
           ...user,
           phone: demoPhone
         };
       }
       // Add new fields if missing
       if (!user.following) {
         changed = true;
         return {
           ...user,
           following: [],
           followers: [],
           karma: 0
         };
       }
       return user;
     });
 
     if (changed) {
       writeUsers(normalizedUsers);
     }
 
     return normalizedUsers;
   } catch {
     return [];
   }
 }
 
 function writeUsers(users) {
   fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf8");
 }
 
 function readSubreddits() {
   try {
     const raw = fs.readFileSync(subredditsFile, "utf8");
     return JSON.parse(raw);
   } catch {
     return [];
   }
 }
 
 function writeSubreddits(subreddits) {
   fs.writeFileSync(subredditsFile, JSON.stringify(subreddits, null, 2), "utf8");
 }
 
 function normalizePhoneNumber(value) {
   return String(value || "").replace(/\D/g, "");
 }
 
 function normalizeEmail(value) {
   return String(value || "").trim().toLowerCase();
 }
 
 function findPostIndex(posts, postId) {
   return posts.findIndex((item) => item.id === postId);
 }
 
 function findCommentIndex(post, commentId) {
   return (post.comments || []).findIndex((item) => item.id === commentId);
 }
 
 app.get("/", (req, res) => {
   res.send("Server is running 🚀");
 });

  app.use(
  cors({
    origin: ["https://threadspace-frontend.vercel.app", "http://localhost:5173"]
  })
);
 app.use(express.json({ limit: "50mb" }));
 app.use(express.urlencoded({ limit: "50mb", extended: true }));
 
 app.get("/api/health", (_req, res) => {
   res.json({ ok: true, service: "login-api" });
 });
 
 app.post("/api/login", (req, res) => {
   const { email, password } = req.body ?? {};
 
   if (!email || !password) {
     return res.status(400).json({
       ok: false,
       message: "Email and password are required."
     });
   }
 
   const users = readUsers();
   const user = users.find((item) => item.email === email);
 
   if (!user) {
     return res.status(401).json({
       ok: false,
       message: "Invalid email or password.",
       showForgotPassword: true
     });
   }
 
   if (user.password === password) {
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
 
 app.post("/api/verify-otp", (req, res) => {
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
   const users = readUsers();
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
 
 app.post("/api/signup", (req, res) => {
   const { name, email, password, phone } = req.body ?? {};
   const normalizedPhone = normalizePhoneNumber(phone);
 
   if (!name || !email || !password || !normalizedPhone) {
     return res.status(400).json({
       ok: false,
       message: "Name, email, mobile number and password are required."
     });
   }
 
   const users = readUsers();
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
 
   if (existingPhone) {
     return res.status(409).json({
       ok: false,
       message: "An account with this mobile number already exists."
     });
   }
 
   const newUser = {
     id: Date.now(),
     name,
     email,
     phone: normalizedPhone,
     password,
     createdAt: new Date().toISOString()
   };
 
   users.push(newUser);
   writeUsers(users);
 
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
 
 app.post("/api/forgot-password", (req, res) => {
   const email = normalizeEmail(req.body?.email);
 
   if (!email) {
     return res.status(400).json({
       ok: false,
       message: "Email is required."
     });
   }
 
   const users = readUsers();
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
 
 app.post("/api/reset-password-otp", (req, res) => {
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
 
   const users = readUsers();
   const user = users.find((item) => normalizeEmail(item.email) === email);
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   user.password = newPassword;
   writeUsers(users);
   otpStore.delete(resetKey);
 
   return res.json({
     ok: true,
     message: "Password has been reset successfully."
   });
 });
 
 app.get("/api/users", (req, res) => {
   const query = String(req.query.q || "").trim().toLowerCase();
   const users = readUsers().map((user) => ({
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
 
 app.patch("/api/account", (req, res) => {
   const email = normalizeEmail(req.body?.email);
   const name = String(req.body?.name || "").trim();
   const phone = normalizePhoneNumber(req.body?.phone);
 
   if (!email || !name || !phone) {
     return res.status(400).json({
       ok: false,
       message: "Email, name, and mobile number are required."
     });
   }
 
   const users = readUsers();
   const userIndex = users.findIndex((item) => normalizeEmail(item.email) === email);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   users[userIndex] = {
     ...users[userIndex],
     name,
     phone
   };
   writeUsers(users);
 
   return res.json({
     ok: true,
     user: {
       name: users[userIndex].name,
       email: users[userIndex].email,
       phone: users[userIndex].phone
     }
   });
 });
 
 app.post("/api/account/password", (req, res) => {
   const email = normalizeEmail(req.body?.email);
   const currentPassword = String(req.body?.currentPassword || "");
   const newPassword = String(req.body?.newPassword || "");
 
   if (!email || !currentPassword || !newPassword) {
     return res.status(400).json({
       ok: false,
       message: "Email, current password, and new password are required."
     });
   }
 
   const users = readUsers();
   const userIndex = users.findIndex((item) => normalizeEmail(item.email) === email);
 
   if (userIndex === -1) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   if (users[userIndex].password !== currentPassword) {
     return res.status(401).json({
       ok: false,
       message: "Current password is incorrect."
     });
   }
 
   users[userIndex] = {
     ...users[userIndex],
     password: newPassword
   };
   writeUsers(users);
 
   return res.json({
     ok: true,
     message: "Password updated successfully."
   });
 });
 
 // Following endpoints
 app.post("/api/users/:id/follow", (req, res) => {
   const targetUserId = Number(req.params.id);
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = readUsers();
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
 
   writeUsers(users);
 
   return res.json({
     ok: true,
     message: "User followed successfully."
   });
 });
 
 app.delete("/api/users/:id/follow", (req, res) => {
   const targetUserId = Number(req.params.id);
   const userEmail = String(req.query.userEmail || "");
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = readUsers();
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
 
   writeUsers(users);
 
   return res.json({
     ok: true,
     message: "User unfollowed successfully."
   });
 });
 
 // Follow subreddit
 app.post("/api/subreddits/:name/follow", (req, res) => {
   const subredditName = req.params.name;
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = readUsers();
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
   writeUsers(users);
 
   return res.json({
     ok: true,
     message: "Subreddit followed successfully."
   });
 });
 
 app.delete("/api/subreddits/:name/follow", (req, res) => {
   const subredditName = req.params.name;
   const userEmail = String(req.query.userEmail || "");
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = readUsers();
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
 
   writeUsers(users);
 
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
 
 app.post("/api/subreddits", (req, res) => {
   const { name, title, description, rules } = req.body ?? {};
 
   if (!name || !title) {
     return res.status(400).json({
       ok: false,
       message: "Subreddit name and title are required."
     });
   }
 
   const normalizedName = String(name).trim().toLowerCase().replace(/\s+/g, "");
   const subreddits = readSubreddits();
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
 
   subreddits.unshift(subreddit);
   writeSubreddits(subreddits);
 
   return res.status(201).json({
     ok: true,
     subreddit
   });
 });
 
 app.get("/api/search", (req, res) => {
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
     const posts = readPosts();
     results.posts = posts.filter((post) =>
       post.caption.toLowerCase().includes(query) ||
       post.subreddit.toLowerCase().includes(query) ||
       post.authorName.toLowerCase().includes(query)
     );
   }
 
   if (type === "all" || type === "subreddits") {
     const subreddits = readSubreddits();
     results.subreddits = subreddits.filter((subreddit) =>
       subreddit.name.toLowerCase().includes(query) ||
       subreddit.title.toLowerCase().includes(query) ||
       subreddit.description.toLowerCase().includes(query)
     );
   }
 
   if (type === "all" || type === "users") {
     const users = readUsers();
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
 
 app.get("/api/posts", (_req, res) => {
   const posts = readPosts();
   res.json({
     ok: true,
     posts
   });
 });
 
 // ⚠️ These MUST be defined before /api/posts/:id to avoid Express matching
 // "trending" and "recommended" as the :id param.
 
 // Trending posts
 app.get("/api/posts/trending", (_req, res) => {
   const posts = readPosts();
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
 app.get("/api/posts/recommended", (req, res) => {
   const userEmail = String(req.query.userEmail || "");
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const users = readUsers();
   const user = users.find(u => u.email === userEmail);
   if (!user) {
     return res.status(404).json({
       ok: false,
       message: "User not found."
     });
   }
 
   const posts = readPosts();
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
 
 app.post("/api/posts", (req, res) => {
   const { caption, imageUrl, subreddit, authorName, authorEmail } = req.body ?? {};
 
   if (!caption || !imageUrl || !subreddit || !authorName || !authorEmail) {
     return res.status(400).json({
       ok: false,
       message: "Caption, image, subreddit and author are required."
     });
   }
 
   const posts = readPosts();
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
 
   posts.unshift(newPost);
   writePosts(posts);
 
   return res.status(201).json({
     ok: true,
     post: newPost
   });
 });
 
  app.patch("/api/posts/:id", (req, res) => {
  const postId = Number(req.params.id);
  const { caption, subreddit, imageUrl, userEmail } = req.body ?? {};

  const posts = readPosts();
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

  writePosts(posts);

  return res.json({
    ok: true,
    post: posts[postIndex]
  });
});

 
 app.post("/api/posts/:id/react", (req, res) => {
   const postId = Number(req.params.id);
   const { reaction, userEmail } = req.body ?? {};
 
   if (!["like", "dislike"].includes(reaction) || !userEmail) {
     return res.status(400).json({
       ok: false,
       message: "Reaction must be like or dislike."
     });
   }
 
   const posts = readPosts();
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
   const users = readUsers();
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
     writeUsers(users);
   }
 
   writePosts(posts);
 
   // Emit socket event for real-time updates
   io.emit('postReaction', { postId, post, userEmail, reaction });
 
   return res.json({
     ok: true,
     post
   });
 });
 
 app.post("/api/posts/:id/comments", (req, res) => {
   const postId = Number(req.params.id);
   const { text, authorName, authorEmail } = req.body ?? {};
 
   if (!text || !authorName || !authorEmail) {
     return res.status(400).json({
       ok: false,
       message: "Comment text and author are required."
     });
   }
 
   const posts = readPosts();
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
     authorEmail,
     text: String(text).trim(),
     createdAt: new Date().toISOString()
   };
 
   posts[postIndex].comments.unshift(comment);
   writePosts(posts);
 
   return res.status(201).json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 app.patch("/api/posts/:postId/comments/:commentId", (req, res) => {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const { text, userEmail } = req.body ?? {};
   const posts = readPosts();
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
   writePosts(posts);
 
   return res.json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 app.post("/api/posts/:postId/comments/:commentId/replies", (req, res) => {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const { text, authorName, authorEmail } = req.body ?? {};
   const posts = readPosts();
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
     authorEmail,
     text: String(text).trim(),
     createdAt: new Date().toISOString()
   };
 
   posts[postIndex].comments[commentIndex].replies = posts[postIndex].comments[commentIndex].replies || [];
   posts[postIndex].comments[commentIndex].replies.unshift(reply);
   writePosts(posts);
 
   return res.status(201).json({
     ok: true,
     post: posts[postIndex]
   });
 });
 
 function deleteCommentHandler(req, res) {
   const postId = Number(req.params.postId);
   const commentId = Number(req.params.commentId);
   const userEmail = normalizeEmail(req.query.userEmail || req.body?.userEmail);
   const posts = readPosts();
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
   writePosts(posts);
 
   return res.json({
     ok: true,
     post
   });
 }
 
 app.delete("/api/posts/:postId/comments/:commentId", deleteCommentHandler);
 app.post("/api/posts/:postId/comments/:commentId/delete", deleteCommentHandler);
 
 app.post("/api/posts/:id/save", (req, res) => {
   const postId = Number(req.params.id);
   const { userEmail } = req.body ?? {};
 
   if (!userEmail) {
     return res.status(400).json({
       ok: false,
       message: "User email is required."
     });
   }
 
   const posts = readPosts();
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
 
   writePosts(posts);
 
   return res.json({
     ok: true,
     post
   });
 });
 
 app.delete("/api/posts/:id", (req, res) => {
   const postId = Number(req.params.id);
   const userEmail = String(req.query.userEmail || "");
   const posts = readPosts();
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
   writePosts(posts);
 
   return res.json({
     ok: true,
     post: deletedPost
   });
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