"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatusData {
  crawler: {
    scriptExists: boolean;
    playwrightReady: boolean;
    ready: boolean;
  };
  data: {
    crawledFilesCount: number;
  };
  status: string;
  crawledDataCount?: number;
  favoritesCount?: number;
  crawledDataSize?: string;
}

export default function SystemPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 10초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  ⚙️
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    시스템 상태
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    크롤러 시스템 상태 및 설정 정보
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 홈
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    시스템 상태
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    10초마다 자동 업데이트
                  </p>
                </div>
                <div className={`px-6 py-3 rounded-xl flex items-center gap-3 ${
                  status?.status === 'ready'
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                }`}>
                  <div className="text-3xl">
                    {status?.status === 'ready' ? '🟢' : '🔴'}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      전체 상태
                    </div>
                    <div className={`text-xl font-bold ${
                      status?.status === 'ready'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {status?.status === 'ready' ? '정상 작동' : '준비 필요'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Crawler Components Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                크롤러 구성 요소
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Script Status */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">📄</div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      status?.crawler.scriptExists
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {status?.crawler.scriptExists ? '✓ 정상' : '✗ 필요'}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Python 스크립트
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    크롤링 스크립트 파일 존재 여부를 확인합니다.
                  </p>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 text-xs text-gray-500 dark:text-gray-400">
                    <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">
                      logic/nas_playwright_crawler.py
                    </code>
                  </div>
                </div>

                {/* Playwright Status */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">🎭</div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      status?.crawler.playwrightReady
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {status?.crawler.playwrightReady ? '✓ 정상' : '✗ 필요'}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Playwright
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    브라우저 자동화 라이브러리 설치 상태를 확인합니다.
                  </p>
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700 text-xs text-gray-500 dark:text-gray-400">
                    <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">
                      pip install playwright
                    </code>
                  </div>
                </div>

                {/* Crawler Ready Status */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">🤖</div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      status?.crawler.ready
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {status?.crawler.ready ? '✓ 준비됨' : '✗ 필요'}
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    크롤러 상태
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    스크립트와 Playwright가 모두 준비되어야 작동합니다.
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 text-xs text-gray-500 dark:text-gray-400">
                    {status?.crawler.ready ? '크롤링 실행 가능' : '설정이 필요합니다'}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                데이터 통계
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Crawled Files */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-100 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">📁</div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    크롤링 파일
                  </h4>
                  <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    {status?.crawledDataCount || status?.data.crawledFilesCount || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    수집된 JSON 데이터 파일 개수
                  </p>
                </div>

                {/* Favorites */}
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-pink-100 dark:border-pink-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">⭐</div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    선호 단지
                  </h4>
                  <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                    {status?.favoritesCount || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    등록된 관심 단지 개수
                  </p>
                </div>

                {/* Disk Usage */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-cyan-100 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">💾</div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    디스크 사용량
                  </h4>
                  <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                    {status?.crawledDataSize || '-'}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    크롤링 데이터 저장 공간
                  </p>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                시스템 정보
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🐍</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Python 환경
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        크롤링 스크립트 실행 환경
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Python 3.x
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⚛️</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Next.js 프레임워크
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        웹 애플리케이션 프레임워크
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Next.js 14
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🐳</div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Docker 컨테이너
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        컨테이너 기반 배포
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    활성화
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-800 p-8">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💡</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    시스템 상태 설명
                  </h3>
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <strong className="text-blue-600 dark:text-blue-400">스크립트:</strong>
                      {' '}크롤링을 수행하는 Python 스크립트 파일의 존재 여부를 확인합니다.
                      파일이 없으면 크롤링을 실행할 수 없습니다.
                    </div>
                    <div>
                      <strong className="text-purple-600 dark:text-purple-400">Playwright:</strong>
                      {' '}웹 브라우저를 제어하기 위한 Python 라이브러리입니다.
                      설치되어 있지 않으면 크롤링이 작동하지 않습니다.
                    </div>
                    <div>
                      <strong className="text-green-600 dark:text-green-400">크롤러:</strong>
                      {' '}스크립트와 Playwright가 모두 준비되어야 크롤링을 실행할 수 있습니다.
                    </div>
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <strong>참고:</strong> 이 상태 체크는 NAS 시스템에 최초로 설정할 때
                      필요한 구성 요소를 확인하기 위한 것입니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
