import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { SessionProvider } from '@/components/SessionProvider';
import { Providers } from './providers';
import { validateEnv, logEnvInfo } from '@/lib/env';
import "./globals.css";

// 모든 페이지를 동적 렌더링으로 설정 (빌드 시 DB 접근 방지)
export const dynamic = 'force-dynamic';

// 환경 변수 검증 (서버 사이드)
if (typeof window === 'undefined') {
  validateEnv();
  logEnvInfo();
}

export const metadata: Metadata = {
  title: {
    default: "부동산 인사이트",
    template: "%s | 부동산 인사이트",
  },
  description: "스마트한 부동산 정보수집 관리시스템",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '부동산 인사이트',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark overflow-x-hidden">
      <body className="antialiased overflow-x-hidden max-w-full">
        <SessionProvider>
          <Providers>
            {children}
          </Providers>
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

