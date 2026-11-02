"use client";

import { useState } from "react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab,
          phone,
          name,
          nationalId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("current_patient", JSON.stringify(data.patient));
      onAuthSuccess(data.patient);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            ورود به حساب
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            ثبت‌نام بیمار جدید
          </button>
        </div>

        <div className="mt-6 text-center">
          <h3 className="text-lg font-black text-slate-900">
            {tab === "login" ? "ورود به سامانه درمانگاه" : "تشکیل پرونده و ثبت‌نام"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {tab === "login"
              ? "شماره موبایل خود را وارد کنید"
              : "مشخصات خود را جهت تشکیل پرونده وارد کنید"}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {tab === "register" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: علی محمدی"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  کد ملی (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="۱۰ رقم کد ملی"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              شماره تلفن همراه
            </label>
            <input
              type="tel"
              required
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "در حال پردازش..." : tab === "login" ? "ورود به حساب" : "ثبت اطلاعات و ورود"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 pt-2"
          >
            انصراف و بستن
          </button>
        </form>
      </div>
    </div>
  );
}