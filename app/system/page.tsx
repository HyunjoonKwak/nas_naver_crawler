"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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

  const [status, setStatus] = useState<StatusData | null>(null);
  const [activeSection, setActiveSection] = useState<'database' | 'info' | 'users' | 'scheduler' | 'settings'>('database');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetchStatus();

    // Refresh when page becomes visible (탭 전환 시에만)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[System] Page visible, refreshing status...');
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
      console.error('Failed to fetch status:', error);
    }
  };

  const tabs = [
    { id: 'database' as const, icon: '🗄️', label: 'DB 현황', gradient: 'from-cyan-600 to-blue-600' },
    { id: 'info' as const, icon: '📌', label: '유용한 정보', gradient: 'from-emerald-600 to-teal-600' },
    ...(isAdmin ? [{ id: 'users' as const, icon: '👥', label: '사용자 관리', gradient: 'from-rose-600 to-pink-600' }] : []),
    { id: 'scheduler' as const, icon: '⏰', label: '스케줄러', gradient: 'from-green-600 to-emerald-600' },
    { id: 'settings' as const, icon: '⚙️', label: '설정', gradient: 'from-indigo-600 to-purple-600' },
  ];

  const SectionHeader = ({ title, description }: { title: string; description: string }) => (
    <div className="mb-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
        {/* Header */}
        <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-4 text-center font-semibold transition-colors ${
                  activeSection === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white`
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
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
              title="스케줄러 및 알림 관리"
              description="자동 크롤링 스케줄과 Discord 알림을 설정하세요"
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
