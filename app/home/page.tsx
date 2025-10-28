"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useCrawlEvents } from "@/hooks/useCrawlEvents";
import { AuthGuard } from "@/components/AuthGuard";

interface FavoriteComplex {
  complexNo: string;
  complexName?: string;
  addedAt: string;
  lastCrawledAt?: string;
  articleCount?: number;
}

interface ArticleStats {
  total: number;
  A1: number; // 매매
  B1: number; // 전세
  B2: number; // 월세
}

interface FavoriteWithStats extends FavoriteComplex {
  stats?: ArticleStats;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false); // 더보기 상태
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // React Query: 크롤링 결과 조회
  const { data: resultsData, refetch: refetchResults } = useQuery({
    queryKey: ['results'],
    queryFn: async () => {
      console.log('[MAIN_PAGE] /api/results 호출');
      const response = await fetch('/api/results');
      const data = await response.json();
      console.log('[MAIN_PAGE] 크롤링 결과 조회 완료:', {
        resultsCount: data.results?.length || 0
      });
      return data;
    },
    enabled: status === 'authenticated',
  });

  // React Query: 관심 단지 조회
  const { data: favoritesData, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      console.log('[MAIN_PAGE] /api/favorites 호출 (DB에서 읽기)');
      const response = await fetch('/api/favorites');
      const data = await response.json();
      console.log('[MAIN_PAGE] 관심 단지 조회 완료:', {
        favoritesCount: data.favorites?.length || 0,
        favorites: data.favorites?.map((f: any) => ({
          complexNo: f.complexNo,
          complexName: f.complexName,
          order: f.order
        }))
      });
      return data;
    },
    enabled: status === 'authenticated',
  });

  // React Query: DB 통계 조회
  const { data: dbStatsData } = useQuery({
    queryKey: ['db-stats'],
    queryFn: async () => {
      const response = await fetch('/api/db-stats');
      return response.json();
    },
    enabled: status === 'authenticated',
  });

  // React Query: 알림 조회
  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetch('/api/alerts');
      return response.json();
    },
    enabled: status === 'authenticated',
  });

  // 인증되지 않은 사용자는 랜딩 페이지로 리다이렉트
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // SSE 기반 실시간 크롤링 상태 모니터링
  const crawlingStatus = useCrawlEvents(() => {
    // 크롤링 완료 시 대시보드 데이터 자동 새로고침
    refetchResults();
    refetchFavorites();
  });

  // 페이지 포커스 시 데이터 새로고침 (다른 페이지에서 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MAIN_PAGE] 페이지 포커스 감지 - 데이터 새로고침 시작');
        refetchResults();
        refetchFavorites();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchResults, refetchFavorites]);

  // 클라이언트에서만 시간 표시 (hydration 에러 방지)
  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 데이터 가공 및 계산 (React Query 데이터 기반)
  const results = resultsData?.results || [];
  const favList = favoritesData?.favorites || [];

  // 통계 계산
  const totalArticles = results.reduce((sum: number, result: any) => {
    return sum + (result?.articles?.length || 0);
  }, 0);

  // 관심 단지별 상세 통계 계산
  const favoritesWithStats = favList.map((fav: FavoriteComplex) => {
    // 해당 단지의 최신 크롤링 데이터 찾기
    const complexResult = results.find((result: any) => {
      return result?.overview?.complexNo === fav.complexNo;
    });

    if (complexResult) {
      const articles = complexResult?.articles || [];

      // 거래유형별 통계
      const stats: ArticleStats = {
        total: articles.length,
        A1: articles.filter((a: any) => a.tradeTypeName === '매매').length,
        B1: articles.filter((a: any) => a.tradeTypeName === '전세').length,
        B2: articles.filter((a: any) => a.tradeTypeName === '월세').length,
      };

      return {
        ...fav,
        stats,
        complexName: complexResult?.overview?.complexName || fav.complexName,
      };
    }

    return fav;
  });

  // 최근 크롤링 시간 가져오기 (DB의 최근 크롤링 히스토리에서)
  let lastCrawlTime = null;
  if (dbStatsData?.crawling?.recentCrawls?.length > 0) {
    lastCrawlTime = dbStatsData.crawling.recentCrawls[0].createdAt;
  }

  const stats = {
    totalFavorites: favList.length,
    totalComplexes: results.length, // 매물이 있는 단지 수
    totalArticles,
    lastCrawlTime,
  };

  // 미니 대시보드 데이터 계산
  // 1. 24시간 Hot 단지 (articleChange24h 기준)
  const hotComplexes = favList
    .filter((f: any) => f.articleChange24h && f.articleChange24h > 0)
    .sort((a: any, b: any) => (b.articleChange24h || 0) - (a.articleChange24h || 0))
    .slice(0, 3)
    .map((f: any) => ({
      complexNo: f.complexNo,
      complexName: f.complexName,
      change24h: f.articleChange24h,
    }));

  // 2. 가성비 단지 계산은 복잡하므로 나중에 구현 (일단 빈 배열)
  const valuableComplexes: Array<{complexNo: string, complexName: string, pricePerPyeong: number}> = [];

  // 3. 활성 알림 수 조회
  const activeAlertsCount = alertsData?.success && alertsData?.alerts
    ? alertsData.alerts.filter((a: any) => a.isActive).length
    : 0;

  const dashboardData = {
    hotComplexes,
    valuableComplexes,
    activeAlertsCount,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  const formatCurrentTime = () => {
    if (!currentTime) return '';
    return currentTime.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) {
      return `${secs}초`;
    }
    return `${minutes}분 ${secs}초`;
  };

  // 로딩 중이거나 인증되지 않은 경우
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20 md:pb-0">
        {/* Navigation */}
        <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Quick Stats */}
        <div className="mb-8">
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white text-center">
              부동산 데이터를 쉽고 빠르게
            </h2>
          </div>

          {/* 크롤링 상태 배너 */}
          {crawlingStatus.isActive && (
            <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="animate-spin h-7 w-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-xl mb-1">
                    {crawlingStatus.scheduleName
                      ? `스케줄 "${crawlingStatus.scheduleName}" 실행 중`
                      : '크롤링 진행 중'
                    }
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-blue-100 text-sm">{crawlingStatus.currentStep}</p>
                    {crawlingStatus.startTime && (
                      <p className="text-blue-100 text-sm font-medium">
                        ⏱️ {formatElapsedTime(crawlingStatus.elapsedSeconds)} 경과
                      </p>
                    )}
                    {crawlingStatus.totalComplexes && (
                      <p className="text-blue-100 text-sm">
                        📍 {crawlingStatus.totalComplexes}개 단지
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="⭐"
              label="관심 단지"
              value={stats.totalFavorites}
              color="blue"
              link="/complexes"
            />
            <StatCard
              icon="🏢"
              label="등록 단지"
              value={stats.totalComplexes}
              color="green"
              link="/complexes"
            />
            <StatCard
              icon="🏘️"
              label="수집 매물"
              value={stats.totalArticles.toLocaleString()}
              color="purple"
            />
            <StatCard
              icon="⏱️"
              label="최근 수집"
              value={stats.lastCrawlTime ? formatDate(stats.lastCrawlTime) : '-'}
              color="orange"
              isTime
            />
          </div>

          {/* Mini Dashboard - 투자 인사이트 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              투자 인사이트
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. 24시간 활발한 단지 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border-2 border-red-200 dark:border-red-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔥</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">24시간 Hot 단지</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    매물 변동이 가장 많은 단지
                  </div>
                  {dashboardData.hotComplexes.length > 0 ? (
                    <div className="space-y-1">
                      {dashboardData.hotComplexes.map((complex: any, idx: number) => (
                        <Link
                          key={complex.complexNo}
                          href={`/complex/${complex.complexNo}`}
                          className="flex items-center justify-between text-xs hover:bg-white/50 dark:hover:bg-black/20 rounded p-1 transition-colors"
                        >
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {idx + 1}. {complex.complexName}
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-bold ml-2">
                            +{complex.change24h}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      변동 없음
                    </div>
                  )}
                </div>
              </div>

              {/* 2. 평당 가격 저렴 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💎</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">가성비 단지</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    평당 가격이 저렴한 단지
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    데이터 수집 중...
                  </div>
                </div>
              </div>

              {/* 3. 즉시 거래 가능 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-700 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⚡</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">즉시 거래 가능</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    매물 10개 이상 보유 단지
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.totalComplexes}개
                  </div>
                </div>
              </div>

              {/* 4. 내 알림 현황 */}
              <Link
                href="/alerts"
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700 p-5 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🎯</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">내 알림</h4>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    활성화된 알림 규칙
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {dashboardData.activeAlertsCount}개
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link
              href="/complexes"
              className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="text-4xl">🏢</div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">단지 관리</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">관심 단지 추가 및 관리</p>
              </div>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="text-4xl">📊</div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">데이터 분석</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">단지별 상세 통계 분석</p>
              </div>
            </Link>
            <Link
              href="/alerts"
              className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="text-4xl">🔔</div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">알림 관리</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">알림 규칙 생성 및 편집</p>
              </div>
            </Link>
            <Link
              href="/system?tab=scheduler"
              className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="text-4xl">⏰</div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">스케줄러</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">자동 크롤링 스케줄 설정</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Favorite Complexes with Detailed Stats */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              ⭐ 관심 단지
            </h3>
            <Link
              href="/complexes"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              전체 관리 →
            </Link>
          </div>
          <div className="p-6">
            {favoritesWithStats.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-7xl mb-4">📭</div>
                <p className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  등록된 관심 단지가 없습니다
                </p>
                <Link
                  href="/complexes"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all font-semibold shadow-lg"
                >
                  ➕ 단지 추가하기
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(showAll ? favoritesWithStats : favoritesWithStats.slice(0, 6)).map((fav: FavoriteWithStats) => (
                  <Link
                    key={fav.complexNo}
                    href={`/complex/${fav.complexNo}`}
                    className="block bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all hover:-translate-y-1"
                  >
                    {/* 단지명 */}
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {fav.complexName || `단지 ${fav.complexNo}`}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      📌 {fav.complexNo}
                    </p>

                    {/* 매물 통계 */}
                    {fav.stats ? (
                      <div className="space-y-3">
                        {/* 전체 매물 수 */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            전체 매물
                          </span>
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {fav.stats.total}
                          </span>
                        </div>

                        {/* 거래유형별 통계 */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">매매</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {fav.stats.A1}
                            </div>
                          </div>
                          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">전세</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {fav.stats.B1}
                            </div>
                          </div>
                          <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">월세</div>
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {fav.stats.B2}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400 dark:text-gray-600 text-sm">
                        크롤링 데이터 없음
                      </div>
                    )}

                    {/* 최근 수집 시간 */}
                    {fav.lastCrawledAt && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        최근 수집: {formatDate(fav.lastCrawledAt)}
                      </div>
                    )}
                  </Link>
                  ))}
                </div>

                {/* 더보기 버튼 */}
                {favoritesWithStats.length > 6 && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition-all hover:shadow-xl"
                    >
                      {showAll ? '접기 ▲' : `더보기 (${favoritesWithStats.length - 6}개 더) ▼`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
  link,
  isTime = false
}: {
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  link?: string;
  isTime?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  const content = (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center text-2xl mb-3 shadow-lg`}>
            {icon}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {label}
          </div>
          <div className={`${isTime ? 'text-lg' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block transform hover:-translate-y-1 transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}
