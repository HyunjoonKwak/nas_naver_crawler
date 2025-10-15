"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useCrawlEvents } from "@/hooks/useCrawlEvents";

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
  const [refresh, setRefresh] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteWithStats[]>([]);
  const [stats, setStats] = useState({
    totalFavorites: 0,
    totalComplexes: 0, // 매물이 있는 단지 수
    totalArticles: 0,
    lastCrawlTime: null as string | null,
  });
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // SSE 기반 실시간 크롤링 상태 모니터링
  const crawlingStatus = useCrawlEvents(() => {
    // 크롤링 완료 시 대시보드 데이터 자동 새로고침
    fetchDashboardData();
  });

  useEffect(() => {
    fetchDashboardData();
  }, [refresh]);

  // 페이지 포커스 시 데이터 새로고침 (다른 페이지에서 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MAIN_PAGE] 페이지 포커스 감지 - 데이터 새로고침 시작');
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 클라이언트에서만 시간 표시 (hydration 에러 방지)
  useEffect(() => {
    setIsMounted(true);
    setCurrentTime(new Date());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  const fetchDashboardData = async () => {
    console.log('[MAIN_PAGE] 대시보드 데이터 조회 시작');
    try {
      // 크롤링 결과 조회
      console.log('[MAIN_PAGE] /api/results 호출');
      const resultResponse = await fetch('/api/results');
      const resultData = await resultResponse.json();
      const results = resultData.results || [];
      console.log('[MAIN_PAGE] 크롤링 결과 조회 완료:', {
        resultsCount: results.length
      });

      // Note: favorites.json sync removed - now handled by /api/crawl automatically
      // This prevents file-based data from overwriting accurate DB-based counts

      // 관심 단지 조회
      console.log('[MAIN_PAGE] /api/favorites 호출 (favorites.json 읽기)');
      const favResponse = await fetch('/api/favorites');
      const favData = await favResponse.json();
      const favList = favData.favorites || [];
      console.log('[MAIN_PAGE] 관심 단지 조회 완료:', {
        favoritesCount: favList.length,
        favorites: favList.map((f: any) => ({
          complexNo: f.complexNo,
          complexName: f.complexName,
          order: f.order
        }))
      });

      // DB 통계 조회 (최근 크롤링 시간 등)
      const dbStatsResponse = await fetch('/api/db-stats');
      const dbStatsData = await dbStatsResponse.json();

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

      setFavorites(favoritesWithStats.slice(0, 6)); // 최근 6개

      // 최근 크롤링 시간 가져오기 (DB의 최근 크롤링 히스토리에서)
      let lastCrawlTime = null;
      if (dbStatsData?.crawling?.recentCrawls?.length > 0) {
        lastCrawlTime = dbStatsData.crawling.recentCrawls[0].createdAt;
      }

      setStats({
        totalFavorites: favList.length,
        totalComplexes: results.length, // 매물이 있는 단지 수
        totalArticles,
        lastCrawlTime,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Quick Stats */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              부동산 데이터를 쉽고 빠르게
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              원하는 단지의 매물 정보를 실시간으로 수집하고 분석하세요
            </p>
          </div>

          {/* 크롤링 상태 배너 */}
          {crawlingStatus.isActive && (
            <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-xl shadow-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">크롤링 진행 중</h3>
                    <p className="text-blue-100 text-sm">{crawlingStatus.currentStep}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-2xl">{crawlingStatus.progress}%</div>
                  <div className="text-blue-100 text-xs">완료</div>
                </div>
              </div>
              {/* 프로그레스 바 */}
              <div className="mt-3 w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${crawlingStatus.progress}%` }}
                ></div>
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
            {favorites.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-7xl mb-4">📭</div>
                <p className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-4">
                  등록된 관심 단지가 없습니다
                </p>
                <Link
                  href="/complexes"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                >
                  ➕ 단지 추가하기
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((fav) => (
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
                          <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">매매</div>
                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
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
            )}
          </div>
        </div>

      </div>
    </div>
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
