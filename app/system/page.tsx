"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { SystemSettings } from "@/components/SystemSettings";
import { SchedulerSettings } from "@/components/SchedulerSettings";
import { AuthGuard } from "@/components/AuthGuard";
import { DatabaseSection } from "@/components/system/DatabaseSection";
import { UsefulLinksSection } from "@/components/system/UsefulLinksSection";
import { UserManagementSection } from "@/components/system/UserManagementSection";

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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<StatusData | null>(null);
  const [activeSection, setActiveSection] = useState<'database' | 'info' | 'users' | 'scheduler' | 'settings'>('database');
  const [refresh, setRefresh] = useState(0);

  // URL 파라미터로 탭 설정
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['database', 'info', 'users', 'scheduler', 'settings'].includes(tab)) {
      setActiveSection(tab as 'database' | 'info' | 'users' | 'scheduler' | 'settings');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStatus();

    // Refresh when page becomes visible (탭 전환 시에만)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      // 상태 조회 실패는 조용히 처리 (페이지는 계속 표시)
    }
  };

  const tabs = [
    { id: 'database' as const, icon: '🗄️', label: 'DB 현황' },
    { id: 'info' as const, icon: '📌', label: '유용한 정보' },
    ...(isAdmin ? [{ id: 'users' as const, icon: '👥', label: '사용자 관리' }] : []),
    { id: 'scheduler' as const, icon: '⏰', label: '스케줄러' },
    { id: 'settings' as const, icon: '⚙️', label: '설정' },
  ];

  const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
        {/* Header */}
        <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-1 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeSection === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-base">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>


        {/* Database Section */}
        {activeSection === "database" && (
          <DatabaseSection status={status} refresh={refresh} isAdmin={isAdmin} />
        )}

        {/* Info Section - Useful Links */}
        {activeSection === "info" && <UsefulLinksSection />}

        {/* Users Section - User Management */}
        {activeSection === 'users' && <UserManagementSection />}

        {/* Scheduler Section */}
        {activeSection === 'scheduler' && (
          <div className="space-y-6">
            <SectionHeader
              title="스케줄러 관리"
              description="자동 크롤링 스케줄을 설정하세요"
            />
            <SchedulerSettings />
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <SectionHeader
              title="시스템 설정"
              description="테마, 알림, 언어 및 개인정보 설정을 관리하세요"
            />
            <SystemSettings />
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
