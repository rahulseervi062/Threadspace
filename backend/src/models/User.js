import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  following: [String], // Array of emails
  followingSubreddits: [String], // Array of subreddit names
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
