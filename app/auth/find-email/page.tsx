"use client";

import Link from "next/link";
import { useState } from "react";
import { showSuccess, showError } from "@/lib/toast";

export default function FindEmailPage() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("이름을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (data.success && data.email) {
        setFoundEmail(data.email);
        showSuccess("이메일을 찾았습니다!");
      } else {
        showError(data.error || "해당 이름으로 등록된 계정을 찾을 수 없습니다.");
      }
    } catch (error: any) {
      console.error("Find email error:", error);
      showError("이메일 찾기 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-block p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg"
            >
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              아이디 찾기
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              가입 시 등록한 이름을 입력해주세요
            </p>
          </div>

          {foundEmail ? (
            /* 결과 표시 */
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  회원님의 이메일은
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 break-all">
                  {foundEmail}
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all text-center shadow-lg"
                >
                  로그인하기
                </Link>
                <Link
                  href="/auth/reset-password"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-all text-center"
                >
                  비밀번호 찾기
                </Link>
              </div>
            </div>
          ) : (
            /* 입력 폼 */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    찾는 중...
                  </>
                ) : (
                  "이메일 찾기"
                )}
              </button>
            </form>
          )}

          {/* 링크 */}
          <div className="mt-6 flex justify-center gap-3 text-sm">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              로그인
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/auth/reset-password"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              비밀번호 찾기
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/auth/signup"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
