"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { Bell, Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Alert {
  id: string;
  name: string;
  complexIds: string[];
  tradeTypes: string[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  isActive: boolean;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  notifyWebhook: boolean;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alerts');
      const data = await response.json();

      if (response.ok && data.success) {
        setAlerts(data.alerts || []);
      } else {
        showError(data.error || '알림 목록 조회 실패');
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      showError('알림 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    const loadingToast = showLoading(isActive ? '알림 비활성화 중...' : '알림 활성화 중...');

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(isActive ? '알림이 비활성화되었습니다.' : '알림이 활성화되었습니다.');
        fetchAlerts();
      } else {
        const data = await response.json();
        showError(data.error || '알림 상태 변경 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to toggle alert:', error);
      showError('알림 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('정말 이 알림을 삭제하시겠습니까?')) return;

    const loadingToast = showLoading('알림 삭제 중...');

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('알림이 삭제되었습니다.');
        fetchAlerts();
      } else {
        const data = await response.json();
        showError(data.error || '알림 삭제 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to delete alert:', error);
      showError('알림 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
        <Navigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  알림 설정
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  가격 변동, 새 매물 등록 시 실시간 알림을 받아보세요
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>새 알림 만들기</span>
              </button>
            </div>
          </div>

          {/* 안내 배너 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  알림 기능 안내
                </h3>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• <strong>가격 변동 알림</strong>: 설정한 가격 범위에 새 매물이 등록되면 알림</li>
                  <li>• <strong>새 매물 알림</strong>: 관심 단지에 새 매물이 올라오면 즉시 알림</li>
                  <li>• <strong>브라우저 알림</strong>: 웹사이트 방문 시 실시간 알림 (권한 필요)</li>
                  <li>• <strong>이메일 알림</strong>: 등록한 이메일로 알림 발송 (준비 중)</li>
                  <li>• <strong>웹훅 알림</strong>: Slack, Discord 등 외부 서비스 연동 (준비 중)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 알림 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                설정된 알림이 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                "새 알림 만들기" 버튼을 클릭하여 첫 알림을 설정하세요
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>새 알림 만들기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* 알림 헤더 */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {alert.name}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              alert.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {alert.isActive ? '활성' : '비활성'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>단지 {alert.complexIds.length}개</span>
                          <span>•</span>
                          <span>거래 유형: {alert.tradeTypes.join(', ')}</span>
                          {alert.minPrice && alert.maxPrice && (
                            <>
                              <span>•</span>
                              <span>
                                가격: {(alert.minPrice / 10000).toFixed(0)}억 ~ {(alert.maxPrice / 10000).toFixed(0)}억
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAlert(alert.id, alert.isActive)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            alert.isActive
                              ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                              : 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400'
                          }`}
                        >
                          {alert.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        >
                          {expandedAlert === alert.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 알림 상세 정보 (확장 시) */}
                  {expandedAlert === alert.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            알림 채널
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  alert.notifyBrowser ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              ></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                브라우저 알림
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  alert.notifyEmail ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              ></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                이메일 알림
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  alert.notifyWebhook ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                              ></div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                웹훅 알림
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            생성 정보
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div>생성일: {new Date(alert.createdAt).toLocaleDateString('ko-KR')}</div>
                            <div>수정일: {new Date(alert.updatedAt).toLocaleDateString('ko-KR')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
