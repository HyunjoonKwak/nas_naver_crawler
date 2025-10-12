"use client";

import { useState } from "react";
import Link from "next/link";
import CrawlerHistory from "@/components/CrawlerHistory";

export default function SchedulerPage() {
  const [activeSection, setActiveSection] = useState<'scheduler' | 'history'>('scheduler');
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  ⏰
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    스케줄러 & 히스토리
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    자동 크롤링 스케줄 및 기록 관리
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
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveSection('scheduler')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeSection === 'scheduler'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">⏰</span>
                <span>스케줄러</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeSection === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📚</span>
                <span>크롤링 히스토리</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scheduler Section */}
        {activeSection === 'scheduler' && (
          <div>
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                크롤링 스케줄러
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                정기적으로 자동 크롤링을 실행하도록 스케줄을 설정하세요
              </p>
            </div>

            {/* Coming Soon Placeholder */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-12 text-center">
                <div className="text-8xl mb-6">🚧</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  개발 중입니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  스케줄러 기능은 현재 개발 중입니다. 곧 만나보실 수 있습니다!
                </p>

                {/* Feature Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
                  <FeaturePreview
                    icon="📅"
                    title="정기 실행"
                    description="매일, 매주, 매월 자동 크롤링"
                  />
                  <FeaturePreview
                    icon="⚙️"
                    title="유연한 설정"
                    description="단지별 개별 스케줄 설정"
                  />
                  <FeaturePreview
                    icon="🔔"
                    title="알림 기능"
                    description="크롤링 완료 시 알림 전송"
                  />
                </div>

                <div className="mt-12">
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                  >
                    홈으로 돌아가기
                  </Link>
                </div>
              </div>
            </div>

            {/* Planned Features */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <PlannedFeature
                title="Cron 표현식 지원"
                description="복잡한 스케줄도 Cron 표현식으로 유연하게 설정할 수 있습니다."
                status="계획됨"
              />
              <PlannedFeature
                title="스케줄 히스토리"
                description="과거 실행 기록과 다음 실행 예정 시간을 한눈에 확인하세요."
                status="계획됨"
              />
              <PlannedFeature
                title="조건부 실행"
                description="특정 조건(매물 수 변화 등)이 충족될 때만 크롤링을 실행할 수 있습니다."
                status="계획됨"
              />
              <PlannedFeature
                title="다중 스케줄"
                description="하나의 단지에 여러 개의 스케줄을 등록할 수 있습니다."
                status="계획됨"
              />
            </div>
          </div>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <div>
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
        )}
      </div>
    </div>
  );
}

function FeaturePreview({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
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

function PlannedFeature({ title, description, status }: { title: string; description: string; status: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h4>
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-full">
          {status}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
