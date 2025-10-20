"use client";

import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { SchedulerSettings } from "@/components/SchedulerSettings";
import { AuthGuard } from "@/components/AuthGuard";

export default function SchedulerPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
        {/* Header */}
        <Navigation />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              ⏰ 스케줄러 관리
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              자동 크롤링 스케줄을 설정하고 관리하세요
            </p>
          </div>

          {/* Scheduler Settings Component */}
          <SchedulerSettings />
        </main>

        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
