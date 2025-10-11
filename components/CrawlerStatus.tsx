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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          ⚙️ 시스템 상태
        </h2>
        <p className="text-green-100 text-sm mt-1">
          크롤러 준비 상태 및 데이터 현황
        </p>
      </div>
      <div className="p-6">

      <div className="space-y-4">
        {/* Overall Status - Prominent */}
        <div className={`p-4 rounded-xl ${
          status?.status === 'ready'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">전체 상태</div>
              <div className={`text-2xl font-bold ${
                status?.status === 'ready'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {status?.status === 'ready' ? '정상 작동' : '준비 필요'}
              </div>
            </div>
            <div className="text-4xl">
              {status?.status === 'ready' ? '🟢' : '🔴'}
            </div>
          </div>
        </div>

        {/* Crawler Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            🎭 크롤러
          </h3>
          <div className="space-y-2">
            <StatusRow
              label="스크립트"
              isReady={status?.crawler.scriptExists}
            />
            <StatusRow
              label="Playwright"
              isReady={status?.crawler.playwrightReady}
            />
          </div>
        </div>

        {/* Data Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            📊 데이터
          </h3>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm text-gray-700 dark:text-gray-300">크롤링된 파일</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {status?.data.crawledFilesCount || 0}개
            </span>
          </div>
        </div>

      </div>

      {/* Refresh Info */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>10초마다 자동 업데이트</span>
        </p>
      </div>
      </div>
    </div>
  );
}

// Helper Component
function StatusRow({ label, isReady }: { label: string; isReady?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className={`text-sm font-semibold flex items-center gap-1 ${
        isReady
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400'
      }`}>
        <span>{isReady ? '✅' : '❌'}</span>
        <span>{isReady ? '준비됨' : '필요'}</span>
      </span>
    </div>
  );
}

