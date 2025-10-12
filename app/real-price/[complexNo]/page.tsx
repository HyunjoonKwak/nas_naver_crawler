"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import RealPriceAnalysis from "@/components/RealPriceAnalysis";

export default function RealPricePage() {
  const params = useParams();
  const complexNo = params.complexNo as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  📊
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    실거래가 분석
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    단지번호: {complexNo}
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/complexes"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 단지 목록
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RealPriceAnalysis complexNo={complexNo} />
      </div>
    </div>
  );
}
