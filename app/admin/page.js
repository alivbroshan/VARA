"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

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

function toShamsiShort(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

const SHAMSI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

function VaradocLogo({ className = "w-8 h-8" }) {
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

const PRESET_SPECIALTIES = [
  "متخصص قلب و عروق",
  "متخصص داخلی و گوارش",
  "دندان‌پزشک و جراح فک",
  "متخصص اطفال و کودکان",
  "متخصص ارتوپدی و مفاصل",
  "جراح و متخصص چشم‌پزشکی",
];

const STATUS_OPTIONS = [
  { value: "confirmed", label: "در انتظار پذیرش", color: "bg-amber-500" },
  { value: "admitted", label: "پذیرش در کلینیک", color: "bg-blue-500" },
  { value: "completed", label: "ویزیت تکمیل شد", color: "bg-emerald-500" },
  { value: "no_show", label: "غیبت بیمار (No-Show)", color: "bg-purple-500" },
  { value: "cancelled_by_clinic", label: "لغو از کلینیک", color: "bg-rose-500" },
  { value: "cancelled_by_patient", label: "لغو توسط بیمار", color: "bg-zinc-400" },
];

function renderAdminStatusBadge(status) {
  switch (status) {
    case "completed":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">ویزیت شد</span>;
    case "admitted":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60">پذیرش در کلینیک</span>;
    case "no_show":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60">غیبت بیمار</span>;
    case "cancelled_by_clinic":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">لغو از کلینیک</span>;
    case "cancelled_by_patient":
    case "cancelled":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800">لغو توسط بیمار</span>;
    case "confirmed":
    default:
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">در انتظار پذیرش</span>;
  }
}

function CustomStatusDropdown({ currentStatus, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeOption = STATUS_OPTIONS.find((o) => o.value === currentStatus) || STATUS_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/90 py-1.5 px-3 text-[11px] font-bold text-slate-800 dark:text-zinc-200 shadow-sm hover:border-rose-500/60 transition min-w-[145px]"
      >
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${activeOption.color}`} />
          {activeOption.label}
        </span>
        <svg className={`w-3.5 h-3.5 text-rose-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 w-44 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0f17] p-1.5 shadow-2xl backdrop-blur-xl">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                currentStatus === opt.value
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "text-slate-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${opt.color}`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // سیستم مدیریت اعلان‌ها
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const notifDropdownRef = useRef(null);
  const lastKnownNotifIdRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const todaySh = useMemo(() => {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const [filterMode, setFilterMode] = useState("all");
  const [adminYear, setAdminYear] = useState(todaySh[0]);
  const [adminMonth, setAdminMonth] = useState(todaySh[1]);
  const [adminDay, setAdminDay] = useState(todaySh[2]);

  const [actionMessage, setActionMessage] = useState(null);

  const [newDocName, setNewDocName] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState(PRESET_SPECIALTIES[0]);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [newDocStart, setNewDocStart] = useState(9);
  const [newDocEnd, setNewDocEnd] = useState(17);
  const [newDocDays, setNewDocDays] = useState("شنبه تا چهارشنبه");
  const [editingDoctor, setEditingDoctor] = useState(null);

  useEffect(() => {
    const syncTheme = () => {
      if (localStorage.getItem("varadoc_theme") === "light") {
        document.body.classList.add("light-theme");
      } else {
        document.body.classList.remove("light-theme");
      }
    };
    syncTheme();
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/doctors");
      const data = await res.json();
      if (res.ok) setDoctors(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (res.ok) {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadNotifCount(data.unreadCount || 0);

        if (notifs.length > 0) {
          const newest = notifs[0];
          if (lastKnownNotifIdRef.current !== null && newest.id > lastKnownNotifIdRef.current) {
            setToastNotification(newest);
            fetchAppointments();
            setTimeout(() => setToastNotification(null), 6000);
          }
          lastKnownNotifIdRef.current = newest.id;
        }
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchAppointments(), fetchDoctors(), fetchNotifications()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllNotifsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (trackingCode, newStatus) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در تغییر وضعیت");

      setAppointments((prev) =>
        prev.map((app) => (app.tracking_code === trackingCode ? { ...app, status: newStatus } : app))
      );
      setActionMessage({ type: "success", text: "وضعیت نوبت در سیستم تغییر یافت." });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    const finalSpecialty = selectedSpecialty === "custom" ? customSpecialty.trim() : selectedSpecialty;

    if (!newDocName.trim() || !finalSpecialty) {
      setActionMessage({ type: "error", text: "نام و تخصص پزشک الزامی است." });
      return;
    }

    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName.trim(),
          specialty: finalSpecialty,
          startHour: newDocStart,
          endHour: newDocEnd,
          workingDays: newDocDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در افزودن پزشک");

      setDoctors((prev) => [...prev, data.doctor]);
      setNewDocName("");
      setCustomSpecialty("");
      setActionMessage({ type: "success", text: `${data.doctor.name} با موفقیت اضافه شد.` });
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteDoctor = async (doctorId, doctorName) => {
    if (!confirm(`آیا از حذف «${doctorName}» از سیستم کلینیک مطمئن هستید؟`)) return;

    try {
      const res = await fetch(`/api/doctors?id=${doctorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در حذف پزشک");

      setDoctors((prev) => prev.filter((d) => d.id !== doctorId));
      setActionMessage({ type: "success", text: `پزشک «${doctorName}» حذف شد.` });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  const handleSaveDoctorEdit = async () => {
    if (!editingDoctor) return;

    try {
      const res = await fetch("/api/doctors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDoctor),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در ویرایش اطلاعات");

      setDoctors((prev) => prev.map((d) => (d.id === data.doctor.id ? data.doctor : d)));
      setEditingDoctor(null);
      setActionMessage({ type: "success", text: "ساعت کاری پزشک به‌روزرسانی شد." });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage({ type: "error", text: err.message });
    }
  };

  const adminTargetIso = useMemo(() => {
    if (filterMode === "today") {
      const now = new Date();
      return now.toISOString().split("T")[0];
    }
    if (filterMode === "custom_shamsi") {
      const [gy, gm, gd] = jalaliToGregorian(Number(adminYear), Number(adminMonth), Number(adminDay));
      return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    }
    return null;
  }, [filterMode, adminYear, adminMonth, adminDay]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchSearch =
        !searchTerm.trim() ||
        app.patient_name?.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        app.patient_phone?.includes(searchTerm.trim()) ||
        app.tracking_code?.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        app.doctor_name?.includes(searchTerm.trim());

      const matchStatus = statusFilter === "all" || app.status === statusFilter;
      const matchDate = !adminTargetIso || app.date === adminTargetIso;

      return matchSearch && matchStatus && matchDate;
    });
  }, [appointments, searchTerm, statusFilter, adminTargetIso]);

  const todayIso = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    return {
      total: appointments.length,
      todayCount: appointments.filter(
        (a) =>
          a.date === todayIso &&
          a.status !== "cancelled" &&
          a.status !== "cancelled_by_patient" &&
          a.status !== "cancelled_by_clinic"
      ).length,
      completed: appointments.filter((a) => a.status === "completed").length,
      noShow: appointments.filter((a) => a.status === "no_show").length,
    };
  }, [appointments, todayIso]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#07090e] font-sans text-zinc-100 antialiased selection:bg-rose-500 selection:text-white relative overflow-hidden transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 mindoo-grid-bg opacity-70 z-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-rose-600/20 via-pink-500/10 to-violet-600/20 blur-[130px] rounded-full aurora-glow z-0" />

      {/* پیام شناور (Toast) نوتیفیکیشن لحظه‌ای */}
      {toastNotification && (
        <div className="fixed top-20 left-6 z-50 animate-bounce max-w-sm rounded-2xl bg-zinc-900 border border-rose-500/60 p-4 shadow-2xl shadow-rose-950/60 backdrop-blur-2xl text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="text-xs font-black text-rose-400">نوبت جدید ثبت شد!</span>
            </div>
            <button onClick={() => setToastNotification(null)} className="text-zinc-500 hover:text-white text-xs">✕</button>
          </div>
          <p className="text-xs font-bold text-white mt-1.5">
            بیمار: <strong className="text-rose-300">{toastNotification.patient_name}</strong>
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            پزشک: {toastNotification.doctor_name} | ساعت {toastNotification.time}
          </p>
          <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
            <span className="font-mono text-rose-400">{toastNotification.tracking_code}</span>
            <span>همین الان</span>
          </div>
        </div>
      )}

      {/* هدر پنل ادمین */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-[#07090e]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <VaradocLogo />
              <div>
                <span className="text-base font-black text-white block">وراداک</span>
                <span className="text-[10px] font-black text-rose-400 tracking-wider">میز پذیرش درمانگاه</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* زنگوله اعلان با پاپ‌آپ کشویی */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (unreadNotifCount > 0) handleMarkAllNotifsRead();
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white hover:border-zinc-700 transition shadow-sm active:scale-95"
                title="اعلان نوبت‌های جدید"
              >
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-lg animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-zinc-800 bg-[#0c0f17]/95 p-3 shadow-2xl backdrop-blur-2xl z-50">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                    <span className="text-xs font-black text-white">اعلان‌های نوبت‌دهی آنلاین</span>
                    <button
                      onClick={handleMarkAllNotifsRead}
                      className="text-[10px] text-rose-400 hover:underline font-bold"
                    >
                      خواندن همه
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-zinc-500 font-bold">هیچ اعلانی ثبت نشده است.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`rounded-xl p-2.5 border transition text-right text-xs ${
                            n.is_read
                              ? "bg-zinc-950/40 border-zinc-800/60 text-zinc-400"
                              : "bg-rose-950/20 border-rose-800/50 text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{n.patient_name}</span>
                            <span className="font-mono text-[10px] text-rose-400 font-bold">{n.tracking_code}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            ویزیت با: {n.doctor_name} | ساعت: {n.time}
                          </p>
                          <span className="text-[9px] text-zinc-500 block mt-1">{toShamsiShort(n.date)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={refreshAll}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition shadow-sm"
            >
              به‌روزرسانی اطلاعات ↻
            </button>
            <Link
              href="/"
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm border border-zinc-700"
            >
              صفحه اصلی سایت
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-6 flex border-b border-zinc-800/80 pb-3 gap-3">
          <button
            onClick={() => setActiveTab("appointments")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
              activeTab === "appointments" ? "bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 text-white shadow-lg shadow-rose-950/40" : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            میز پذیرش و نوبت‌ها
          </button>
          <button
            onClick={() => setActiveTab("doctors")}
            className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
              activeTab === "doctors" ? "bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 text-white shadow-lg shadow-rose-950/40" : "bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
            }`}
          >
            مدیریت پزشکان و ساعت کاری ({doctors.length})
          </button>
        </div>

        {actionMessage && (
          <div className={`mb-6 rounded-2xl p-4 text-xs font-bold border backdrop-blur-md ${
            actionMessage.type === "error" ? "bg-rose-950/40 text-rose-300 border-rose-800/60" : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
          }`}>
            {actionMessage.text}
          </div>
        )}

        {activeTab === "appointments" && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-bold text-zinc-400">کل نوبت‌های ثبت‌شده</span>
                <p className="text-2xl font-black text-white mt-1 font-mono">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-rose-800/50 bg-rose-950/40 p-5 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-bold text-rose-300">
                  نوبت‌های امروز ({toShamsiShort(todayIso)})
                </span>
                <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{stats.todayCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/40 p-5 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-bold text-emerald-300">ویزیت‌های انجام‌شده</span>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{stats.completed}</p>
              </div>
              <div className="rounded-2xl border border-purple-800/50 bg-purple-950/40 p-5 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-bold text-purple-300">غیبت بیمار (No-Show)</span>
                <p className="text-2xl font-black text-purple-400 mt-1 font-mono">{stats.noShow}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-xl mb-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">کد پیگیری، نام یا شماره بیمار</label>
                  <input
                    type="text"
                    placeholder="مثال: VARA-849201 یا 0912..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60"
                  />
                </div>

                <div className="md:col-span-5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-bold text-zinc-400">تنظیم تاریخ شمسی</label>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setFilterMode("today")}
                        className={`px-2 py-0.5 rounded font-bold ${filterMode === "today" ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
                      >
                        امروز
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode("custom_shamsi")}
                        className={`px-2 py-0.5 rounded font-bold ${filterMode === "custom_shamsi" ? "bg-gradient-to-r from-rose-600 to-pink-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
                      >
                        انتخاب روز
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode("all")}
                        className={`px-2 py-0.5 rounded font-bold ${filterMode === "all" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400"}`}
                      >
                        همه تاریخ‌ها
                      </button>
                    </div>
                  </div>

                  {filterMode === "custom_shamsi" ? (
                    <div className="grid grid-cols-3 gap-1 border border-zinc-800 rounded-xl p-1 bg-zinc-950/80">
                      <select
                        value={adminDay}
                        onChange={(e) => setAdminDay(Number(e.target.value))}
                        className="rounded-lg bg-zinc-900 p-1 text-xs font-bold text-center border border-zinc-800 text-zinc-200 [&>option]:bg-zinc-900"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <select
                        value={adminMonth}
                        onChange={(e) => setAdminMonth(Number(e.target.value))}
                        className="rounded-lg bg-zinc-900 p-1 text-xs font-bold text-center border border-zinc-800 text-zinc-200 [&>option]:bg-zinc-900"
                      >
                        {SHAMSI_MONTHS.map((m, idx) => (
                          <option key={idx + 1} value={idx + 1}>{m}</option>
                        ))}
                      </select>

                      <select
                        value={adminYear}
                        onChange={(e) => setAdminYear(Number(e.target.value))}
                        className="rounded-lg bg-zinc-900 p-1 text-xs font-bold text-center border border-zinc-800 text-zinc-200 [&>option]:bg-zinc-900"
                      >
                        <option value={todaySh[0]}>{todaySh[0]}</option>
                        <option value={todaySh[0] + 1}>{todaySh[0] + 1}</option>
                      </select>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-300 text-center">
                      {filterMode === "today" ? `نوبت‌های امروز: ${toShamsiDateString(todayIso)}` : "نمایش تمام نوبت‌های ثبت‌شده کلینیک"}
                    </div>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">وضعیت نوبت</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-rose-500/60 [&>option]:bg-zinc-900"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="confirmed">در انتظار پذیرش</option>
                    <option value="admitted">پذیرش‌شده در کلینیک</option>
                    <option value="completed">ویزیت انجام شد</option>
                    <option value="no_show">غیبت بیمار</option>
                    <option value="cancelled_by_clinic">لغو از طرف کلینیک</option>
                    <option value="cancelled_by_patient">لغو توسط خود بیمار</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 overflow-visible shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-zinc-400 font-bold">
                    <tr>
                      <th className="py-3.5 px-4">کد رهگیری</th>
                      <th className="py-3.5 px-4">نام بیمار</th>
                      <th className="py-3.5 px-4">شماره همراه</th>
                      <th className="py-3.5 px-4">پزشک</th>
                      <th className="py-3.5 px-4">تاریخ شمسی و ساعت</th>
                      <th className="py-3.5 px-4">وضعیت جاری</th>
                      <th className="py-3.5 px-4 text-left">تغییر وضعیت نوبت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold">در حال بارگذاری اطلاعات...</td>
                      </tr>
                    ) : filteredAppointments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-bold">هیچ نوبتی با شرایط مشخص‌شده پیدا نشد.</td>
                      </tr>
                    ) : (
                      filteredAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3.5 px-4 font-mono font-black text-rose-400">{app.tracking_code || `VARA-${app.id}`}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{app.patient_name}</td>
                          <td className="py-3.5 px-4 font-mono text-zinc-300">{app.patient_phone}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-zinc-200 block">{app.doctor_name}</span>
                            <span className="text-[10px] text-zinc-500">{app.doctor_specialty}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-zinc-200 block">{toShamsiShort(app.date)}</span>
                            <span className="text-[11px] text-rose-400 font-mono font-bold">{app.time}</span>
                          </td>
                          <td className="py-3.5 px-4">{renderAdminStatusBadge(app.status)}</td>
                          <td className="py-3.5 px-4 text-left">
                            <CustomStatusDropdown
                              currentStatus={app.status || "confirmed"}
                              onSelect={(newStatus) => handleUpdateStatus(app.tracking_code, newStatus)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "doctors" && (
          <div className="space-y-8">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-black text-white mb-4">افزودن پزشک متخصص به درمانگاه</h3>
              <form onSubmit={handleCreateDoctor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">نام کامل پزشک</label>
                    <input
                      type="text"
                      placeholder="مثال: دکتر مهدی رحیمی"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">تخصص پزشک</label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-200 focus:outline-none focus:border-rose-500/60 [&>option]:bg-zinc-900"
                    >
                      {PRESET_SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                      <option value="custom">سایر تخصص‌ها (تایپ دستی)...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">ساعت شروع و پایان ویزیت</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={7}
                        max={22}
                        value={newDocStart}
                        onChange={(e) => setNewDocStart(e.target.value)}
                        className="w-1/2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-xs font-bold text-zinc-100 text-center focus:outline-none font-mono"
                      />
                      <span className="text-zinc-500 text-xs">تا</span>
                      <input
                        type="number"
                        min={8}
                        max={23}
                        value={newDocEnd}
                        onChange={(e) => setNewDocEnd(e.target.value)}
                        className="w-1/2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-xs font-bold text-zinc-100 text-center focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">روزهای حضور</label>
                    <input
                      type="text"
                      value={newDocDays}
                      onChange={(e) => setNewDocDays(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/60"
                    />
                  </div>
                </div>

                {selectedSpecialty === "custom" && (
                  <div className="max-w-md">
                    <label className="block text-[11px] font-bold text-rose-400 mb-1">عنوان تخصص سفارشی:</label>
                    <input
                      type="text"
                      placeholder="مثال: متخصص مغز و اعصاب"
                      value={customSpecialty}
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                      className="w-full rounded-xl border border-rose-500/40 px-3 py-2 text-xs font-bold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-400 bg-rose-950/20"
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 hover:opacity-95 text-white px-6 py-2.5 text-xs font-bold transition shadow-lg shadow-rose-950/40 active:scale-95"
                  >
                    ثبت پزشک در درمانگاه
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="p-5 border-b border-zinc-800/80 flex justify-between items-center">
                <h3 className="text-sm font-black text-white">پزشکان فعال و شیفت‌های کاری</h3>
                <span className="text-xs text-zinc-400 font-bold">{doctors.length} پزشک طرف قرارداد</span>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {doctors.map((doc) => {
                  const isEditing = editingDoctor?.id === doc.id;

                  return (
                    <div key={doc.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                          <input
                            type="text"
                            value={editingDoctor.name}
                            onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-xs font-bold text-zinc-100 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editingDoctor.specialty}
                            onChange={(e) => setEditingDoctor({ ...editingDoctor, specialty: e.target.value })}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-xs font-bold text-zinc-100 focus:outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editingDoctor.start_hour}
                              onChange={(e) => setEditingDoctor({ ...editingDoctor, start_hour: e.target.value })}
                              className="w-1/2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-xs font-bold text-zinc-100 text-center font-mono focus:outline-none"
                            />
                            <span className="text-xs text-zinc-500">تا</span>
                            <input
                              type="number"
                              value={editingDoctor.end_hour}
                              onChange={(e) => setEditingDoctor({ ...editingDoctor, end_hour: e.target.value })}
                              className="w-1/2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-2 text-xs font-bold text-zinc-100 text-center font-mono focus:outline-none"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveDoctorEdit}
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition"
                            >
                              ذخیره
                            </button>
                            <button
                              onClick={() => setEditingDoctor(null)}
                              className="rounded-xl border border-zinc-800 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 transition"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-white">{doc.name}</span>
                              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-3 py-1 rounded-lg border border-rose-300 dark:border-rose-800/60 shadow-sm">
                                {doc.specialty}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium mt-1.5">
                              شیفت ویزیت: ساعت {doc.start_hour}:۰۰ الی {doc.end_hour}:۰۰ | {doc.working_days}
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => setEditingDoctor(doc)}
                              className="rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm transition"
                            >
                              ویرایش ساعت و شیفت
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                              className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white shadow-sm transition"
                            >
                              حذف پزشک
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}