import "./globals.css";
import { Vazirmatn } from "next/font/google";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "درمانگاه تخصصی وراداک | سامانه نوبت‌دهی آنلاین",
  description: "سامانه رزرو آنلاین نوبت پزشکان متخصص و درمانگاه وراداک",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-[#fcfaf8] text-slate-900 antialiased font-sans selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}