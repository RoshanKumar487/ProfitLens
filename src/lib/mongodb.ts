import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'profiitlens';

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri!);

  await client.connect();
  const db = client.db(dbName);

  // Set up indexes for faster queries
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ companyId: 1 });
  await db.collection('expenses').createIndex({ userId: 1 });

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
