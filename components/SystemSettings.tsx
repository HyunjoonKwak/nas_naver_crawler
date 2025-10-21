"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { showSuccess, showError } from "@/lib/toast";

type Theme = 'light' | 'dark' | 'system';

// Extended Session type helper
type ExtendedSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
    image?: string | null;
  };
};

export function SystemSettings() {
  const { data: session } = useSession();
  const extendedSession = session as ExtendedSession | null;
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // 사용자 설정 (향후 DB 저장 가능)
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [language, setLanguage] = useState("ko");

  useEffect(() => {
    setMounted(true);
    // LocalStorage에서 설정 로드
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    const savedLanguage = localStorage.getItem('language') || "ko";

    setTheme(savedTheme);
    setLanguage(savedLanguage);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      if (systemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    showSuccess(`테마가 ${newTheme === 'light' ? '라이트' : newTheme === 'dark' ? '다크' : '시스템'} 모드로 변경되었습니다`);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
    showSuccess(`언어가 ${newLang === 'ko' ? '한국어' : '영어'}로 변경되었습니다`);
  };

  if (!mounted) {
    return <div className="animate-pulse">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {/* 테마 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          테마 설정
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              theme === 'system'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            시스템
          </button>

          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            라이트
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            다크
          </button>
        </div>
      </div>

      {/* 언어 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          언어 설정
        </h3>

        <div className="flex gap-2">
          <button
            onClick={() => handleLanguageChange('ko')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              language === 'ko'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            한국어
          </button>

          <button
            onClick={() => handleLanguageChange('en')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              language === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            English
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          언어 변경 기능은 현재 개발 중입니다
        </div>
      </div>

      {/* 개인정보 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          계정 정보
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">이메일</span>
            <span className="text-gray-900 dark:text-white font-medium">{extendedSession?.user?.email}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">이름</span>
            <span className="text-gray-900 dark:text-white font-medium">{extendedSession?.user?.name}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">권한</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {extendedSession?.user?.role === 'ADMIN' ? '관리자' : extendedSession?.user?.role === 'FAMILY' ? '패밀리' : '게스트'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => showError('비밀번호 변경 기능은 개발 중입니다')}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md text-sm font-medium transition-colors"
          >
            비밀번호 변경
          </button>
        </div>
      </div>
    </div>
  );
}
