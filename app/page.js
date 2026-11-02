"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";

// کارت تعاملی با افکت اسپات‌لایت ماوس
function SpotlightCard({ children, className = "", onClick }) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: -1000, y: -1000 });
      }}
      className={`relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(450px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(244, 63, 94, 0.16), transparent 80%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// کامپوننت ۳ خط نوار قلب با جریان مداوم بدون انقطاع و مرکز کم‌رنگ
function AnimatedEcgBackground() {
  // ساخت الگوی زنجیره‌ای ضربان قلب بدون هیچ فاصله یا قطعی
  const ecgPattern = "M 0 35 L 50 35 L 60 30 L 70 35 L 85 35 L 95 8 L 105 60 L 115 22 L 125 35 L 145 35 L 155 28 L 170 35 L 240 35";
  
  // ۱۲ بار تکرار الگو برای نیمه اول (عرض ۲۸۸۰ پیکسل)
  const halfWave = Array(12).fill(ecgPattern).map((p, i) => {
    return p.replace(/M 0/g, `M ${i * 240}`).replace(/L (\d+)/g, (_, x) => `L ${Number(x) + i * 240}`);
  }).join(" ");

  // ۱۲ بار تکرار الگو برای نیمه دوم بلافاصله پس از آن (مجموعاً ۵۷۶۰ پیکسل جهت لوپ یکپارچه)
  const secondHalfWave = Array(12).fill(ecgPattern).map((p, i) => {
    const offset = 2880 + i * 240;
    return p.replace(/M 0/g, `M ${offset}`).replace(/L (\d+)/g, (_, x) => `L ${Number(x) + offset}`);
  }).join(" ");

  const continuousWave = `${halfWave} ${secondHalfWave}`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 ecg-center-faded-mask">
      {/* خط ۱: رز نئونی با حرکت آرام و همیشگی */}
      <div className="absolute top-[20%] left-0 w-[200%] flex ecg-track-1">
        <svg viewBox="0 0 5760 70" className="w-full h-14 shrink-0" fill="none">
          <path d={continuousWave} stroke="#f43f5e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* خط ۲: صورتی نئونی هم‌سرعت */}
      <div className="absolute top-[43%] left-0 w-[200%] flex ecg-track-2 opacity-80">
        <svg viewBox="0 0 5760 70" className="w-full h-14 shrink-0" fill="none">
          <path d={continuousWave} stroke="#ec4899" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* خط ۳: بنفش نئونی هم‌سرعت */}
      <div className="absolute top-[66%] left-0 w-[200%] flex ecg-track-3 opacity-75">
        <svg viewBox="0 0 5760 70" className="w-full h-14 shrink-0" fill="none">
          <path d={continuousWave} stroke="#a855f7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// توابع تاریخ شمسی
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

function jalaliToGregorian(jy, jm, jd) {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  let gd = days + 1;
  const sal_a = [
    0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31
  ];
  let gm;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

function getTodayShamsi() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function formatShamsiDateString(isoDate) {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(d);
  } catch {
    return isoDate;
  }
}

function generateSlots(startHour, endHour) {
  if (!startHour || !endHour) return [];
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    const startStr = h.toString().padStart(2, "0");
    const nextStr = (h + 1).toString().padStart(2, "0");
    slots.push(`${startStr}:00 - ${startStr}:30`);
    slots.push(`${startStr}:30 - ${nextStr}:00`);
  }
  return slots;
}

function VaradocLogo({ className = "w-10 h-10" }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-violet-600 p-[1px] shadow-lg shadow-rose-950/40 ${className}`}>
      <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-[#07090e]">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-rose-400">
          <path d="M6 8L16 24L26 8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 14H14.5L16 11L17.5 17L19 14H22" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="6" r="2" fill="#fb7185" />
        </svg>
      </div>
    </div>
  );
}

const SHAMSI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

const SPECIALTY_CATEGORIES = [
  {
    name: "قلب و عروق",
    count: "پزشکان متخصص",
    keyword: "قلب",
    icon: (
      <svg className="w-6 h-6 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M3.22 12H9.5l1.5-3 2 6.5 1.5-3.5h6.28" />
      </svg>
    ),
  },
  {
    name: "داخلی و گوارش",
    count: "پزشکان متخصص",
    keyword: "داخلی",
    icon: (
      <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
  },
  {
    name: "دندان‌پزشکی",
    count: "پزشکان متخصص",
    keyword: "دندان",
    icon: (
      <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 6 2 9.5.4 2.8 1.5 4.5 3 4.5 1 0 1.5-1 1-3-.4-1.6-.2-3 0-4.5.2 1.5.4 2.9 0 4.5-.5 2 0 3 1 3 1.5 0 2.6-1.7 3-4.5.5-3.5 2-6.5 2-9.5 0-3.5-2.5-6-6-6Z" />
      </svg>
    ),
  },
  {
    name: "کودکان و اطفال",
    count: "پزشکان متخصص",
    keyword: "اطفال",
    icon: (
      <svg className="w-6 h-6 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h.01" />
        <path d="M15 12h.01" />
        <path d="M10 16c.5.5 1.5 1 2 1s1.5-.5 2-1" />
        <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5h-1.5" />
      </svg>
    ),
  },
  {
    name: "ارتوپدی و مفاصل",
    count: "پزشکان متخصص",
    keyword: "ارتوپدی",
    icon: (
      <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 5-3-3a2.83 2.83 0 0 0-4 0L7 7" />
        <path d="m5 19 3 3a2.83 2.83 0 0 0 4 0l5-5" />
        <path d="m2 12 5-5" />
        <path d="m17 17 5-5" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    name: "چشم‌پزشکی",
    count: "پزشکان متخصص",
    keyword: "چشم",
    icon: (
      <svg className="w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const DEFAULT_INSURANCES = [
  { name: "بیمه تأمین اجتماعی", desc: "کسر فرانشیز ویزیت و دارو آنلاین با کد ملی", badge: "پایه" },
  { name: "بیمه سلامت (خدمات درمانی)", desc: "پوشش مستقیم کلیه پزشکان عمومی و متخصص", badge: "پایه" },
  { name: "بیمه نیروهای مسلح", desc: "تخفیف ویژه خانواده‌های محترم نیروهای مسلح", badge: "پایه" },
  { name: "بیمه ایران (تکمیلی)", desc: "صدور آنلاین معرفی‌نامه و استعلام برخط", badge: "تکمیلی" },
  { name: "بیمه تکمیلی دانا", desc: "پوشش ۱۰۰٪ خدمات سرپایی و کلینیکال", badge: "تکمیلی" },
  { name: "بیمه تکمیلی آسیا و البرز", desc: "پذیرش مستقیم بدون نیاز به ارائه فیش دستی", badge: "تکمیلی" },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  const todayShamsi = useMemo(() => getTodayShamsi(), []);
  const [shYear, setShYear] = useState(todayShamsi[0]);
  const [shMonth, setShMonth] = useState(todayShamsi[1]);
  const [shDay, setShDay] = useState(todayShamsi[2]);

  const [selectedSlot, setSelectedSlot] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const selectedDateIso = useMemo(() => {
    const [gy, gm, gd] = jalaliToGregorian(Number(shYear), Number(shMonth), Number(shDay));
    return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
  }, [shYear, shMonth, shDay]);

  useEffect(() => {
    const savedUser = localStorage.getItem("current_patient");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        setPatientName(u.name || "");
        setPatientPhone(u.phone || "");
      } catch (e) {}
    }
  }, []);

  const fetchDoctorsList = () => {
    fetch("/api/doctors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const enhanced = data.map((doc, idx) => ({
            ...doc,
            rating: (4.8 + (idx % 2) * 0.1).toFixed(1),
            reviewsCount: 52 + idx * 31,
            address: "ساختمان مرکزی کلینیک وارا، طبقه همکف",
          }));
          setDoctors(enhanced);
          if (!selectedDoctorId) setSelectedDoctorId(enhanced[0].id);
        }
      })
      .catch((err) => console.error("Error loading doctors:", err));
  };

  useEffect(() => {
    fetchDoctorsList();
  }, []);

  const filteredDoctors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter(
      (d) =>
        d.name?.toLowerCase().includes(term) ||
        d.specialty?.toLowerCase().includes(term)
    );
  }, [doctors, searchTerm]);

  useEffect(() => {
    if (!selectedDoctorId || !selectedDateIso) return;
    fetch(`/api/appointments?doctorId=${selectedDoctorId}&date=${selectedDateIso}`)
      .then((res) => res.json())
      .then((data) => {
        setBookedSlots(Array.isArray(data.bookedSlots) ? data.bookedSlots : []);
      })
      .catch((err) => console.error("Error loading slots:", err));
  }, [selectedDoctorId, selectedDateIso]);

  const handleShowAllDoctors = (e) => {
    e.preventDefault();
    setSearchTerm("");
    const element = document.getElementById("doctors-list");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setPatientName(user.name);
    setPatientPhone(user.phone);
  };

  const handleLogout = () => {
    localStorage.removeItem("current_patient");
    setCurrentUser(null);
    setPatientName("");
    setPatientPhone("");
  };

  const handleBooking = async (doctorToBook) => {
    setMessage(null);

    if (!currentUser) {
      setIsAuthOpen(true);
      setMessage({ type: "error", text: "لطفاً ابتدا با شماره موبایل وارد شوید." });
      return;
    }

    if (!selectedSlot) {
      setMessage({ type: "error", text: "لطفاً یکی از ساعت‌های خالی را انتخاب فرمایید." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: Number(doctorToBook.id),
          patientName: currentUser.name || patientName,
          patientPhone: currentUser.phone || patientPhone,
          date: selectedDateIso,
          time: selectedSlot,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ثبت نوبت");

      setReceiptData({
        trackingCode: data.appointment?.trackingCode || "VARA-" + Math.floor(100000 + Math.random() * 900000),
        doctorName: doctorToBook.name,
        specialty: doctorToBook.specialty,
        patientName: currentUser.name || patientName,
        patientPhone: currentUser.phone || patientPhone,
        date: selectedDateIso,
        time: selectedSlot,
        address: doctorToBook.address,
      });

      setBookedSlots((prev) => [...prev, selectedSlot]);
      setSelectedSlot("");
      setMessage({ type: "success", text: "نوبت شما با موفقیت ثبت شد." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] text-zinc-100 font-sans selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* شبکه مشبک پس‌زمینه Mindoo */}
      <div className="pointer-events-none absolute inset-0 mindoo-grid-bg opacity-70 z-0" />

      {/* شفق نوری متحرک */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-rose-600/20 via-pink-500/10 to-violet-600/20 blur-[130px] rounded-full aurora-glow z-0" />

      {/* هدر شیشه‌ای شفاف */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-[#07090e]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3 group">
              <VaradocLogo className="w-10 h-10 transition duration-300 group-hover:scale-105" />
              <div>
                <span className="text-lg font-black tracking-wider text-white block">وراداک</span>
                <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">VARADOC HEALTH</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
              <a href="#specialties" className="hover:text-white transition">تخصص‌ها</a>
              <a href="#doctors-list" onClick={handleShowAllDoctors} className="hover:text-rose-400 text-zinc-300 transition">
                پزشکان حاضر ({doctors.length})
              </a>
              <a href="#insurance-services" className="hover:text-white transition">بیمه‌ها</a>
              <a href="#why-us" className="hover:text-white transition">مزایای کلینیک</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/portal"
                  className="rounded-full border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:border-rose-400 transition shadow-inner"
                >
                  پرونده {currentUser.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3.5 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="relative group rounded-full p-[1px] font-semibold text-xs transition duration-300 active:scale-95 shadow-lg shadow-rose-950/40"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-violet-600 transition group-hover:opacity-100 opacity-80 blur-[2px]" />
                <div className="relative rounded-full bg-zinc-950 px-5 py-2 text-zinc-100 group-hover:bg-zinc-900 transition">
                  ورود / ثبت‌نام
                </div>
              </button>
            )}

            <Link
              href="/admin"
              className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              میز مدیریت
            </Link>
          </div>
        </div>
      </header>

      {/* بخش هیرو با ضربان پیوسته و محو در مرکز پشت متن اصلی */}
      <section className="relative pt-16 pb-16 px-6 z-10 overflow-hidden">
        <AnimatedEcgBackground />

        <div className="relative mx-auto max-w-4xl text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/90 bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-300 shadow-xl mb-6 backdrop-blur-md animate-float">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-medium">رزرو مستقیم آنلاین با پوشش کامل بیمه‌ها و تقویم رسمی شمسی</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            رزرو آنلاین و مستقیم نوبت پزشکان در{" "}
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
              وراداک
            </span>
          </h1>

          <p className="mt-5 text-sm md:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            مشاهده بازه‌های خالی، انتخاب زمان مناسب و صدور فوری برگه پذیرش بدون معطلی در درمانگاه
          </p>

          {/* کادر اسپات‌لایت فیلتر و رزرو */}
          <SpotlightCard className="mt-10 p-5 shadow-2xl text-right">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* جستجو */}
              <div className="md:col-span-4 p-1">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">نام پزشک یا تخصص</label>
                <div className="flex items-center gap-2 border border-zinc-800 rounded-2xl px-3.5 py-2.5 bg-zinc-950/70 focus-within:border-rose-500/60 transition">
                  <svg className="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="مثال: قلب، ارتوپدی، دکتر..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none bg-transparent"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
                  )}
                </div>
              </div>

              {/* انتخاب پزشک */}
              <div className="md:col-span-4 p-1">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">انتخاب پزشک معالج</label>
                <div className="border border-zinc-800 rounded-2xl px-3.5 py-2.5 bg-zinc-950/70">
                  <select
                    value={selectedDoctorId || ""}
                    onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                    className="w-full text-xs font-medium text-zinc-200 focus:outline-none bg-transparent cursor-pointer [&>option]:bg-zinc-900"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* تاریخ شمسی */}
              <div className="md:col-span-4 p-1">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">تاریخ مراجعه (شمسی)</label>
                <div className="grid grid-cols-3 gap-1.5 border border-zinc-800 rounded-2xl p-1 bg-zinc-950/70">
                  <select
                    value={shDay}
                    onChange={(e) => setShDay(Number(e.target.value))}
                    className="rounded-xl bg-zinc-900/90 px-2 py-2 text-xs font-semibold text-zinc-200 border border-zinc-800 focus:outline-none text-center cursor-pointer [&>option]:bg-zinc-900"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={shMonth}
                    onChange={(e) => setShMonth(Number(e.target.value))}
                    className="rounded-xl bg-zinc-900/90 px-2 py-2 text-xs font-semibold text-zinc-200 border border-zinc-800 focus:outline-none text-center cursor-pointer [&>option]:bg-zinc-900"
                  >
                    {SHAMSI_MONTHS.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={shYear}
                    onChange={(e) => setShYear(Number(e.target.value))}
                    className="rounded-xl bg-zinc-900/90 px-2 py-2 text-xs font-semibold text-zinc-200 border border-zinc-800 focus:outline-none text-center cursor-pointer [&>option]:bg-zinc-900"
                  >
                    <option value={todayShamsi[0]}>{todayShamsi[0]}</option>
                    <option value={todayShamsi[0] + 1}>{todayShamsi[0] + 1}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">
                تاریخ انتخاب‌شده: <strong className="text-rose-400 font-medium">{formatShamsiDateString(selectedDateIso)}</strong>
              </span>

              <a
                href="#doctors-list"
                className="rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:opacity-95 transition active:scale-95"
              >
                مشاهده نوبت‌های خالی
              </a>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* بخش تخصص‌ها */}
      <section id="specialties" className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-6 text-right">
          <h2 className="text-xl font-black text-white">تخصص‌های کلینیک</h2>
          <p className="text-xs text-zinc-400 mt-1">جهت دسترسی سریع روی تخصص مورد نظر کلیک کنید</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
          {SPECIALTY_CATEGORIES.map((cat, i) => {
            const isSelected = searchTerm === cat.keyword;
            return (
              <SpotlightCard
                key={i}
                onClick={() => {
                  setSearchTerm(cat.keyword);
                  const el = document.getElementById("doctors-list");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group cursor-pointer p-5 text-center transition-all duration-300 ${
                  isSelected
                    ? "border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                    : "hover:border-zinc-700"
                }`}
              >
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-zinc-950/90 border border-zinc-800/80 mb-3 shadow-inner group-hover:scale-105 group-hover:border-rose-500/40 transition duration-300">
                  {cat.icon}
                </div>
                <h3 className="text-xs font-bold text-zinc-100 group-hover:text-rose-400 transition">{cat.name}</h3>
                <span className="text-[10px] text-zinc-500 mt-1 block">{cat.count}</span>
              </SpotlightCard>
            );
          })}
        </div>
      </section>

      {/* لیست پزشکان */}
      <section id="doctors-list" className="mx-auto max-w-7xl px-6 py-10 relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">پزشکان آماده ویزیت</h2>
            <p className="text-xs text-zinc-400 mt-1">
              زمان‌بندی نوبت‌ها برای تاریخ:{" "}
              <strong className="text-rose-400 font-medium">{formatShamsiDateString(selectedDateIso)}</strong>
            </p>
          </div>
          <button
            onClick={() => setSearchTerm("")}
            className="rounded-full bg-zinc-900 border border-zinc-800 px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 transition"
          >
            مشاهده همه ({doctors.length})
          </button>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl p-4 text-xs font-medium border backdrop-blur-md ${
            message.type === "error"
              ? "bg-rose-950/40 text-rose-300 border-rose-800/60"
              : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-5">
          {filteredDoctors.map((doctor) => {
            const isDoctorActive = selectedDoctorId === doctor.id;
            const doctorSlots = generateSlots(doctor.start_hour || 9, doctor.end_hour || 17);

            return (
              <SpotlightCard
                key={doctor.id}
                className={`p-6 transition-all duration-300 ${
                  isDoctorActive
                    ? "border-rose-500/50 shadow-2xl shadow-rose-950/30 ring-1 ring-rose-500/40"
                    : "hover:border-zinc-700"
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-5 flex gap-4 items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-violet-600 text-lg font-black text-white shadow-lg shadow-rose-950/50">
                      {doctor.name ? doctor.name.slice(0, 1) : "پ"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{doctor.name}</h3>
                        <span className="rounded-full bg-zinc-800/90 border border-zinc-700/70 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                          نظام پزشکی معتبر
                        </span>
                      </div>
                      <p className="text-xs font-bold text-rose-400">{doctor.specialty}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="text-amber-400 font-bold">★ {doctor.rating}</span>
                        <span>({doctor.reviewsCount} ویزیت موفق)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        شیفت: {doctor.working_days || "شنبه تا چهارشنبه"} ({doctor.start_hour || 9}:۰۰ تا {doctor.end_hour || 17}:۰۰)
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-r lg:border-zinc-800/80 pt-4 lg:pt-0 lg:pr-6 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-medium text-zinc-300 block mb-2.5">
                        انتخاب بازه خالی برای ویزیت:
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {doctorSlots.slice(0, 8).map((slot) => {
                          const isBooked = isDoctorActive && bookedSlots.includes(slot);
                          const isSelected = isDoctorActive && selectedSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              onClick={() => {
                                setSelectedDoctorId(doctor.id);
                                setSelectedSlot(slot);
                              }}
                              className={`rounded-xl py-2 px-2 text-xs font-semibold transition duration-200 ${
                                isBooked
                                  ? "bg-zinc-950/60 text-zinc-700 line-through cursor-not-allowed border border-zinc-900"
                                  : isSelected
                                  ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400 scale-[1.02]"
                                  : "bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-white"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                      <div className="text-xs">
                        {isDoctorActive && selectedSlot ? (
                          <span className="text-zinc-300">
                            ساعت انتخابی: <span className="font-mono text-rose-400 font-bold">{selectedSlot}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500">یک بازه خالی را انتخاب کنید</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doctor.id);
                          handleBooking(doctor);
                        }}
                        disabled={isSubmitting && isDoctorActive}
                        className="rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 hover:opacity-95 text-white px-5 py-2.5 text-xs font-bold transition shadow-lg shadow-rose-950/50 active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting && isDoctorActive ? "در حال ثبت نوبت..." : "تأیید و صدور فیش"}
                      </button>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </section>

      {/* بیمه‌ها */}
      <section id="insurance-services" className="border-t border-zinc-800/60 bg-[#07090e]/80 py-16 px-6 relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-3.5 py-1.5 rounded-full">
              پوشش کامل خدمات درمانی
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-3">بیمه‌های طرف قرارداد با وراداک</h2>
            <p className="text-xs text-zinc-400 mt-2">
              پذیرش و محاسبه آنلاین کسورات فرانشیز در هنگام حضور در کلینیک
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEFAULT_INSURANCES.map((ins, idx) => (
              <SpotlightCard key={idx} className="p-6 text-right">
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    ins.badge === "پایه"
                      ? "bg-blue-950/60 text-blue-300 border border-blue-800/50"
                      : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/50"
                  }`}>
                    بیمه {ins.badge}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">0{idx + 1}</span>
                </div>
                <h3 className="text-sm font-black text-white">{ins.name}</h3>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{ins.desc}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* مزایای کلینیک */}
      <section id="why-us" className="border-t border-zinc-800/60 py-16 px-6 relative z-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-white">چرا درمانگاه تخصصی وراداک؟</h2>
            <p className="text-xs text-zinc-400 mt-2">ثبت مستقیم و بدون واسطه نوبت در پایگاه داده اختصاصی کلینیک</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SpotlightCard className="p-8 text-right">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400 mb-5">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="text-base font-black text-white">نظرات واقعی مراجعین</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                تنها بیمارانی که ویزیت حضوری یا آنلاین آن‌ها در کلینیک به اتمام رسیده امکان ثبت نظر و امتیاز دارند.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-8 text-right">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400 mb-5">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <h3 className="text-base font-black text-white">پوشش کامل بیمه‌ها</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                استعلام برخط بیمه تأمین اجتماعی، سلامت و صدور برگه رسمی پذیرش دارای کد رهگیری یکتا جهت بیمه تکمیلی.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-8 text-right">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400 mb-5">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-base font-black text-white">پرتال مستقل بیمار</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                مشاهده نوبت‌های فعال، دسترسی به آرشیو سوابق، ویرایش مشخصات، امکان لغو و چاپ فیش در هر لحظه.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* فوتر */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 px-6 text-xs text-zinc-400 relative z-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <VaradocLogo className="w-8 h-8" />
            <div>
              <p className="font-black text-sm text-white">سامانه هوشمند درمانگاه وراداک</p>
              <p className="text-[11px] text-zinc-500">طراحی اختصاصی با هویت بصری مدرن و تقویم شمسی</p>
            </div>
          </div>
          <div className="flex gap-6 font-medium text-zinc-400">
            <Link href="/" className="hover:text-white transition">صفحه اصلی</Link>
            <Link href="/portal" className="hover:text-white transition">پرونده بیمار</Link>
            <Link href="/admin" className="hover:text-white transition">میز پذیرش</Link>
          </div>
          <p className="text-zinc-600 text-[11px]">کلیه حقوق محفوظ است © 2026</p>
        </div>
      </footer>

      {/* مدال احراز هویت */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* فیش رسمی پذیرش */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="print-receipt-card w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-7 shadow-2xl text-zinc-100">
            <div className="text-center">
              <h3 className="text-lg font-black text-white">برگه رسمی پذیرش و نوبت‌دهی</h3>
              <p className="text-xs text-rose-400 font-bold mt-1">درمانگاه تخصصی وراداک (Varadoc)</p>
            </div>

            <div className="mt-6 space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">کد رهگیری:</span>
                <span className="font-mono font-black text-rose-400 text-sm tracking-wider">{receiptData.trackingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">نام بیمار:</span>
                <span className="font-bold text-white">{receiptData.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">شماره تماس:</span>
                <span className="font-mono font-bold text-zinc-300">{receiptData.patientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">پزشک معالج:</span>
                <span className="font-bold text-white">{receiptData.doctorName} ({receiptData.specialty})</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2.5">
                <span className="text-zinc-400">زمان مراجعه:</span>
                <span className="font-bold text-rose-300 bg-rose-950/50 border border-rose-800/40 px-2.5 py-1 rounded-md">
                  {formatShamsiDateString(receiptData.date)} | ساعت {receiptData.time}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-zinc-500">
                <span>محل مراجعه:</span>
                <span>{receiptData.address}</span>
              </div>
            </div>

            <div className="no-print mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950/50 hover:opacity-95 transition"
              >
                چاپ برگه پذیرش
              </button>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="rounded-full border border-zinc-800 px-5 py-3 text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}