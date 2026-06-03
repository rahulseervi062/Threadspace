import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dataDir = path.resolve(new URL(import.meta.url).pathname, '../../data');
const usersFile = path.join(dataDir, 'users.json');
const postsFile = path.join(dataDir, 'posts.json');
const messagesFile = path.join(dataDir, 'messages.json');
const collectionsFile = path.join(dataDir, 'collections.json');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set in environment. Create a .env or set the variable.');
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Helper to read JSON file safely, default to []
    const readJson = (file) => {
      try {
        const raw = fs.readFileSync(file);
        if (raw.length >= 2 && raw[0] === 0xFF && raw[1] === 0xFE) {
          return JSON.parse(raw.slice(2).toString('utf16le'));
        }
        if (raw.length >= 3 && raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) {
          return JSON.parse(raw.toString('utf8'));
        }
        if (raw.includes(0x00)) {
          return JSON.parse(raw.toString('utf16le'));
        }
        return JSON.parse(raw.toString('utf8'));
      } catch (err) {
        console.warn(`Warning: failed to parse ${file}, using empty array`);
        return [];
      }
    };

    const users = readJson(usersFile);
    const posts = readJson(postsFile);
    const messages = readJson(messagesFile);
    const collections = readJson(collectionsFile);

    if (users.length) {
      console.log(`Importing ${users.length} users`);
      await db.collection('users').deleteMany({});
      await db.collection('users').insertMany(users);
    } else {
      console.log('No users to import');
    }

    if (posts.length) {
      console.log(`Importing ${posts.length} posts`);
      await db.collection('posts').deleteMany({});
      await db.collection('posts').insertMany(posts);
    } else {
      console.log('No posts to import');
    }

    if (messages.length) {
      console.log(`Importing ${messages.length} messages`);
      await db.collection('messages').deleteMany({});
      await db.collection('messages').insertMany(messages);
    } else {
      console.log('No messages to import');
    }

    if (collections.length) {
      console.log(`Importing ${collections.length} collections`);
      await db.collection('collections').deleteMany({});
      await db.collection('collections').insertMany(collections);
    } else {
      console.log('No collections to import');
    }

    console.log('Restore complete');
    process.exit(0);
  } catch (err) {
    console.error('Restore failed:', err);
    process.exit(1);
  }
}

run();
