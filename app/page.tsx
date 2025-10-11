"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CrawlerForm from "@/components/CrawlerForm";
import CrawlerHistory from "@/components/CrawlerHistory";
import CrawlerStatus from "@/components/CrawlerStatus";

interface FavoriteComplex {
  complexNo: string;
  complexName?: string;
  addedAt: string;
  lastCrawledAt?: string;
  articleCount?: number;
}

interface CrawlResult {
  filename: string;
  size: number;
  createdAt: string;
  data: any;
}

export default function Home() {
  const [refresh, setRefresh] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteComplex[]>([]);
  const [recentResults, setRecentResults] = useState<CrawlResult[]>([]);
  const [stats, setStats] = useState({
    totalFavorites: 0,
    totalCrawls: 0,
    totalArticles: 0,
    lastCrawlTime: null as string | null,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [refresh]);

  const fetchDashboardData = async () => {
    try {
      // 선호 단지 조회
      const favResponse = await fetch('/api/favorites');
      const favData = await favResponse.json();
      const favList = favData.favorites || [];
      setFavorites(favList.slice(0, 3)); // 최근 3개만

      // 크롤링 결과 조회
      const resultResponse = await fetch('/api/results');
      const resultData = await resultResponse.json();
      const results = resultData.results || [];
      setRecentResults(results.slice(0, 3)); // 최근 3개만

      // 통계 계산
      const totalArticles = results.reduce((sum: number, result: CrawlResult) => {
        const data = Array.isArray(result.data) ? result.data[0] : result.data;
        return sum + (data?.articles?.articleList?.length || 0);
      }, 0);

      setStats({
        totalFavorites: favList.length,
        totalCrawls: results.length,
        totalArticles,
        lastCrawlTime: results[0]?.createdAt || null,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleCrawlComplete = () => {
    setRefresh(prev => prev + 1);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                🏠
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  네이버 부동산 크롤러
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  NAS 환경용 부동산 정보 수집 시스템
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                📊 전체 대시보드
              </Link>
            </div>
          </div>
        </div>
      </nav>

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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="⭐"
              label="선호 단지"
              value={stats.totalFavorites}
              color="blue"
              link="/dashboard"
            />
            <StatCard
              icon="📊"
              label="총 크롤링"
              value={stats.totalCrawls}
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

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Action - Crawler Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  🚀 빠른 크롤링
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  단지번호를 입력하여 즉시 매물 정보를 수집하세요
                </p>
              </div>
              <div className="p-6">
                <CrawlerForm onCrawlComplete={handleCrawlComplete} />
              </div>
            </div>
          </div>

          {/* System Status */}
          <div>
            <CrawlerStatus />
          </div>
        </div>

        {/* Favorites Preview & Recent Crawls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Favorite Complexes Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                ⭐ 선호 단지
              </h3>
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="p-6">
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    등록된 선호 단지가 없습니다
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    ➕ 단지 추가하기
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((fav) => (
                    <Link
                      key={fav.complexNo}
                      href="/dashboard"
                      className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {fav.complexName || `단지 ${fav.complexNo}`}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            📌 {fav.complexNo}
                          </p>
                        </div>
                        {fav.articleCount !== undefined && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {fav.articleCount}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              매물
                            </div>
                          </div>
                        )}
                      </div>
                      {fav.lastCrawledAt && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          최근 수집: {formatDate(fav.lastCrawledAt)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Crawls Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📋 최근 크롤링
              </h3>
              <button
                onClick={() => setRefresh(prev => prev + 1)}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold"
              >
                🔄 새로고침
              </button>
            </div>
            <div className="p-6">
              {recentResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">
                    크롤링 데이터가 없습니다
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    위에서 크롤링을 시작하세요
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentResults.map((result, idx) => {
                    const data = Array.isArray(result.data) ? result.data[0] : result.data;
                    const complexName = data?.overview?.complexName || '알 수 없음';
                    const articleCount = data?.articles?.articleList?.length || 0;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {complexName}
                          </h4>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded">
                            {articleCount}개
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(result.createdAt)}</span>
                          <span>{(result.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full History Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              📚 전체 크롤링 히스토리
            </h3>
          </div>
          <div className="p-6">
            <CrawlerHistory refresh={refresh} />
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="♾️"
            title="무한 스크롤"
            description="20개 → 127개 완전 수집, 중복 제거로 48% 최적화"
          />
          <FeatureCard
            icon="🎭"
            title="봇 감지 회피"
            description="Playwright 헤드리스 브라우저로 안정적 크롤링"
          />
          <FeatureCard
            icon="🗺️"
            title="역지오코딩"
            description="위경도를 주소로 자동 변환, 법정동/행정동 표시"
          />
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

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
