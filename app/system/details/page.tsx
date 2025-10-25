"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";

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
}

export default function SystemDetailsPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error: any) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">시스템 상세 정보</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              크롤러 구성 요소 및 시스템 환경 정보
            </p>
          </div>
          <Link
            href="/system"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            ← 시스템 페이지로
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Crawler Components Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                크롤러 구성 요소
              </h2>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Python 스크립트
                  </h3>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Playwright
                  </h3>
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    크롤러 상태
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    스크립트와 Playwright가 모두 준비되어야 작동합니다.
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 text-xs text-gray-500 dark:text-gray-400">
                    {status?.crawler.ready ? '크롤링 실행 가능' : '설정이 필요합니다'}
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                시스템 정보
              </h2>
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    시스템 상태 설명
                  </h2>
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <strong className="text-gray-900 dark:text-white">🟢 정상 작동:</strong> 모든 구성 요소가 준비되어 크롤링을 실행할 수 있습니다.
                    </div>
                    <div>
                      <strong className="text-gray-900 dark:text-white">🔴 준비 필요:</strong> Python 스크립트 또는 Playwright 설치가 필요합니다.
                    </div>
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <strong className="text-gray-900 dark:text-white">설정 방법:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                        <li>Docker 컨테이너 내에서 <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">pip install playwright</code> 실행</li>
                        <li>Playwright 브라우저 설치: <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">playwright install chromium</code></li>
                        <li>Python 스크립트가 <code className="bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs">logic/</code> 폴더에 있는지 확인</li>
                      </ol>
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
