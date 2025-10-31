"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { LoadingSpinner } from "@/components";
import { EmptyState } from "@/components";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { Bell, Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Alert {
  id: string;
  name: string;
  complexIds: string[];
  complexes?: Complex[]; // API에서 반환하는 실제 단지 정보
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

interface Complex {
  complexNo: string;
  complexName: string;
}

export default function AlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    complexIds: [] as string[],
    tradeTypes: [] as string[],
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    notifyBrowser: true,
    notifyEmail: false,
    notifyWebhook: false,
    webhookUrl: '',
  });

  useEffect(() => {
    fetchAlerts();
    fetchComplexes();
  }, []);

  const fetchComplexes = async () => {
    try {
      const response = await fetch('/api/complexes');
      const data = await response.json();

      if (response.ok && data.complexes) {
        setComplexes(data.complexes);
      }
    } catch (error: any) {
      console.error('Failed to fetch complexes:', error);
    }
  };

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
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error);
      showError('알림 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!formData.name.trim()) {
      showError('알림 이름을 입력해주세요.');
      return;
    }

    if (formData.complexIds.length === 0) {
      showError('최소 1개 이상의 단지를 선택해주세요.');
      return;
    }

    if (formData.notifyWebhook && !formData.webhookUrl.trim()) {
      showError('웹훅 URL을 입력해주세요.');
      return;
    }

    if (formData.notifyWebhook && formData.webhookUrl.trim()) {
      try {
        new URL(formData.webhookUrl);
      } catch {
        showError('올바른 URL 형식을 입력해주세요. (예: https://hooks.slack.com/...)');
        return;
      }
    }

    const loadingToast = showLoading('알림 생성 중...');

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          minPrice: formData.minPrice ? parseInt(formData.minPrice) * 10000 : null,
          maxPrice: formData.maxPrice ? parseInt(formData.maxPrice) * 10000 : null,
          minArea: formData.minArea ? parseFloat(formData.minArea) : null,
          maxArea: formData.maxArea ? parseFloat(formData.maxArea) : null,
        }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('알림이 생성되었습니다.');
        setShowCreateForm(false);
        setFormData({
          name: '',
          complexIds: [],
          tradeTypes: [],
          minPrice: '',
          maxPrice: '',
          minArea: '',
          maxArea: '',
          notifyBrowser: true,
          notifyEmail: false,
          notifyWebhook: false,
          webhookUrl: '',
        });
        fetchAlerts();
      } else {
        const data = await response.json();
        showError(data.error || '알림 생성 실패');
      }
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Failed to create alert:', error);
      showError('알림 생성 중 오류가 발생했습니다.');
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
    } catch (error: any) {
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
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Failed to delete alert:', error);
      showError('알림 삭제 중 오류가 발생했습니다.');
    }
  };

  // 알림에서 유효하지 않은 단지 제거
  const removeInvalidComplexes = async (alertId: string, invalidComplexIds: string[]) => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const validComplexIds = alert.complexIds.filter(id => !invalidComplexIds.includes(id));

    if (validComplexIds.length === 0) {
      showError('최소 1개 이상의 단지가 필요합니다. 알림을 삭제하시겠습니까?');
      return;
    }

    const loadingToast = showLoading('유효하지 않은 단지 제거 중...');

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexIds: validComplexIds }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('유효하지 않은 단지가 제거되었습니다.');
        fetchAlerts();
      } else {
        const data = await response.json();
        showError(data.error || '단지 제거 실패');
      }
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Failed to remove invalid complexes:', error);
      showError('단지 제거 중 오류가 발생했습니다.');
    }
  };

  // 유효하지 않은 단지 ID 찾기
  const getInvalidComplexIds = (alert: Alert): string[] => {
    if (!alert.complexes) return [];
    const validComplexNos = alert.complexes.map(c => c.complexNo);
    return alert.complexIds.filter(id => !validComplexNos.includes(id));
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
                  <li>• <strong>웹훅 알림</strong>: Slack, Discord 등 외부 서비스로 실시간 알림 전송</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 알림 목록 */}
          {loading ? (
            <LoadingSpinner text="알림 목록을 불러오는 중..." />
          ) : alerts.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="설정된 알림이 없습니다"
              description='"새 알림 만들기" 버튼을 클릭하여 첫 알림을 설정하세요'
              action={
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>새 알림 만들기</span>
                </button>
              }
            />
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
                          {(() => {
                            const invalidCount = getInvalidComplexIds(alert).length;
                            if (invalidCount > 0) {
                              return (
                                <>
                                  <span className="text-red-600 dark:text-red-400 font-semibold">
                                    (유효하지 않음: {invalidCount}개)
                                  </span>
                                </>
                              );
                            }
                          })()}
                          <span>•</span>
                          <span>거래 유형: {alert.tradeTypes.length > 0 ? alert.tradeTypes.join(', ') : '전체'}</span>
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
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 단지 목록 */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            설정된 단지 ({alert.complexIds.length}개)
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {alert.complexIds.map((complexId) => {
                              const complex = alert.complexes?.find(c => c.complexNo === complexId);
                              const isInvalid = !complex;
                              return (
                                <div
                                  key={complexId}
                                  className={`flex items-center justify-between p-2 rounded text-sm ${
                                    isInvalid
                                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <div className="flex-1">
                                    {isInvalid ? (
                                      <>
                                        <span className="text-red-600 dark:text-red-400 font-medium">
                                          ⚠️ 단지를 찾을 수 없음
                                        </span>
                                        <span className="text-xs text-red-500 dark:text-red-400 ml-2">
                                          ({complexId})
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-gray-700 dark:text-gray-300">
                                        {complex.complexName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {(() => {
                            const invalidIds = getInvalidComplexIds(alert);
                            if (invalidIds.length > 0) {
                              return (
                                <button
                                  onClick={() => removeInvalidComplexes(alert.id, invalidIds)}
                                  className="mt-3 w-full px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                                >
                                  유효하지 않은 단지 제거 ({invalidIds.length}개)
                                </button>
                              );
                            }
                          })()}
                        </div>

                        <div className="space-y-6">
                          {/* 알림 채널 */}
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

                          {/* 생성 정보 */}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <MobileNavigation />

        {/* 알림 생성 모달 */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
              {/* 헤더 */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b border-blue-500">
                <div>
                  <h2 className="text-2xl font-bold text-white">새 알림 만들기</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    매물 조건을 설정하고 실시간 알림을 받아보세요
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 폼 */}
              <div className="p-6 space-y-6">
                {/* 알림 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    알림 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 강남 3억 이하 매매"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 단지 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    관심 단지 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    {complexes.map((complex) => (
                      <label
                        key={complex.complexNo}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.complexIds.includes(complex.complexNo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                complexIds: [...formData.complexIds, complex.complexNo],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                complexIds: formData.complexIds.filter((id) => id !== complex.complexNo),
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {complex.complexName}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    선택된 단지: {formData.complexIds.length}개
                  </p>
                </div>

                {/* 거래 유형 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    거래 유형 (미선택 시 전체)
                  </label>
                  <div className="flex gap-3">
                    {['매매', '전세', '월세'].map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.tradeTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                tradeTypes: [...formData.tradeTypes, type],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                tradeTypes: formData.tradeTypes.filter((t) => t !== type),
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 가격 범위 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    가격 범위 (억원)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={formData.minPrice}
                      onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                      placeholder="최소 (예: 3)"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={formData.maxPrice}
                      onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                      placeholder="최대 (예: 5)"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 면적 범위 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    면적 범위 (㎡)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={formData.minArea}
                      onChange={(e) => setFormData({ ...formData, minArea: e.target.value })}
                      placeholder="최소 (예: 60)"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={formData.maxArea}
                      onChange={(e) => setFormData({ ...formData, maxArea: e.target.value })}
                      placeholder="최대 (예: 84)"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 알림 채널 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    알림 채널
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifyBrowser}
                        onChange={(e) => setFormData({ ...formData, notifyBrowser: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">브라우저 알림</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-not-allowed opacity-50">
                      <input
                        type="checkbox"
                        checked={formData.notifyEmail}
                        onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">이메일 알림 (준비 중)</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.notifyWebhook}
                        onChange={(e) => setFormData({ ...formData, notifyWebhook: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">웹훅 알림 (Slack, Discord 등)</span>
                    </label>
                  </div>
                </div>

                {/* 웹훅 URL (웹훅 알림 활성화 시) */}
                {formData.notifyWebhook && (
                  <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      웹훅 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://hooks.slack.com/services/... 또는 https://discord.com/api/webhooks/..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      💡 <strong>Slack:</strong> Workspace Settings → Incoming Webhooks에서 생성<br />
                      💡 <strong>Discord:</strong> 채널 설정 → 연동 → 웹후크에서 생성
                    </p>
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateAlert}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  알림 만들기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
