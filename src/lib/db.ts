
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import { join } from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  // In a real app, you'd want to put this in a more persistent location.
  // For this example, we'll use a file in the project directory.
  // Using process.cwd() ensures the path is correct in both dev and prod.
  const dbPath = join(process.cwd(), 'database.db');
  console.log(`[DB] Using database at: ${dbPath}`);


  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT,
      description TEXT,
      employeeName TEXT
    );
  `);

  return db;
}
