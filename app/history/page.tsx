"use client";

import { useState } from "react";
import Link from "next/link";
import CrawlerHistory from "@/components/CrawlerHistory";

export default function HistoryPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  📚
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    크롤링 히스토리
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    모든 크롤링 기록 보기
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
              <Link
                href="/complexes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                🏘️ 단지 목록
              </Link>
              <Link
                href="/scheduler"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
              >
                ⏰ 스케줄러
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            전체 크롤링 히스토리
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            지금까지 수집한 모든 크롤링 데이터를 확인하세요
          </p>
        </div>

        {/* History Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6">
            <CrawlerHistory refresh={refresh} />
          </div>
        </div>
      </div>
    </div>
  );
}
