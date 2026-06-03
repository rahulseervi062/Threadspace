import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { fileURLToPath } from 'url';

dotenv.config();

const dnsServers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outFile = path.resolve(__dirname, '../data/messages.json');

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const messages = await db.collection('messages').find({}).toArray();
    fs.writeFileSync(outFile, JSON.stringify(messages, null, 2), 'utf8');
    console.log(`Wrote ${messages.length} messages to ${outFile}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

run();
