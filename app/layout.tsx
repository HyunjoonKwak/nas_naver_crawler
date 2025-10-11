import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "네이버 부동산 크롤러",
  description: "NAS 환경용 네이버 부동산 크롤링 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

