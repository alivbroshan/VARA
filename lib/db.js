import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDirectory = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbPath = path.join(dbDirectory, "vara-clinic.db");

let db;
if (process.env.NODE_ENV === "production") {
  db = new Database(dbPath);
} else {
  if (!global._db) {
    global._db = new Database(dbPath);
  }
  db = global._db;
}

db.pragma("journal_mode = WAL");

// ۱. ساخت جداول و ایندکس‌های یکتا
db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    start_hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    working_days TEXT NOT NULL,
    initials TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_code TEXT UNIQUE NOT NULL,
    doctor_id INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT DEFAULT 'BOOKED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors (id)
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    national_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment
  ON appointments (doctor_id, appointment_date, appointment_time)
  WHERE status = 'BOOKED';

  CREATE UNIQUE INDEX IF NOT EXISTS unique_patient_national_id
  ON patients (national_id)
  WHERE national_id IS NOT NULL AND national_id != '';
`);

// ۲. مقداردهی اولیه پزشکان درمانگاه
const doctorCount = db.prepare("SELECT COUNT(*) as count FROM doctors").get().count;
if (doctorCount === 0) {
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (name, specialty, start_hour, end_hour, working_days, initials, color, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const initialDoctors = [
    {
      name: "دکتر سارا احمدی",
      specialty: "متخصص قلب و عروق",
      start_hour: 9,
      end_hour: 13,
      working_days: "شنبه تا چهارشنبه",
      initials: "سا",
      color: "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      name: "دکتر علی رضایی",
      specialty: "متخصص داخلی و گوارش",
      start_hour: 14,
      end_hour: 18,
      working_days: "شنبه تا چهارشنبه",
      initials: "عل",
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      name: "دکتر مریم کاظمی",
      specialty: "متخصص اطفال و کودکان",
      start_hour: 10,
      end_hour: 15,
      working_days: "شنبه تا چهارشنبه",
      initials: "مر",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  for (const doc of initialDoctors) {
    insertDoctor.run(
      doc.name,
      doc.specialty,
      doc.start_hour,
      doc.end_hour,
      doc.working_days,
      doc.initials,
      doc.color
    );
  }
}

// ثبت‌نام بیمار با بررسی عدم تکراری بودن شماره موبایل و کد ملی
export function registerPatient({ name, phone, nationalId }) {
  const cleanPhone = phone.trim();
  const cleanNationalId = nationalId && nationalId.trim() ? nationalId.trim() : null;

  // بررسی تکراری نبودن شماره موبایل
  const existingPhone = db.prepare("SELECT id FROM patients WHERE phone = ?").get(cleanPhone);
  if (existingPhone) {
    throw new Error("این شماره موبایل قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.");
  }

  // بررسی تکراری نبودن کد ملی (در صورت وارد شدن)
  if (cleanNationalId) {
    const existingNationalId = db
      .prepare("SELECT id FROM patients WHERE national_id = ?")
      .get(cleanNationalId);
    if (existingNationalId) {
      throw new Error("این کد ملی قبلاً در سامانه ثبت شده است. لطفاً وارد شوید.");
    }
  }

  const stmt = db.prepare(`
    INSERT INTO patients (name, phone, national_id)
    VALUES (?, ?, ?)
  `);
  const res = stmt.run(name.trim(), cleanPhone, cleanNationalId);
  return { id: res.lastInsertRowid, name: name.trim(), phone: cleanPhone };
}

// ورود بیمار با شماره موبایل
export function loginPatient(phone) {
  const cleanPhone = phone.trim();
  const patient = db.prepare("SELECT * FROM patients WHERE phone = ?").get(cleanPhone);
  if (!patient) {
    throw new Error("کاربری با این شماره یافت نشد. لطفاً ابتدا ثبت‌نام کنید.");
  }
  return patient;
}

export function getAllDoctors() {
  return db.prepare("SELECT * FROM doctors WHERE is_active = 1").all();
}

export function addDoctor({ name, specialty, startHour, endHour, workingDays, initials, color }) {
  const stmt = db.prepare(`
    INSERT INTO doctors (name, specialty, start_hour, end_hour, working_days, initials, color, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const result = stmt.run(
    name,
    specialty,
    Number(startHour),
    Number(endHour),
    workingDays,
    initials || name.slice(0, 2),
    color || "bg-indigo-50 text-indigo-600 border-indigo-100"
  );
  return { id: result.lastInsertRowid, success: true };
}

export function toggleDoctorStatus(doctorId, isActive) {
  const stmt = db.prepare("UPDATE doctors SET is_active = ? WHERE id = ?");
  stmt.run(isActive ? 1 : 0, Number(doctorId));
  return { success: true };
}

export function getBookedSlots(doctorId, date) {
  const rows = db
    .prepare(
      "SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status = 'BOOKED'"
    )
    .all(doctorId, date);
  return rows.map((r) => r.appointment_time);
}

export function createAppointment({ doctorId, patientName, patientPhone, date, time }) {
  const trackingCode = "VARA-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const stmt = db.prepare(`
    INSERT INTO appointments (tracking_code, doctor_id, patient_name, patient_phone, appointment_date, appointment_time, status)
    VALUES (?, ?, ?, ?, ?, ?, 'BOOKED')
  `);

  try {
    const result = stmt.run(
      trackingCode,
      doctorId,
      patientName,
      patientPhone,
      date,
      time
    );

    return {
      success: true,
      appointment: {
        id: result.lastInsertRowid,
        trackingCode,
      },
    };
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      throw new Error("متأسفانه این ساعت همین لحظه توسط شخص دیگری رزرو شد. لطفاً ساعت دیگری انتخاب کنید.");
    }
    throw err;
  }
}

export function getAllAppointments() {
  return db
    .prepare(
      `SELECT 
        a.id,
        a.tracking_code,
        a.patient_name,
        a.patient_phone,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.created_at,
        d.name AS doctor_name,
        d.specialty AS doctor_specialty
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      ORDER BY a.id DESC`
    )
    .all();
}

export function getAppointmentsByPhone(phone) {
  return db
    .prepare(
      `SELECT 
        a.id,
        a.tracking_code,
        a.patient_name,
        a.patient_phone,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.created_at,
        d.name AS doctor_name,
        d.specialty AS doctor_specialty
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_phone = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC`
    )
    .all(phone.trim());
}

export function cancelAppointment(trackingCode) {
  const stmt = db.prepare(
    "UPDATE appointments SET status = 'CANCELLED' WHERE tracking_code = ? AND status = 'BOOKED'"
  );
  const result = stmt.run(trackingCode.trim().toUpperCase());

  if (result.changes === 0) {
    throw new Error("نوبتی با این کد رهگیری پیدا نشد یا قبلاً لغو شده است.");
  }

  return { success: true, message: "نوبت با موفقیت لغو شد." };
}

export function getAdminStats() {
  const today = new Date().toISOString().split("T")[0];

  const totalAppointments = db
    .prepare("SELECT COUNT(*) as count FROM appointments")
    .get().count;

  const activeAppointments = db
    .prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'BOOKED'")
    .get().count;

  const todayAppointments = db
    .prepare(
      "SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ? AND status = 'BOOKED'"
    )
    .get(today).count;

  const cancelledAppointments = db
    .prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'CANCELLED'")
    .get().count;

  return {
    totalAppointments,
    activeAppointments,
    todayAppointments,
    cancelledAppointments,
  };
}

export default db;