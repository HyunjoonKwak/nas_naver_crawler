"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { showSuccess, showError } from "@/lib/toast";

type Theme = 'light' | 'dark' | 'system';

export function SystemSettings() {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // 사용자 설정 (향후 DB 저장 가능)
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [language, setLanguage] = useState("ko");

  useEffect(() => {
    setMounted(true);
    // LocalStorage에서 설정 로드
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    const savedWebhook = localStorage.getItem('webhookUrl') || "";
    const savedLanguage = localStorage.getItem('language') || "ko";

    setTheme(savedTheme);
    setWebhookUrl(savedWebhook);
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

  const handleWebhookSave = () => {
    localStorage.setItem('webhookUrl', webhookUrl);
    showSuccess("웹훅 URL이 저장되었습니다");
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
    <div className="space-y-6">
      {/* 다크모드 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎨</span>
            <span>테마 설정</span>
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            원하는 테마를 선택하세요. 시스템 설정을 따르거나 수동으로 선택할 수 있습니다.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 시스템 설정 */}
            <button
              onClick={() => handleThemeChange('system')}
              className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <svg
                className="w-10 h-10 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">시스템 설정</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">기기 설정 따라가기</div>
              </div>
              {theme === 'system' && (
                <div className="w-full py-1 bg-blue-500 text-white text-xs font-medium rounded">
                  현재 선택됨
                </div>
              )}
            </button>

            {/* 라이트 모드 */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                theme === 'light'
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <svg
                className="w-10 h-10 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">라이트 모드</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">밝은 테마</div>
              </div>
              {theme === 'light' && (
                <div className="w-full py-1 bg-yellow-500 text-white text-xs font-medium rounded">
                  현재 선택됨
                </div>
              )}
            </button>

            {/* 다크 모드 */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <svg
                className="w-10 h-10 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">다크 모드</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">어두운 테마</div>
              </div>
              {theme === 'dark' && (
                <div className="w-full py-1 bg-indigo-500 text-white text-xs font-medium rounded">
                  현재 선택됨
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 웹훅 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔗</span>
            <span>웹훅 설정</span>
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            크롤링 완료, 에러 발생 등의 이벤트를 웹훅으로 전송합니다.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              웹훅 URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-url.com/endpoint"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleWebhookSave}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                저장
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Slack, Discord, Teams 등의 웹훅 URL을 입력하세요
            </p>
          </div>
        </div>
      </div>

      {/* 언어 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🌍</span>
            <span>언어 설정</span>
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            표시 언어를 선택하세요
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleLanguageChange('ko')}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                language === 'ko'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-3xl">🇰🇷</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white">한국어</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Korean</div>
              </div>
              {language === 'ko' && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                language === 'en'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-3xl">🇺🇸</span>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900 dark:text-white">English</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">영어</div>
              </div>
              {language === 'en' && (
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ℹ️ 언어 변경 기능은 현재 개발 중입니다. 설정은 저장되지만 UI는 한국어로 표시됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 개인정보 설정 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔒</span>
            <span>개인정보 설정</span>
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">이메일</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {session?.user?.email}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">이름</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {session?.user?.name}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">권한</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {session?.user?.role === 'ADMIN' ? '관리자' : session?.user?.role === 'FAMILY' ? '패밀리' : '게스트'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => showError('비밀번호 변경 기능은 개발 중입니다')}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              비밀번호 변경
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
