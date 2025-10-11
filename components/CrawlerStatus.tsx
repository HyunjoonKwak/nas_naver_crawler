"use client";

import { useEffect, useState } from "react";

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

export default function CrawlerStatus() {
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          시스템 상태
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        시스템 상태
      </h2>

      <div className="space-y-4">
        {/* Crawler Status */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            크롤러
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">스크립트</span>
              <span className={`text-sm font-semibold ${
                status?.crawler.scriptExists 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {status?.crawler.scriptExists ? '✅ 준비됨' : '❌ 없음'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Playwright</span>
              <span className={`text-sm font-semibold ${
                status?.crawler.playwrightReady 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {status?.crawler.playwrightReady ? '✅ 준비됨' : '❌ 설치 필요'}
              </span>
            </div>
          </div>
        </div>

        {/* Data Status */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            데이터
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">크롤링된 파일</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              📁 {status?.data.crawledFilesCount || 0}개
            </span>
          </div>
        </div>

        {/* Overall Status */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              전체 상태
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status?.status === 'ready'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {status?.status === 'ready' ? '🟢 정상' : '🔴 준비 필요'}
            </span>
          </div>
        </div>

      </div>

      {/* Refresh Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          자동 업데이트: 10초마다
        </p>
      </div>
    </div>
  );
}

