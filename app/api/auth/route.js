import { NextResponse } from "next/server";
import { registerPatient, loginPatient } from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, phone, name, nationalId } = body;

    // اعتبارسنجی شماره تماس
    if (!phone || !/^09\d{9}$/.test(phone.trim())) {
      return NextResponse.json(
        { error: "شماره موبایل نامعتبر است (باید ۱۱ رقم و با ۰۹ شروع شود)." },
        { status: 400 }
      );
    }

    // ۱. عملیات ورود بیمار قبلی
    if (action === "login") {
      const patient = loginPatient(phone);
      return NextResponse.json({ success: true, patient });
    }

    // ۲. عملیات ثبت‌نام بیمار جدید
    if (action === "register") {
      if (!name || name.trim().length < 3) {
        return NextResponse.json(
          { error: "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد." },
          { status: 400 }
        );
      }
      const newPatient = registerPatient({ name, phone, nationalId });
      return NextResponse.json({ success: true, patient: newPatient }, { status: 201 });
    }

    return NextResponse.json({ error: "عملیات ارسالی نامعتبر است." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}