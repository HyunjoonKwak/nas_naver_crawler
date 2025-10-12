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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-xl shadow-lg">
            ⚙️
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              시스템 상태
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              10초마다 자동 업데이트
            </p>
          </div>
        </div>

        {/* Overall Status Badge */}
        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
          status?.status === 'ready'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="text-2xl">
            {status?.status === 'ready' ? '🟢' : '🔴'}
          </div>
          <div className={`font-bold ${
            status?.status === 'ready'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {status?.status === 'ready' ? '정상' : '준비 필요'}
          </div>
        </div>
      </div>

      {/* Horizontal Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Script Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">스크립트</div>
            <div className={`text-sm font-bold ${
              status?.crawler.scriptExists
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {status?.crawler.scriptExists ? '준비됨' : '필요'}
            </div>
          </div>
          <div className="text-2xl">
            {status?.crawler.scriptExists ? '✅' : '❌'}
          </div>
        </div>

        {/* Playwright Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Playwright</div>
            <div className={`text-sm font-bold ${
              status?.crawler.playwrightReady
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {status?.crawler.playwrightReady ? '준비됨' : '필요'}
            </div>
          </div>
          <div className="text-2xl">
            {status?.crawler.playwrightReady ? '✅' : '❌'}
          </div>
        </div>

        {/* Crawler Ready Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">크롤러</div>
            <div className={`text-sm font-bold ${
              status?.crawler.ready
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {status?.crawler.ready ? '준비됨' : '필요'}
            </div>
          </div>
          <div className="text-2xl">
            {status?.crawler.ready ? '✅' : '❌'}
          </div>
        </div>

        {/* Crawled Files */}
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">크롤링 파일</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {status?.data.crawledFilesCount || 0}개
            </div>
          </div>
          <div className="text-2xl">
            📁
          </div>
        </div>
      </div>
    </div>
  );
}

