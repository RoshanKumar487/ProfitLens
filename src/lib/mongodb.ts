
import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'profiitlens';

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  // This caching strategy can be problematic in serverless environments.
  // We will connect every time to ensure a fresh connection.
  // if (cachedClient && cachedDb) {
  //   return { client: cachedClient, db: cachedDb };
  // }

  const client = new MongoClient(uri!);

  await client.connect();
  const db = client.db(dbName);

  // Indexes are created once, so we can keep this for efficiency.
  // In a real production app, you might run this as a separate script.
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ companyId: 1 });
  await db.collection('expenses').createIndex({ userId: 1 });

  // Do not cache the client and db instances.
  // cachedClient = client;
  // cachedDb = db;

  return { client, db };
}
