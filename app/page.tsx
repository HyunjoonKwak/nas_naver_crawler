"use client";

import { useState } from "react";
import Link from "next/link";
import CrawlerForm from "@/components/CrawlerForm";
import CrawlerHistory from "@/components/CrawlerHistory";
import CrawlerStatus from "@/components/CrawlerStatus";

export default function Home() {
  const [refresh, setRefresh] = useState(0);

  const handleCrawlComplete = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                🏠 네이버 부동산 크롤러
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                NAS 환경용 부동산 정보 수집 시스템
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              📊 대시보드
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Crawler Form */}
          <div className="lg:col-span-2">
            <CrawlerForm onCrawlComplete={handleCrawlComplete} />
          </div>

          {/* Right Column - Status */}
          <div>
            <CrawlerStatus />
          </div>
        </div>

        {/* History Section */}
        <div className="mt-8">
          <CrawlerHistory refresh={refresh} />
        </div>
      </div>
    </div>
  );
}

