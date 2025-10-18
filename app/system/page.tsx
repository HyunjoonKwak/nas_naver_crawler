"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import CrawlerHistory from "@/components/CrawlerHistory";
import { SystemSettings } from "@/components/SystemSettings";
import { SchedulerSettings } from "@/components/SchedulerSettings";
import { ThemeToggle, Dialog } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import { useApiCall } from "@/hooks/useApiCall";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { DatabaseSection } from "@/components/system/DatabaseSection";
import { UsefulLinksSection } from "@/components/system/UsefulLinksSection";

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
  const { handleApiCall } = useApiCall();

  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'database' | 'info' | 'users' | 'scheduler' | 'settings'>('database');
  const [refresh, setRefresh] = useState(0);

  // Users states
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

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

  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
  }, [activeSection, isAdmin]);

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


  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showError('사용자 목록 조회에 실패했습니다.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserApprove = async (userId: string, isApproved: boolean) => {
    await handleApiCall({
      method: 'PUT',
      url: '/api/users',
      body: { userId, isApproved },
      loadingMessage: isApproved ? '승인 중...' : '승인 취소 중...',
      successMessage: isApproved ? '사용자가 승인되었습니다.' : '승인이 취소되었습니다.',
      errorPrefix: '실패',
      onSuccess: fetchUsers
    });
  };

  const handleUserActivate = async (userId: string, isActive: boolean) => {
    await handleApiCall({
      method: 'PUT',
      url: '/api/users',
      body: { userId, isActive },
      loadingMessage: isActive ? '활성화 중...' : '비활성화 중...',
      successMessage: isActive ? '사용자가 활성화되었습니다.' : '사용자가 비활성화되었습니다.',
      errorPrefix: '실패',
      onSuccess: fetchUsers
    });
  };

  const handleUserRoleChange = async (userId: string, role: string) => {
    await handleApiCall({
      method: 'PUT',
      url: '/api/users',
      body: { userId, role },
      loadingMessage: '역할 변경 중...',
      successMessage: '역할이 변경되었습니다.',
      errorPrefix: '실패',
      onSuccess: fetchUsers
    });
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;

    await handleApiCall({
      method: 'DELETE',
      url: `/api/users?userId=${userId}`,
      loadingMessage: '사용자 삭제 중...',
      successMessage: '사용자가 삭제되었습니다.',
      errorPrefix: '삭제 실패',
      onSuccess: fetchUsers
    });
  };

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
            <button
              onClick={() => setActiveSection('database')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'database'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🗄️</span>
                <span>DB 현황</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('info')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'info'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📌</span>
                <span>유용한 정보</span>
              </div>
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveSection('users')}
                className={`px-4 py-4 text-center font-semibold transition-colors ${
                  activeSection === 'users'
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">👥</span>
                  <span>사용자 관리</span>
                </div>
              </button>
            )}
            <button
              onClick={() => setActiveSection('scheduler')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
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
              onClick={() => setActiveSection('settings')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'settings'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">⚙️</span>
                <span>설정</span>
              </div>
            </button>
          </div>
        </div>


        {/* Database Section */}
        {activeSection === "database" && (
          <DatabaseSection status={status} refresh={refresh} isAdmin={isAdmin} />
        )}




        {/* Info Section - Useful Links */}
        {activeSection === "info" && <UsefulLinksSection />}

        {/* Users Section - User Management */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                사용자 관리
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                시스템 사용자 계정을 관리하세요
              </p>
            </div>

            {usersLoading ? (
              <LoadingSpinner color="rose-600" />
            ) : users.length === 0 ? (
              <EmptyState
                icon="👥"
                title="등록된 사용자가 없습니다"
                description="첫 번째 사용자를 등록해보세요"
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>👥</span>
                    <span>전체 사용자 ({users.length})</span>
                  </h3>
                </div>

                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">이름</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">이메일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">역할</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">승인 상태</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">활성화</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">마지막 로그인</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">가입일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">관리</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={user.role}
                                onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="GUEST">게스트 (격리)</option>
                                <option value="FAMILY">패밀리 (공유)</option>
                                <option value="ADMIN">관리자</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.isApproved ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  ✅ 승인됨
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleUserApprove(user.id, true)}
                                  className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                                >
                                  ⏳ 승인 대기
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleUserActivate(user.id, !user.isActive)}
                                className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                                  user.isActive
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {user.isActive ? '🟢 활성화' : '⚫ 비활성화'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.lastLoginAt
                                  ? new Date(user.lastLoginAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                                  : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(user.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleUserDelete(user.id)}
                                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors font-medium"
                              >
                                🗑️ 삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scheduler Section */}
        {activeSection === 'scheduler' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                스케줄러 및 알림 관리
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                자동 크롤링 스케줄과 Discord 알림을 설정하세요
              </p>
            </div>

            <SchedulerSettings />
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                시스템 설정
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                테마, 알림, 언어 및 개인정보 설정을 관리하세요
              </p>
            </div>

            <SystemSettings />
          </div>
        )}

        {/* Database Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    ⚠️ 데이터베이스 초기화
                  </h2>
                  <p className="text-red-100 text-sm mt-1">
                    이 작업은 되돌릴 수 없습니다
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
                    다음 데이터가 모두 삭제됩니다:
                  </h3>
                  <ul className="space-y-1 text-red-800 dark:text-red-300">
                    <li>• 등록된 모든 단지 (Complex)</li>
                    <li>• 수집된 모든 매물 (Article)</li>
                    <li>• 즐겨찾기 정보 (Favorite)</li>
                    <li>• 크롤링 히스토리 (CrawlHistory)</li>
                    <li>• 알림 설정 및 로그 (Alert, NotificationLog)</li>
                    <li>• 스케줄 설정 및 로그 (Schedule, ScheduleLog)</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteFilesOption}
                        onChange={(e) => setDeleteFilesOption(e.target.checked)}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        레거시 파일도 초기화 (favorites.json 등)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      계속하려면 <span className="font-bold text-red-600">RESET DATABASE</span>를 입력하세요:
                    </label>
                    <input
                      type="text"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="RESET DATABASE"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowResetModal(false);
                      setResetConfirmText('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDatabaseReset}
                    disabled={resetConfirmText !== 'RESET DATABASE' || isResetting}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        초기화 중...
                      </>
                    ) : (
                      '데이터베이스 초기화'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete File Confirmation Dialog */}
      <Dialog
        isOpen={deleteFileDialog.isOpen}
        onClose={() => setDeleteFileDialog({ isOpen: false, filename: null })}
        onConfirm={confirmDelete}
        title="파일 삭제"
        description={`${deleteFileDialog.filename} 파일을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        isOpen={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        title="파일 일괄 삭제"
        description={`선택한 ${selectedFiles.size}개 파일을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />


        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
