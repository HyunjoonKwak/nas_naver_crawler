"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useApiCall } from "@/hooks/useApiCall";
import { showError } from "@/lib/toast";

export const UserManagementSection = () => {
  const { handleApiCall } = useApiCall();
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

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
  );
};
