"use client";

import { useState, useEffect, useMemo } from "react";
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

function renderAdminStatusBadge(status) {
  switch (status) {
    case "completed":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">ویزیت شد</span>;
    case "admitted":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60">پذیرش‌شده در کلینیک</span>;
    case "no_show":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-800/60">غیبت بیمار (No-Show)</span>;
    case "cancelled_by_clinic":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60">لغو از طرف کلینیک</span>;
    case "cancelled_by_patient":
    case "cancelled":
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">لغو توسط بیمار</span>;
    case "confirmed":
    default:
      return <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">در انتظار پذیرش</span>;
  }
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // فیلتر تقویم شمسی برای ادمین
  const todaySh = useMemo(() => {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const [filterMode, setFilterMode] = useState("all"); // "all" | "today" | "custom_shamsi"
  const [adminYear, setAdminYear] = useState(todaySh[0]);
  const [adminMonth, setAdminMonth] = useState(todaySh[1]);
  const [adminDay, setAdminDay] = useState(todaySh[2]);

  const [actionMessage, setActionMessage] = useState(null);

  // پزشکان
  const [newDocName, setNewDocName] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState(PRESET_SPECIALTIES[0]);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [newDocStart, setNewDocStart] = useState(9);
  const [newDocEnd, setNewDocEnd] = useState(17);
  const [newDocDays, setNewDocDays] = useState("شنبه تا چهارشنبه");
  const [editingDoctor, setEditingDoctor] = useState(null);

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

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchAppointments(), fetchDoctors()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

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

  // محاسبه تاریخ میلادی فیلتر شمسی ادمین
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
    <main dir="rtl" className="min-h-screen bg-[#07090e] font-sans text-zinc-100 antialiased selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* مشبک و شفق نوری چرخان تم اصلی */}
      <div className="pointer-events-none absolute inset-0 mindoo-grid-bg opacity-70 z-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-rose-600/20 via-pink-500/10 to-violet-600/20 blur-[130px] rounded-full aurora-glow z-0" />

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

            {/* نوار جستجو و تنظیم تقویم شمسی برای ادمین */}
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-xl mb-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                
                {/* جستجو با کد رهگیری یا نام */}
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

                {/* فیلتر تاریخ تمام شمسی */}
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

                {/* وضعیت */}
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

            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-950/60 border-b border-zinc-800/80 text-zinc-400 font-bold">
                    <tr>
                      <th className="py-3.5 px-4">کد رهگیری</th>
                      <th className="py-3.5 px-4">نام بیمار</th>
                      <th className="py-3.5 px-4">شماره همراه</th>
                      <th className="py-3.5 px-4">پزشک</th>
                      <th className="py-3.5 px-4">تاریخ شمسی و ساعت</th>
                      <th className="py-3.5 px-4">وضعیت</th>
                      <th className="py-3.5 px-4 text-left">عملیات باجه</th>
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
                      filteredAppointments.map((app) => {
                        const isClosed = app.status === "completed" || app.status === "cancelled_by_clinic" || app.status === "cancelled_by_patient" || app.status === "no_show";

                        return (
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
                              <div className="flex items-center justify-end gap-1.5">
                                {app.status !== "admitted" && !isClosed && (
                                  <button
                                    onClick={() => handleUpdateStatus(app.tracking_code, "admitted")}
                                    className="rounded-lg bg-blue-950/60 border border-blue-800/60 px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:bg-blue-900/60 transition"
                                  >
                                    پذیرش
                                  </button>
                                )}
                                {!isClosed && (
                                  <button
                                    onClick={() => handleUpdateStatus(app.tracking_code, "completed")}
                                    className="rounded-lg bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 transition"
                                  >
                                    اتمام ویزیت
                                  </button>
                                )}
                                {!isClosed && (
                                  <button
                                    onClick={() => handleUpdateStatus(app.tracking_code, "no_show")}
                                    className="rounded-lg bg-purple-950/60 border border-purple-800/60 px-2.5 py-1 text-[11px] font-bold text-purple-300 hover:bg-purple-900/60 transition"
                                  >
                                    عدم حضور
                                  </button>
                                )}
                                {!isClosed && (
                                  <button
                                    onClick={() => handleUpdateStatus(app.tracking_code, "cancelled_by_clinic")}
                                    className="rounded-lg bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-900/60 transition"
                                  >
                                    لغو
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
                              className="w-1/2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-xs font-bold text-zinc-100 text-center font-mono focus:outline-none"
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
                              <span className="text-xs font-bold text-rose-300 bg-rose-950/50 px-2.5 py-0.5 rounded-md border border-rose-800/40">
                                {doc.specialty}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                              شیفت ویزیت: ساعت {doc.start_hour}:۰۰ الی {doc.end_hour}:۰۰ | {doc.working_days}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingDoctor(doc)}
                              className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-700 transition"
                            >
                              ویرایش ساعت و شیفت
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                              className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/40 hover:border-rose-400 transition"
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