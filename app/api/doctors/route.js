import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "clinic.db");

function getDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      start_hour INTEGER DEFAULT 9,
      end_hour INTEGER DEFAULT 17,
      working_days TEXT DEFAULT 'شنبه تا چهارشنبه'
    );
  `);
  return db;
}

// دریافت پزشکان
export async function GET() {
  const db = getDb();
  try {
    const doctors = db.prepare("SELECT * FROM doctors ORDER BY id ASC").all();
    return NextResponse.json(doctors);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

// ثبت پزشک جدید
export async function POST(request) {
  const db = getDb();
  try {
    const { name, specialty, startHour, endHour, workingDays } = await request.json();

    if (!name || !specialty) {
      return NextResponse.json({ error: "نام و تخصص پزشک الزامی است." }, { status: 400 });
    }

    const sHour = Number(startHour) || 9;
    const eHour = Number(endHour) || 17;

    if (sHour >= eHour) {
      return NextResponse.json({ error: "ساعت شروع ویزیت باید قبل از ساعت پایان باشد." }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO doctors (name, specialty, start_hour, end_hour, working_days)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name.trim(), specialty.trim(), sHour, eHour, workingDays || "شنبه تا چهارشنبه");

    return NextResponse.json({
      success: true,
      doctor: {
        id: result.lastInsertRowid,
        name: name.trim(),
        specialty: specialty.trim(),
        start_hour: sHour,
        end_hour: eHour,
        working_days: workingDays || "شنبه تا چهارشنبه",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

// ویرایش ساعت کاری یا اطلاعات پزشک
export async function PATCH(request) {
  const db = getDb();
  try {
    const { id, startHour, endHour, workingDays, name, specialty } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "شناسه پزشک الزامی است." }, { status: 400 });
    }

    const doctor = db.prepare("SELECT * FROM doctors WHERE id = ?").get(Number(id));
    if (!doctor) {
      return NextResponse.json({ error: "پزشک موردنظر پیدا نشد." }, { status: 404 });
    }

    const updatedName = name ? name.trim() : doctor.name;
    const updatedSpecialty = specialty ? specialty.trim() : doctor.specialty;
    const updatedStartHour = startHour !== undefined ? Number(startHour) : doctor.start_hour;
    const updatedEndHour = endHour !== undefined ? Number(endHour) : doctor.end_hour;
    const updatedWorkingDays = workingDays ? workingDays.trim() : doctor.working_days;

    if (updatedStartHour >= updatedEndHour) {
      return NextResponse.json({ error: "ساعت شروع باید پیش از ساعت پایان باشد." }, { status: 400 });
    }

    const stmt = db.prepare(`
      UPDATE doctors
      SET name = ?, specialty = ?, start_hour = ?, end_hour = ?, working_days = ?
      WHERE id = ?
    `);

    stmt.run(updatedName, updatedSpecialty, updatedStartHour, updatedEndHour, updatedWorkingDays, Number(id));

    return NextResponse.json({
      success: true,
      doctor: {
        id: Number(id),
        name: updatedName,
        specialty: updatedSpecialty,
        start_hour: updatedStartHour,
        end_hour: updatedEndHour,
        working_days: updatedWorkingDays,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

// حذف پزشک از درمانگاه
export async function DELETE(request) {
  const db = getDb();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "شناسه پزشک برای حذف الزامی است." }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM doctors WHERE id = ?");
    const res = stmt.run(Number(id));

    if (res.changes === 0) {
      return NextResponse.json({ error: "پزشکی با این شناسه یافت نشد." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "پزشک با موفقیت از سیستم حذف شد." });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}