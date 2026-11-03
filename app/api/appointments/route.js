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

    DROP INDEX IF EXISTS unique_active_appointment;
    DROP INDEX IF EXISTS idx_active_slots;
    DROP INDEX IF EXISTS idx_doctor_datetime;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_slots
    ON appointments (doctor_id, date, time)
    WHERE LOWER(status) NOT LIKE '%cancel%';
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

  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };

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

      return NextResponse.json({ appointments }, { headers: noCacheHeaders });
    }

    if (doctorId && date) {
      // تمیزکاری تاریخ ارسالی جهت جلوگیری از تفاوت فاصله یا کاراکتر مخفی
      const cleanDate = date.trim();
      const appointments = db.prepare(`
        SELECT time FROM appointments
        WHERE doctor_id = ? 
          AND date = ? 
          AND LOWER(TRIM(status)) NOT LIKE '%cancel%'
      `).all(Number(doctorId), cleanDate);

      const bookedSlots = appointments.map((a) => a.time);

      return NextResponse.json(
        { bookedSlots, bookedTimes: bookedSlots },
        { headers: noCacheHeaders }
      );
    }

    const allAppointments = db.prepare(`
      SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.date DESC, a.time ASC
    `).all();

    return NextResponse.json({ appointments: allAppointments }, { headers: noCacheHeaders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: noCacheHeaders });
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
    const cleanDate = date.trim();
    const cleanTime = time.trim();
    const trackingCode = generateTrackingCode();

    const runTransaction = db.transaction(() => {
      const existing = db.prepare(`
        SELECT id FROM appointments
        WHERE doctor_id = ? 
          AND date = ? 
          AND time = ? 
          AND LOWER(TRIM(status)) NOT LIKE '%cancel%'
      `).get(docIdNum, cleanDate, cleanTime);

      if (existing) {
        throw new Error("SLOT_TAKEN");
      }

      const stmt = db.prepare(`
        INSERT INTO appointments (doctor_id, patient_name, patient_phone, date, time, tracking_code, status)
        VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
      `);

      return stmt.run(docIdNum, patientName.trim(), patientPhone.trim(), cleanDate, cleanTime, trackingCode);
    });

    const result = runTransaction();

    return NextResponse.json({
      success: true,
      appointment: {
        id: result.lastInsertRowid,
        trackingCode,
        doctorId: docIdNum,
        patientName,
        patientPhone,
        date: cleanDate,
        time: cleanTime,
        status: "confirmed",
      },
    });
  } catch (error) {
    if (error.message === "SLOT_TAKEN" || (error.message && error.message.includes("UNIQUE constraint failed"))) {
      return NextResponse.json({ error: "این زمان قبلاً توسط بیمار دیگری رزرو شده است." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}

export async function PATCH(request) {
  const db = getDb();
  try {
    const { trackingCode, id, status } = await request.json();

    const newStatus = status ? status.trim().toLowerCase() : "cancelled";

    let res;
    if (trackingCode) {
      res = db.prepare(`
        UPDATE appointments
        SET status = ?
        WHERE tracking_code = ?
      `).run(newStatus, trackingCode.trim().toUpperCase());
    } else if (id) {
      res = db.prepare(`
        UPDATE appointments
        SET status = ?
        WHERE id = ?
      `).run(newStatus, Number(id));
    } else {
      return NextResponse.json({ error: "کد رهگیری یا شناسه نوبت الزامی است." }, { status: 400 });
    }

    if (res.changes === 0) {
      return NextResponse.json({ error: "نوبتی با این مشخصات پیدا نشد." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "وضعیت نوبت به‌روزرسانی شد و ساعت با موفقیت آزاد گردید.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    db.close();
  }
}