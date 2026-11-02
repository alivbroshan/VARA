import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "clinic.db");

function getDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF");

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_code TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export async function GET() {
  const db = getDb();
  try {
    const notifications = db
      .prepare("SELECT * FROM notifications ORDER BY id DESC LIMIT 25")
      .all();

    const unreadRow = db
      .prepare("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0")
      .get();

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadRow ? unreadRow.count : 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function PATCH() {
  const db = getDb();
  try {
    db.prepare("UPDATE notifications SET is_read = 1").run();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}