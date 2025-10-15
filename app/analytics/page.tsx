"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { useCrawlEvents } from "@/hooks/useCrawlEvents";
import { SingleAnalysis } from "./SingleAnalysis";
import { CompareAnalysis } from "./CompareAnalysis";

interface Complex {
  complexNo: string;
  complexName: string;
}

export default function AnalyticsPage() {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>("");
  const [selectedComplexes, setSelectedComplexes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // SSE: 크롤링 완료 시 자동 갱신
  useCrawlEvents(() => {
    console.log('[ANALYTICS] Crawl complete, refreshing data...');
    if (mode === 'single' && selectedComplex) {
      fetchAnalytics();
    } else if (mode === 'compare' && selectedComplexes.length >= 2) {
      fetchAnalytics();
    }
  });

  useEffect(() => {
    fetchComplexes();
  }, []);

  const fetchComplexes = async () => {
    try {
      // 즐겨찾기 단지 목록 조회
      const favResponse = await fetch("/api/favorites");
      const favData = await favResponse.json();
      const favoriteComplexes = favData.favorites || [];

      // 단지 상세 정보 조회
      const complexResponse = await fetch("/api/results");
      const complexData = await complexResponse.json();
      const results = complexData.results || [];

      const complexList = favoriteComplexes.map((fav: any) => {
        const result = results.find((r: any) => r.overview?.complexNo === fav.complexNo);
        return {
          complexNo: fav.complexNo,
          complexName: result?.overview?.complexName || fav.complexName || `단지 ${fav.complexNo}`,
        };
      });

      setComplexes(complexList);
    } catch (error) {
      console.error('[ANALYTICS] Failed to fetch complexes:', error);
      showError('단지 목록 조회 실패');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      let complexNos = "";
      if (mode === "single") {
        if (!selectedComplex) {
          showError('단지를 선택해주세요');
          setLoading(false);
          return;
        }
        complexNos = selectedComplex;
      } else {
        if (selectedComplexes.length < 2) {
          showError('비교할 단지를 2개 이상 선택해주세요');
          setLoading(false);
          return;
        }
        complexNos = selectedComplexes.join(',');
      }

      const response = await fetch(
        `/api/analytics?complexNos=${complexNos}&mode=${mode}`
      );
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data);
        showSuccess('분석 완료');
      } else {
        showError(data.error || '분석 실패');
        setAnalyticsData(null);
      }
    } catch (error) {
      console.error('[ANALYTICS] Error:', error);
      showError('분석 중 오류 발생');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleComplexToggle = (complexNo: string) => {
    setSelectedComplexes((prev) => {
      if (prev.includes(complexNo)) {
        return prev.filter((c) => c !== complexNo);
      } else {
        if (prev.length >= 5) {
          showError('최대 5개까지 선택 가능합니다');
          return prev;
        }
        return [...prev, complexNo];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 네비게이션 */}
      <nav className="bg-white dark:bg-gray-950 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
                네이버 부동산 크롤러
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  홈
                </Link>
                <Link
                  href="/complexes"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  단지 목록
                </Link>
                <Link
                  href="/analytics"
                  className="text-blue-600 dark:text-blue-400 px-3 py-2 rounded-md text-sm font-medium bg-blue-50 dark:bg-blue-900/20"
                >
                  데이터 분석
                </Link>
                <Link
                  href="/scheduler"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  스케줄 관리
                </Link>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">데이터 분석</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            단지별 매물 데이터를 시각화하고 비교 분석합니다
          </p>
        </div>

        {/* 모드 선택 탭 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => {
                setMode("single");
                setAnalyticsData(null);
              }}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                mode === "single"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              📊 단일 단지 분석
            </button>
            <button
              onClick={() => {
                setMode("compare");
                setAnalyticsData(null);
              }}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                mode === "compare"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              🔄 단지 비교
            </button>
          </div>

          {/* 단일 단지 선택 */}
          {mode === "single" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                분석할 단지 선택
              </label>
              <select
                value={selectedComplex}
                onChange={(e) => setSelectedComplex(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- 단지를 선택하세요 --</option>
                {complexes.map((complex) => (
                  <option key={complex.complexNo} value={complex.complexNo}>
                    {complex.complexName}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchAnalytics}
                disabled={!selectedComplex || loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '분석 중...' : '분석 시작'}
              </button>
            </div>
          )}

          {/* 다중 단지 선택 */}
          {mode === "compare" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                비교할 단지 선택 (2~5개)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {complexes.map((complex) => (
                  <label
                    key={complex.complexNo}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedComplexes.includes(complex.complexNo)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedComplexes.includes(complex.complexNo)}
                      onChange={() => handleComplexToggle(complex.complexNo)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {complex.complexName}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedComplexes.length}개 선택됨
                </span>
                <button
                  onClick={fetchAnalytics}
                  disabled={selectedComplexes.length < 2 || loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '분석 중...' : '비교 분석'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 분석 결과 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">분석 중...</p>
            </div>
          </div>
        ) : mode === "single" ? (
          <SingleAnalysis analyticsData={analyticsData} />
        ) : (
          <CompareAnalysis analyticsData={analyticsData} />
        )}
      </main>
    </div>
  );
}
