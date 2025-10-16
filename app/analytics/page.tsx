"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"single" | "compare">("single");
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [selectedComplex, setSelectedComplex] = useState<string>("");
  const [selectedComplexes, setSelectedComplexes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // 필터 상태
  const [tradeTypes, setTradeTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>("all"); // all, 7days, 30days

  // URL 파라미터에서 상태 복원
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const urlComplexNos = searchParams.get('complexNos');
    const urlTradeTypes = searchParams.get('tradeTypes');
    const urlDateRange = searchParams.get('dateRange');

    if (urlMode) setMode(urlMode as "single" | "compare");
    if (urlComplexNos) {
      const complexNoArray = urlComplexNos.split(',');
      if (urlMode === 'single') {
        setSelectedComplex(complexNoArray[0]);
      } else {
        setSelectedComplexes(complexNoArray);
      }
    }
    if (urlTradeTypes) setTradeTypes(urlTradeTypes.split(','));
    if (urlDateRange) setDateRange(urlDateRange);
  }, [searchParams]);

  // 상태가 변경되면 URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mode', mode);

    if (mode === 'single' && selectedComplex) {
      params.set('complexNos', selectedComplex);
    } else if (mode === 'compare' && selectedComplexes.length > 0) {
      params.set('complexNos', selectedComplexes.join(','));
    }

    if (tradeTypes.length > 0) {
      params.set('tradeTypes', tradeTypes.join(','));
    }
    if (dateRange !== 'all') {
      params.set('dateRange', dateRange);
    }

    // URL 업데이트 (페이지 리로드 없이)
    router.replace(`/analytics?${params.toString()}`, { scroll: false });
  }, [mode, selectedComplex, selectedComplexes, tradeTypes, dateRange, router]);

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
      // 전체 등록된 단지 목록 조회 (DB에서 직접 조회)
      const complexResponse = await fetch("/api/complexes");

      if (!complexResponse.ok) {
        throw new Error(`HTTP error! status: ${complexResponse.status}`);
      }

      const complexData = await complexResponse.json();

      if (complexData.complexes) {
        const complexList = complexData.complexes.map((complex: any) => ({
          complexNo: complex.complexNo,
          complexName: complex.complexName,
          articleCount: complex.articleCount || 0,
        }));

        // 매물 개수 기준 내림차순 정렬 (매물이 많은 단지가 먼저)
        complexList.sort((a: any, b: any) => b.articleCount - a.articleCount);

        setComplexes(complexList);
        console.log('[ANALYTICS] Loaded complexes:', complexList.length);
      } else if (complexData.error) {
        throw new Error(complexData.error);
      } else {
        throw new Error('Invalid response format');
      }
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

      // 날짜 범위 계산
      let startDate = '';
      let endDate = '';
      if (dateRange === '7days') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        startDate = date.toISOString().split('T')[0].replace(/-/g, '');
      } else if (dateRange === '30days') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        startDate = date.toISOString().split('T')[0].replace(/-/g, '');
      }

      // URL 파라미터 구성
      const params = new URLSearchParams({
        complexNos,
        mode,
      });
      if (tradeTypes.length > 0) {
        params.append('tradeTypes', tradeTypes.join(','));
      }
      if (startDate) {
        params.append('startDate', startDate);
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
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

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('링크가 복사되었습니다');
    }).catch(() => {
      showError('링크 복사에 실패했습니다');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 네비게이션 */}
      <Navigation />

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">데이터 분석</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              단지별 매물 데이터를 시각화하고 비교 분석합니다
            </p>
          </div>
          {analyticsData && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="현재 분석 결과 공유 링크 복사"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-sm font-medium">링크 복사</span>
            </button>
          )}
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

        {/* 필터 섹션 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            필터 옵션
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 거래유형 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                거래유형
              </label>
              <div className="flex flex-wrap gap-3">
                {['매매', '전세', '월세'].map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      tradeTypes.includes(type)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tradeTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTradeTypes([...tradeTypes, type]);
                        } else {
                          setTradeTypes(tradeTypes.filter(t => t !== type));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">{type}</span>
                  </label>
                ))}
              </div>
              {tradeTypes.length === 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  선택하지 않으면 모든 거래유형이 포함됩니다
                </p>
              )}
            </div>

            {/* 날짜 범위 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                기간
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'all', label: '전체' },
                  { value: '7days', label: '최근 7일' },
                  { value: '30days', label: '최근 30일' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                      dateRange === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          {(tradeTypes.length > 0 || dateRange !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setTradeTypes([]);
                  setDateRange('all');
                  showSuccess('필터가 초기화되었습니다');
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                🔄 필터 초기화
              </button>
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
          <SingleAnalysis analyticsData={analyticsData} tradeTypes={tradeTypes} />
        ) : (
          <CompareAnalysis analyticsData={analyticsData} />
        )}
      </main>
    </div>
  );
}
