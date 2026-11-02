import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "clinic.db");

function getDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF");

  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      start_hour INTEGER DEFAULT 9,
      end_hour INTEGER DEFAULT 17,
      working_days TEXT DEFAULT 'شنبه تا چهارشنبه'
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      tracking_code TEXT UNIQUE,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM doctors").get();
  if (count.c === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO doctors (id, name, specialty, start_hour, end_hour, working_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertDoc.run(1, "دکتر مسعود کریمی", "متخصص قلب و عروق", 9, 16, "شنبه تا چهارشنبه");
    insertDoc.run(2, "دکتر سارا شمس", "متخصص داخلی و گوارش", 10, 18, "شنبه تا چهارشنبه");
    insertDoc.run(3, "دکتر بهنام ناصری", "دندان‌پزشک و جراح فک", 9, 15, "یکشنبه تا پنجشنبه");
    insertDoc.run(4, "دکتر مریم راد", "متخصص اطفال و کودکان", 8, 14, "شنبه تا چهارشنبه");
  }

  return db;
}

function generateTrackingCode() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `VARA-${randomNum}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  const phone = searchParams.get("phone");

  const db = getDb();
  try {
    if (phone) {
      const appointments = db.prepare(`
        SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.patient_phone = ?
        ORDER BY a.date DESC, a.time ASC
      `).all(phone);

      return NextResponse.json({ appointments });
    }

    if (doctorId && date) {
      const appointments = db.prepare(`
        SELECT time FROM appointments
        WHERE doctor_id = ? AND date = ? AND status != 'cancelled'
      `).all(Number(doctorId), date);

      const bookedSlots = appointments.map((a) => a.time);
      return NextResponse.json({ bookedSlots });
    }

    const allAppointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.date DESC, a.time ASC
    `).all();

    return NextResponse.json({ appointments: allAppointments });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function POST(request) {
  const db = getDb();
  try {
    const { doctorId, patientName, patientPhone, date, time } = await request.json();

    if (!doctorId || !patientName || !patientPhone || !date || !time) {
      return NextResponse.json({ error: "اطلاعات ارسالی ناقص است." }, { status: 400 });
    }

    const docIdNum = Number(doctorId);

    const existing = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'cancelled'
    `).get(docIdNum, date, time);

    if (existing) {
      return NextResponse.json({ error: "این زمان قبلاً توسط بیمار دیگری رزرو شده است." }, { status: 409 });
    }

    const trackingCode = generateTrackingCode();

    const stmt = db.prepare(`
      INSERT INTO appointments (doctor_id, patient_name, patient_phone, date, time, tracking_code, status)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `);
    // دریافت نام پزشک جهت نمایش در اعلان
    let docName = "پزشک کلینیک";
    try {
      const doc = db.prepare("SELECT name FROM doctors WHERE id = ?").get(doctorId);
      if (doc) docName = doc.name;

      // ثبت اعلان جدید برای ادمین
      db.prepare(
        "INSERT INTO notifications (tracking_code, patient_name, doctor_name, date, time, is_read) VALUES (?, ?, ?, ?, ?, 0)"
      ).run(trackingCode, patientName.trim(), docName, date, time);
    } catch (notifErr) {
      console.error("Notification trigger error:", notifErr);
    }

    const result = stmt.run(docIdNum, patientName, patientPhone, date, time, trackingCode);

    return NextResponse.json({
      success: true,
      appointment: {
        id: result.lastInsertRowid,
        trackingCode,
        doctorId: docIdNum,
        patientName,
        patientPhone,
        date,
        time,
        status: "confirmed"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function PATCH(request) {
  const db = getDb();
  try {
    const { trackingCode, status } = await request.json();

    if (!trackingCode || !status) {
      return NextResponse.json({ error: "کد رهگیری و وضعیت الزامی است." }, { status: 400 });
    }

    const stmt = db.prepare(`
      UPDATE appointments
      SET status = ?
      WHERE tracking_code = ?
    `);

    const res = stmt.run(status, trackingCode);

    if (res.changes === 0) {
      return NextResponse.json({ error: "نوبتی با این کد رهگیری پیدا نشد." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "وضعیت نوبت به‌روزرسانی شد." });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}