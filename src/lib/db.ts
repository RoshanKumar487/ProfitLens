
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import { join } from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  const dbPath = join(process.cwd(), 'database.db');
  console.log(`[DB] Using database at: ${dbPath}`);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      currencySymbol TEXT NOT NULL DEFAULT '$',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      companyId INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      isSuperAdmin BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (companyId) REFERENCES companies(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT,
      description TEXT,
      employeeName TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  return db;
}
