import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazir",
});

export const metadata = {
  title: "درمانگاه تخصصی وراداک | رزرو آنلاین نوبت",
  description: "سامانه هوشمند نوبت‌دهی و پرونده سلامت درمانگاه وراداک",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('varadoc_theme') === 'light') {
                  document.documentElement.classList.add('light-theme');
                  document.body.classList.add('light-theme');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}