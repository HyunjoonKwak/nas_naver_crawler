import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from '@/components/SessionProvider';
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
    <html lang="ko" className="overflow-x-hidden">
      <body className="antialiased overflow-x-hidden max-w-full">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            // Default options
            className: '',
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            // Success
            success: {
              duration: 3000,
              style: {
                background: '#22c55e',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#22c55e',
              },
            },
            // Error
            error: {
              duration: 4000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            // Loading
            loading: {
              style: {
                background: '#3b82f6',
                color: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

