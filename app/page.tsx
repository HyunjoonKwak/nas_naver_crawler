"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import {
  Home,
  Zap,
  BarChart3,
  Bell,
  DollarSign,
  MessageSquare,
  Clock
} from "lucide-react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalComplexes: 0,
    avgUpdateTime: "5분",
  });

  // 이미 로그인한 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/home");
    }
  }, [status, router]);

  // 실시간 통계 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/db-stats');
        const data = await response.json();

        setStats({
          totalArticles: data.articles?.total || 0,
          totalComplexes: data.complexes?.total || 0,
          avgUpdateTime: "5분", // 기본값
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

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
                <Home className="w-16 h-16 text-white" />
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

            {/* 실시간 통계 */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalArticles.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">등록 매물</div>
              </div>
              <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.totalComplexes.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">관리 단지</div>
              </div>
              <div className="text-center p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.avgUpdateTime}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">평균 업데이트</div>
              </div>
            </div>

            {/* Features - 3개 핵심 기능 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* 자동 크롤링 */}
              <div className="flex flex-col items-center text-center p-6 bg-white/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">자동 크롤링</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  정기적으로 자동 수집하여<br />최신 매물 정보를 제공합니다
                </p>
              </div>

              {/* 실시간 분석 */}
              <div className="flex flex-col items-center text-center p-6 bg-white/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">실시간 분석</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  가격 통계와 트렌드를<br />실시간으로 분석합니다
                </p>
              </div>

              {/* 가격 추적 */}
              <div className="flex flex-col items-center text-center p-6 bg-white/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">가격 추적</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  매물 가격의 변동 히스토리를<br />추적하고 비교합니다
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

              {/* 회원가입 CTA - 강화 */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  아직 회원이 아니신가요?
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  지금 가입하고 무료로 시작하세요
                </p>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center px-4 py-2.5 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400 rounded-lg font-bold text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                >
                  무료로 시작하기 →
                </Link>
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
