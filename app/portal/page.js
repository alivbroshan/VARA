"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import AuthModal from "../AuthModal";

function toShamsiDateString(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function VaradocLogo({ className = "w-9 h-9" }) {
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-violet-600 p-[1px] shadow-lg shadow-rose-950/40 text-white ${className}`}>
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

const INSURANCE_LIST = [
  "آزاد (بدون بیمه)",
  "بیمه تأمین اجتماعی",
  "بیمه سلامت (خدمات درمانی)",
  "بیمه نیروهای مسلح",
  "بیمه ایران (تکمیلی)",
  "بیمه دانا (تکمیلی)",
  "بیمه آسیا (تکمیلی)",
  "بیمه البرز (تکمیلی)",
];

function renderStatusBadge(status) {
  switch (status) {
    case "completed":
      return (
        <span className="portal-badge-completed inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          ویزیت تکمیل شد
        </span>
      );
    case "admitted":
      return (
        <span className="portal-badge-admitted inline-flex items-center gap-1.5 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          پذیرش در کلینیک
        </span>
      );
    case "no_show":
      return (
        <span className="portal-badge-noshow inline-flex items-center gap-1.5 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-purple-500"></span>
          غیبت بیمار (No-Show)
        </span>
      );
    case "cancelled_by_patient":
    case "cancelled":
      return (
        <span className="portal-badge-patient-cancel inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-700/80 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
          لغو شده توسط شما
        </span>
      );
    case "cancelled_by_clinic":
      return (
        <span className="portal-badge-clinic-cancel inline-flex items-center gap-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          لغو شده از طرف کلینیک
        </span>
      );
    case "confirmed":
    default:
      return (
        <span className="portal-badge-confirmed inline-flex items-center gap-1.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
          نوبت فعال (در انتظار مراجعه)
        </span>
      );
  }
}

export default function PatientPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  const [isDark, setIsDark] = useState(true);

  const [ratingModalApp, setRatingModalApp] = useState(null);
  const [selectedStars, setSelectedStars] = useState(5);
  const [ratedAppointments, setRatedAppointments] = useState({});

  const fileInputRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    nationalCode: "",
    insurance: "آزاد (بدون بیمه)",
    city: "",
    address: "",
    bloodType: "",
    emergencyContact: "",
    avatar: "",
  });

  useEffect(() => {
    const syncTheme = () => {
      const isLight = localStorage.getItem("varadoc_theme") === "light";
      setIsDark(!isLight);
      if (isLight) {
        document.body.classList.add("light-theme");
      } else {
        document.body.classList.remove("light-theme");
      }
    };
    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("current_patient");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setProfileForm({
          name: parsed.name || "",
          phone: parsed.phone || "",
          nationalCode: parsed.nationalCode || "",
          insurance: parsed.insurance || "آزاد (بدون بیمه)",
          city: parsed.city || "",
          address: parsed.address || "",
          bloodType: parsed.bloodType || "",
          emergencyContact: parsed.emergencyContact || "",
          avatar: parsed.avatar || "",
        });
      } catch (e) {
        setIsAuthOpen(true);
      }
    } else {
      setIsAuthOpen(true);
    }

    const savedRatings = localStorage.getItem("patient_doctor_ratings");
    if (savedRatings) {
      try {
        setRatedAppointments(JSON.parse(savedRatings));
      } catch (e) {}
    }
  }, []);

  const fetchAppointments = async (phone) => {
    if (!phone) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments?phone=${encodeURIComponent(phone)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.phone) {
      fetchAppointments(currentUser.phone);
    }
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setProfileForm((prev) => ({
      ...prev,
      name: user.name || "",
      phone: user.phone || "",
      avatar: user.avatar || "",
    }));
    setIsAuthOpen(false);
    fetchAppointments(user.phone);
  };

  const handleLogout = () => {
    localStorage.removeItem("current_patient");
    setCurrentUser(null);
    setAppointments([]);
    setIsAuthOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setActionMessage({ type: "error", text: "حجم تصویر نباید بیشتر از ۲ مگابایت باشد." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setProfileForm((prev) => ({ ...prev, avatar: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.phone.trim()) {
      setActionMessage({ type: "error", text: "نام و شماره تماس الزامی هستند." });
      return;
    }

    const updatedUser = {
      ...currentUser,
      ...profileForm,
    };

    localStorage.setItem("current_patient", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);

    setActionMessage({ type: "success", text: "مشخصات و تصویر پرونده با موفقیت ذخیره شد." });
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleCancelByPatient = async (trackingCode) => {
    if (!confirm("آیا از لغو این نوبت اطمینان دارید؟")) return;

    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode, status: "cancelled_by_patient" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در لغو نوبت");

      // ۱. ارسال سیگنال فوری به صفحات باز جهت آزادسازی آنی تایم
      localStorage.setItem("varadoc_last_cancellation", Date.now().toString());
      window.dispatchEvent(new Event("storage"));

      // ۲. به‌روزرسانی نوبت در پنل جاری
      setActionMessage({ type: "success", text: `نوبت با کد رهگیری ${trackingCode} لغو شد و ساعت آن مجدداً آزاد گردید.` });
      setAppointments((prev) =>
        prev.map((app) => (app.tracking_code === trackingCode ? { ...app, status: "cancelled_by_patient" } : app))
      );
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  const handleSubmitRating = () => {
    if (!ratingModalApp) return;

    const newRatings = {
      ...ratedAppointments,
      [ratingModalApp.tracking_code]: selectedStars,
    };

    setRatedAppointments(newRatings);
    localStorage.setItem("patient_doctor_ratings", JSON.stringify(newRatings));

    setActionMessage({
      type: "success",
      text: `امتیاز ${selectedStars} ستاره برای ویزیت با ${ratingModalApp.doctor_name || "پزشک معالج"} با موفقیت ثبت شد.`,
    });
    setRatingModalApp(null);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const upcoming = [];
    const past = [];

    appointments.forEach((app) => {
      const isClosed =
        app.status === "completed" ||
        app.status === "no_show" ||
        app.status === "cancelled" ||
        app.status === "cancelled_by_patient" ||
        app.status === "cancelled_by_clinic";

      if (!isClosed && app.date >= today) {
        upcoming.push(app);
      } else {
        past.push(app);
      }
    });

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  const displayedAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] font-sans text-zinc-100 antialiased selection:bg-rose-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 mindoo-grid-bg opacity-70 z-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-rose-600/20 via-pink-500/10 to-violet-600/20 blur-[130px] rounded-full aurora-glow z-0" />

      {/* هدر */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-[#07090e]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <VaradocLogo />
              <div>
                <span className="text-lg font-black text-white block">وراداک</span>
                <span className="text-[10px] font-bold text-rose-500 tracking-wider">پرونده آنلاین سلامت بیمار</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition shadow-sm"
            >
              رزرو نوبت جدید
            </Link>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="rounded-xl border border-rose-900/50 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/50 hover:text-white transition shadow-sm"
              >
                خروج از حساب
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 relative z-10">
        {currentUser ? (
          <div className="mb-8 rounded-3xl bg-zinc-900/50 p-6 shadow-2xl border border-zinc-800/80 backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-rose-400/50 bg-gradient-to-tr from-rose-600 via-pink-600 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-rose-950/30 shrink-0">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{currentUser.name ? currentUser.name.slice(0, 1) : "ب"}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-white">{currentUser.name}</h1>
                  <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300 shadow-sm">
                    {currentUser.insurance || "آزاد (بدون بیمه)"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-medium">
                  <span>شماره تماس: <strong className="font-mono text-zinc-200 font-bold">{currentUser.phone}</strong></span>
                  {currentUser.city && (
                    <>
                      <span>|</span>
                      <span>ساکن: <strong className="text-zinc-200 font-bold">{currentUser.city}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("profile")}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white shadow-sm transition"
              >
                ویرایش مشخصات و عکس پرونده ✎
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-3xl bg-zinc-900/50 p-8 text-center border border-zinc-800/80 backdrop-blur-xl shadow-2xl">
            <p className="text-sm font-bold text-zinc-300 mb-4">برای مشاهده نوبت‌ها و ویرایش اطلاعات وارد شوید.</p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:opacity-95 transition"
            >
              ورود با شماره موبایل
            </button>
          </div>
        )}

        {actionMessage && (
          <div className={`mb-6 rounded-2xl p-4 text-xs font-bold border backdrop-blur-md ${
            actionMessage.type === "error" ? "bg-rose-950/40 text-rose-300 border-rose-800/60" : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* نوار تب‌ها */}
        <div className="mb-6 flex border-b border-zinc-800/80 pb-3 gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "upcoming"
                ? "bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 text-white shadow-lg shadow-rose-950/40"
                : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            <span>نوبت‌های پیش‌رو و فعال</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "upcoming" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"
            }`}>
              {upcomingAppointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("past")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "past"
                ? "bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 text-white shadow-lg shadow-rose-950/40"
                : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            <span>آرشیو و سوابق گذشته</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "past" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"
            }`}>
              {pastAppointments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === "profile"
                ? "bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 text-white shadow-lg shadow-rose-950/40"
                : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            <span>مشخصات پرونده سلامت</span>
          </button>
        </div>

        {/* کادر مشخصات پرونده سلامت */}
        {activeTab === "profile" && (
          <div className="rounded-3xl bg-zinc-900/50 p-6 md:p-8 border border-zinc-800/80 backdrop-blur-xl shadow-2xl">
            <h2 className="text-base font-black text-white mb-2">اطلاعات هویتی و سلامت بیمار</h2>
            <p className="text-xs text-zinc-400 mb-6">این اطلاعات هنگام ثبت نوبت و صدور فیش‌های پذیرش به شکل خودکار استفاده می‌شوند.</p>

            <div className={`portal-avatar-box mb-8 p-4 rounded-2xl border shadow-sm flex items-center gap-4 ${
              isDark ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white"
            }`}>
              <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-rose-400 bg-gradient-to-tr from-rose-600 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt="پروفایل" className="h-full w-full object-cover" />
                ) : (
                  <span>{profileForm.name ? profileForm.name.slice(0, 1) : "ب"}</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition shadow-sm ${
                    isDark
                      ? "border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40"
                      : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  انتخاب تصویر پروفایل 📷
                </button>
                {profileForm.avatar && (
                  <button
                    type="button"
                    onClick={() => setProfileForm((prev) => ({ ...prev, avatar: "" }))}
                    className="mr-2 text-xs text-zinc-400 hover:text-rose-400 font-bold"
                  >
                    حذف تصویر
                  </button>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">فرمت‌های مجاز: JPG یا PNG (حداکثر ۲ مگابایت)</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">نام و نام خانوادگی بیمار</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                  placeholder="مثال: علی رضایی"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">شماره تلفن همراه</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                  placeholder="09123456789"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">کد ملی</label>
                <input
                  type="text"
                  value={profileForm.nationalCode}
                  onChange={(e) => setProfileForm({ ...profileForm, nationalCode: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                  placeholder="کد ملی ۱۰ رقمی"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">پوشش بیمه اصلی</label>
                <select
                  value={profileForm.insurance}
                  onChange={(e) => setProfileForm({ ...profileForm, insurance: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 focus:outline-none focus:border-rose-500 cursor-pointer [&>option]:bg-zinc-900"
                >
                  {INSURANCE_LIST.map((ins) => (
                    <option key={ins} value={ins}>{ins}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">گروه خونی</label>
                <select
                  value={profileForm.bloodType}
                  onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 focus:outline-none focus:border-rose-500 cursor-pointer [&>option]:bg-zinc-900"
                >
                  <option value="">نامشخص</option>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">شماره تماس اضطراری</label>
                <input
                  type="text"
                  value={profileForm.emergencyContact}
                  onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 font-mono focus:outline-none focus:border-rose-500"
                  placeholder="09121112233"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">شهر محل سکونت</label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                  placeholder="مثال: تهران"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1.5">آدرس دقیق</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                  placeholder="خیابان، پلاک، واحد..."
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 px-7 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:opacity-95 transition"
                >
                  ذخیره تغییرات پرونده سلامت
                </button>
              </div>
            </form>
          </div>
        )}

        {/* لیست نوبت‌ها */}
        {activeTab !== "profile" && (
          <div>
            {isLoading ? (
              <div className="rounded-3xl bg-zinc-900/50 p-12 text-center border border-zinc-800/80 backdrop-blur-xl">
                <span className="text-xs font-bold text-zinc-400 animate-pulse">در حال فراخوانی نوبت‌های ثبت‌شده...</span>
              </div>
            ) : displayedAppointments.length === 0 ? (
              <div className="rounded-3xl bg-zinc-900/50 p-12 text-center border border-zinc-800/80 backdrop-blur-xl">
                <p className="text-sm font-bold text-zinc-400 mb-4">
                  {activeTab === "upcoming" ? "نوبت فعالی در پیش‌رو ندارید." : "سابقه‌ای از نوبت‌های گذشته ثبت نشده است."}
                </p>
                {activeTab === "upcoming" && (
                  <Link
                    href="/"
                    className="inline-block rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 hover:opacity-95 transition"
                  >
                    رزرو نوبت جدید از پزشکان کلینیک
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {displayedAppointments.map((app) => {
                  const isCompleted = app.status === "completed";
                  const existingRating = ratedAppointments[app.tracking_code];

                  return (
                    <div
                      key={app.id || app.tracking_code}
                      className="rounded-3xl bg-zinc-900/50 p-6 shadow-xl border border-zinc-800/80 backdrop-blur-xl flex flex-col md:flex-row justify-between md:items-center gap-5 transition hover:border-zinc-700"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="portal-tracking-badge font-mono text-xs font-black text-rose-400 bg-rose-950/50 border border-rose-800/50 px-3 py-1 rounded-lg shadow-sm">
                            کد رهگیری: {app.tracking_code}
                          </span>
                          {renderStatusBadge(app.status)}

                          {isCompleted && existingRating && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-950/50 text-amber-300 border border-amber-700/60 px-2.5 py-1 text-[11px] font-bold shadow-sm">
                              ★ امتیاز شما: {existingRating} از ۵
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-white">
                          ویزیت با: {app.doctor_name || "پزشک متخصص"} {app.doctor_specialty && `(${app.doctor_specialty})`}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="font-bold text-zinc-300">
                            تاریخ مراجعه: <strong className="text-white font-black">{toShamsiDateString(app.date)}</strong>
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="font-bold text-zinc-300">
                            ساعت ویزیت: <strong className="font-mono text-rose-400 font-black text-sm">{app.time}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 border-zinc-800/60 pt-3 md:pt-0">
                        {isCompleted && (
                          <button
                            onClick={() => {
                              setSelectedStars(existingRating || 5);
                              setRatingModalApp(app);
                            }}
                            className="portal-rate-btn rounded-xl border border-amber-700/60 bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/40 transition shadow-sm flex items-center gap-1.5"
                          >
                            <span>★</span>
                            <span>{existingRating ? "ویرایش نظر و امتیاز" : "ثبت امتیاز پزشک"}</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedReceipt(app)}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition shadow-sm"
                        >
                          مشاهده و چاپ فیش
                        </button>

                        {activeTab === "upcoming" && (
                          <button
                            onClick={() => handleCancelByPatient(app.tracking_code)}
                            className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/40 transition shadow-sm"
                          >
                            لغو نوبت
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* مدال امتیازدهی */}
      {ratingModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-center">
            <h3 className="text-base font-black text-white">ثبت امتیاز و کیفیت ویزیت</h3>
            <p className="text-xs text-zinc-400 mt-1">
              پزشک معالج: <strong className="text-rose-400 font-bold">{ratingModalApp.doctor_name}</strong>
            </p>

            <div className="my-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  className={`text-3xl transition transform active:scale-125 ${
                    star <= selectedStars ? "text-amber-400 drop-shadow" : "text-zinc-700"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-zinc-300 mb-6">
              امتیاز انتخابی: {selectedStars} از ۵ ستاره
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitRating}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
              >
                ثبت قطعی امتیاز
              </button>
              <button
                type="button"
                onClick={() => setRatingModalApp(null)}
                className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مدال فیش */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="print-receipt-card w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-7 shadow-2xl text-zinc-100">
            <div className="text-center">
              <h3 className="text-lg font-black text-white">برگه رسمی پذیرش و نوبت‌دهی</h3>
              <p className="text-xs text-rose-400 font-bold mt-1">درمانگاه تخصصی وراداک (Varadoc)</p>
            </div>

            <div className="mt-6 space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 text-xs">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2.5">
                <span className="text-zinc-400">کد رهگیری:</span>
                <span className="font-mono font-black text-rose-400 text-sm tracking-wider">{selectedReceipt.tracking_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">نام بیمار:</span>
                <span className="font-bold text-white">{selectedReceipt.patient_name || currentUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">شماره تماس:</span>
                <span className="font-mono font-bold text-zinc-300">{selectedReceipt.patient_phone || currentUser?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">پزشک معالج:</span>
                <span className="font-bold text-white">{selectedReceipt.doctor_name || "پزشک متخصص"}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2.5">
                <span className="text-zinc-400">زمان مراجعه:</span>
                <span className="font-bold text-rose-300 bg-rose-950/50 border border-rose-800/40 px-2.5 py-1 rounded-md">
                  {toShamsiDateString(selectedReceipt.date)} | ساعت {selectedReceipt.time}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-zinc-500">
                <span>وضعیت نوبت:</span>
                <span>{selectedReceipt.status || "ثبت قطعی"}</span>
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
                onClick={() => setSelectedReceipt(null)}
                className="rounded-full border border-zinc-800 px-5 py-3 text-xs font-semibold text-zinc-400 hover:text-white transition"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </main>
  );
}