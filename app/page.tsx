"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // 이미 로그인한 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/home");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      showError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    const loadingToast = showLoading("로그인 중...");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      dismissToast(loadingToast);

      if (result?.error) {
        showError(result.error);
      } else if (result?.ok) {
        showSuccess("로그인 성공!");
        router.push("/home");
        router.refresh();
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Login error:", error);
      showError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Hero Section */}
          <div className="text-center">
            {/* Logo & Title */}
            <div className="mb-5">
              <div className="inline-block p-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl mb-3">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                부동산 인사이트
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-2 font-medium">
                실시간으로 움직이는 스마트 부동산 분석 시스템
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
                네이버 부동산의 매물 정보를 실시간으로 추적하고 분석하여 더 나은 투자 결정을 내리세요
              </p>
            </div>

            {/* Features - 6개 카드 (가로 1줄) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 max-w-5xl mx-auto">
              {/* 자동 크롤링 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">자동 크롤링</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  정기 자동 수집
                </p>
              </div>

              {/* 실시간 분석 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">실시간 분석</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  통계와 트렌드
                </p>
              </div>

              {/* 스마트 알림 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">스마트 알림</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  Discord 알림
                </p>
              </div>

              {/* 가격 추적 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">가격 추적</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  가격 히스토리
                </p>
              </div>

              {/* 커뮤니티 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">커뮤니티</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  정보 공유
                </p>
              </div>

              {/* 스케줄 관리 */}
              <div className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">스케줄 관리</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs">
                  자동 예약
                </p>
              </div>
            </div>
          </div>

          {/* Community Section - 축약 */}
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-5 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  커뮤니티
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  부동산 투자자들과 정보를 공유하세요
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">실시간 토론</p>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">검증된 정보</p>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">투자 노하우</p>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">시세 분석</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-center">
                로그인
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </button>
              </form>

              {/* 아이디/비밀번호 찾기 */}
              <div className="mt-3 flex justify-center gap-2 text-xs">
                <Link
                  href="/auth/find-email"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  아이디 찾기
                </Link>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <Link
                  href="/auth/reset-password"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  비밀번호 찾기
                </Link>
              </div>

              {/* 회원가입 링크 */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  계정이 없으신가요?{" "}
                  <Link
                    href="/auth/signup"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
                  >
                    회원가입
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 specialrisk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
