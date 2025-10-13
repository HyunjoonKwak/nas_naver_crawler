"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Alert {
  id: string;
  name: string;
  complexIds: string[];
  complexes: Array<{ complexNo: string; complexName: string }>;
  tradeTypes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  isActive: boolean;
  notifyWebhook: boolean;
  webhookUrl: string | null;
  createdAt: string;
  logs: any[];
}

interface Complex {
  complexNo: string;
  complexName: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    complexIds: [] as string[],
    tradeTypes: [] as string[],
    minPrice: "",
    maxPrice: "",
    minArea: "",
    maxArea: "",
    webhookUrl: "",
  });

  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 알림 목록 조회
      const alertsResponse = await fetch("/api/alerts");
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts || []);

      // 단지 목록 조회 (favorites에서)
      const favResponse = await fetch("/api/favorites");
      const favData = await favResponse.json();
      const favoriteComplexes = favData.favorites || [];

      // 단지 상세 정보 조회
      const complexResponse = await fetch("/api/results");
      const complexData = await complexResponse.json();
      const results = complexData.results || [];

      const complexList = favoriteComplexes.map((fav: any) => {
        const result = results.find((r: any) => r.overview?.complexNo === fav.complexNo);
        return {
          complexNo: fav.complexNo,
          complexName: result?.overview?.complexName || fav.complexName || `단지 ${fav.complexNo}`,
        };
      });

      setComplexes(complexList);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (alert?: Alert) => {
    if (alert) {
      // 수정 모드
      setEditingAlert(alert);
      setFormData({
        name: alert.name,
        complexIds: alert.complexIds,
        tradeTypes: alert.tradeTypes,
        minPrice: alert.minPrice?.toString() || "",
        maxPrice: alert.maxPrice?.toString() || "",
        minArea: alert.minArea?.toString() || "",
        maxArea: alert.maxArea?.toString() || "",
        webhookUrl: alert.webhookUrl || "",
      });
    } else {
      // 생성 모드
      setEditingAlert(null);
      setFormData({
        name: "",
        complexIds: [],
        tradeTypes: [],
        minPrice: "",
        maxPrice: "",
        minArea: "",
        maxArea: "",
        webhookUrl: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAlert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        complexIds: formData.complexIds,
        tradeTypes: formData.tradeTypes,
        minPrice: formData.minPrice ? parseInt(formData.minPrice) : null,
        maxPrice: formData.maxPrice ? parseInt(formData.maxPrice) : null,
        minArea: formData.minArea ? parseFloat(formData.minArea) : null,
        maxArea: formData.maxArea ? parseFloat(formData.maxArea) : null,
        notifyWebhook: !!formData.webhookUrl,
        webhookUrl: formData.webhookUrl || null,
      };

      const url = editingAlert ? `/api/alerts/${editingAlert.id}` : "/api/alerts";
      const method = editingAlert ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(editingAlert ? "알림이 수정되었습니다!" : "알림이 생성되었습니다!");
        handleCloseModal();
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "알림 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save alert:", error);
      alert("알림 저장 중 오류가 발생했습니다.");
    }
  };

  const handleToggleActive = async (alert: Alert) => {
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alert.isActive }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert("알림 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to toggle alert:", error);
      alert("알림 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 알림을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/alerts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("알림이 삭제되었습니다.");
        fetchData();
      } else {
        alert("알림 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete alert:", error);
      alert("알림 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleTestWebhook = async () => {
    if (!formData.webhookUrl) {
      alert("웹훅 URL을 입력해주세요.");
      return;
    }

    try {
      setTestingWebhook(true);

      const response = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          testType: "summary",
        }),
      });

      if (response.ok) {
        alert("테스트 알림이 전송되었습니다! Discord를 확인해주세요.");
      } else {
        const data = await response.json();
        alert(data.error || "테스트 알림 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to test webhook:", error);
      alert("테스트 알림 전송 중 오류가 발생했습니다.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    const uk = Math.floor(price / 10000);
    const man = price % 10000;
    if (uk === 0) return `${man}만`;
    if (man === 0) return `${uk}억`;
    return `${uk}억 ${man}만`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">알림 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                🔔
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">알림 설정</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  매물 변경 시 실시간 알림 받기
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 홈
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              알림 목록
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {alerts.length}개의 알림이 등록되어 있습니다
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-semibold shadow-lg"
          >
            ➕ 새 알림 만들기
          </button>
        </div>

        {/* 알림 목록 */}
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-7xl mb-4">🔕</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              등록된 알림이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              새 알림을 만들어 매물 변경을 실시간으로 받아보세요
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-semibold shadow-lg"
            >
              ➕ 첫 알림 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                {/* 알림 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {alert.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(alert.createdAt).toLocaleDateString("ko-KR")} 생성
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(alert)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        alert.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {alert.isActive ? "✓ 활성" : "✗ 비활성"}
                    </button>
                  </div>
                </div>

                {/* 단지 목록 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🏘️ 관심 단지
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {alert.complexes.map((complex) => (
                      <span
                        key={complex.complexNo}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium"
                      >
                        {complex.complexName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 조건 */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">거래유형:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {alert.tradeTypes.length > 0 ? alert.tradeTypes.join(", ") : "전체"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">가격:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {alert.minPrice || alert.maxPrice
                        ? `${formatPrice(alert.minPrice)} ~ ${formatPrice(alert.maxPrice)}`
                        : "제한없음"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">면적:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {alert.minArea || alert.maxArea
                        ? `${alert.minArea || 0}㎡ ~ ${alert.maxArea || "∞"}㎡`
                        : "제한없음"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">웹훅:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {alert.notifyWebhook ? "✓ 활성" : "✗ 비활성"}
                    </span>
                  </div>
                </div>

                {/* 최근 알림 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📊 최근 알림: {alert.logs.length}건
                  </h4>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(alert)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm"
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold text-sm"
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 알림 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-2xl font-bold text-white">
                {editingAlert ? "알림 수정" : "새 알림 만들기"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 알림 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  알림 이름 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="예: 강남 아파트 전세 알림"
                />
              </div>

              {/* 관심 단지 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  관심 단지 선택 * (복수 선택 가능)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {complexes.map((complex) => (
                    <label
                      key={complex.complexNo}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
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
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900 dark:text-white">{complex.complexName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 거래 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  거래 유형 (선택안하면 전체)
                </label>
                <div className="flex gap-4">
                  {["매매", "전세", "월세"].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
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
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900 dark:text-white">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 가격 범위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최소 가격 (만원)
                  </label>
                  <input
                    type="number"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최대 가격 (만원)
                  </label>
                  <input
                    type="number"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 50000"
                  />
                </div>
              </div>

              {/* 면적 범위 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최소 면적 (㎡)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minArea}
                    onChange={(e) => setFormData({ ...formData, minArea: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최대 면적 (㎡)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxArea}
                    onChange={(e) => setFormData({ ...formData, maxArea: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    placeholder="예: 100"
                  />
                </div>
              </div>

              {/* Discord 웹훅 URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord 웹훅 URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !formData.webhookUrl}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  {testingWebhook ? "전송 중..." : "🧪 테스트 알림 보내기"}
                </button>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                >
                  {editingAlert ? "수정하기" : "만들기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
