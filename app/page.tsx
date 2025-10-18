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
        <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto min-h-[calc(100vh-8rem)]">

          {/* Left: Hero Section */}
          <div className="text-center lg:text-left">
            {/* Logo & Title */}
            <div className="mb-6">
              <div className="inline-block p-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl mb-4">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                부동산 인사이트
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-2">
                스마트한 부동산 정보 관리시스템
              </p>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-500 max-w-xl mx-auto lg:mx-0">
                관심 아파트 단지의 매물 정보를 자동으로 수집하고 분석하여
                효율적인 투자 결정을 도와드립니다
              </p>
            </div>

            {/* Features */}
            <div className="grid gap-2.5 max-w-xl mx-auto lg:mx-0">
              <div className="flex items-start gap-3 text-left p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">자동 크롤링</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    관심 단지 매물 정보를 정기적으로 자동 수집
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">실시간 분석</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    매매·전세·월세 매물의 통계와 트렌드 분석
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-left p-3 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">스마트 알림</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    조건 맞는 매물 등록 시 Discord로 즉시 알림
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 text-center">
                로그인
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@email.com"
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
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
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </button>
              </form>

              {/* 아이디/비밀번호 찾기 */}
              <div className="mt-4 flex justify-center gap-3 text-sm">
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
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © 2025 specialrisk. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
