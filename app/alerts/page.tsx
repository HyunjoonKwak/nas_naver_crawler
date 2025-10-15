"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui";

interface Alert {
  id: string;
  name: string;
  complexIds: string[];
  tradeTypes: string[];
  isActive: boolean;
  webhookUrl: string | null;
  createdAt: string;
}

interface Complex {
  complexNo: string;
  complexName: string;
}

export default function AlertsPage() {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "매물 변경 알림",
    tradeTypes: [] as string[],
    webhookUrl: "",
    isActive: true,
  });

  const [testingWebhook, setTestingWebhook] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 알림 목록 조회 (1개만 있을 것)
      const alertsResponse = await fetch("/api/alerts");
      const alertsData = await alertsResponse.json();
      const alerts = alertsData.alerts || [];

      if (alerts.length > 0) {
        const existingAlert = alerts[0];
        setCurrentAlert(existingAlert);
        setFormData({
          name: existingAlert.name,
          tradeTypes: existingAlert.tradeTypes,
          webhookUrl: existingAlert.webhookUrl || "",
          isActive: existingAlert.isActive,
        });
      }

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

  const handleSave = async () => {
    // 관심단지가 없으면 알림 생성 불가
    if (complexes.length === 0) {
      window.alert("관심단지가 없습니다. 먼저 단지 목록 페이지에서 관심단지를 등록해주세요.");
      return;
    }

    if (!formData.webhookUrl) {
      window.alert("Discord 웹훅 URL을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      // 관심단지 전체를 자동으로 사용
      const complexIds = complexes.map((c) => c.complexNo);

      const payload = {
        name: formData.name,
        complexIds: complexIds,
        tradeTypes: formData.tradeTypes,
        minPrice: null,
        maxPrice: null,
        minArea: null,
        maxArea: null,
        notifyWebhook: !!formData.webhookUrl,
        webhookUrl: formData.webhookUrl || null,
      };

      const url = currentAlert ? `/api/alerts/${currentAlert.id}` : "/api/alerts";
      const method = currentAlert ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        window.alert("알림 설정이 저장되었습니다!");
        fetchData();
      } else {
        const data = await response.json();
        window.alert(data.error || "알림 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save alert:", error);
      window.alert("알림 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!currentAlert) return;

    try {
      const response = await fetch(`/api/alerts/${currentAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !formData.isActive }),
      });

      if (response.ok) {
        setFormData({ ...formData, isActive: !formData.isActive });
        window.alert("알림 상태가 변경되었습니다.");
        fetchData();
      } else {
        window.alert("알림 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to toggle alert:", error);
      window.alert("알림 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleTestWebhook = async () => {
    if (!formData.webhookUrl) {
      window.alert("웹훅 URL을 입력해주세요.");
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
        window.alert("테스트 알림이 전송되었습니다! Discord를 확인해주세요.");
      } else {
        const data = await response.json();
        window.alert(data.error || "테스트 알림 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to test webhook:", error);
      window.alert("테스트 알림 전송 중 오류가 발생했습니다.");
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">알림 설정을 불러오는 중...</p>
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
                  매물 변경 시 실시간 Discord 알림
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                🏠 홈
              </Link>
              <Link
                href="/complexes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                🏘️ 단지 목록
              </Link>
              <Link
                href="/scheduler"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
              >
                ⏰ 스케줄러
              </Link>
              <Link
                href="/system"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
              >
                ⚙️ 시스템
              </Link>
              {/* 다크모드 토글 버튼 */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 알림 상태 표시 */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {formData.isActive ? "🔔" : "🔕"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formData.isActive ? "알림 활성화됨" : "알림 비활성화됨"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentAlert
                    ? `${new Date(currentAlert.createdAt).toLocaleDateString("ko-KR")} 설정됨`
                    : "아직 알림이 설정되지 않았습니다"}
                </p>
              </div>
            </div>
            {currentAlert && (
              <button
                onClick={handleToggleActive}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  formData.isActive
                    ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {formData.isActive ? "🔕 비활성화" : "🔔 활성화"}
              </button>
            )}
          </div>
        </div>

        {/* 알림 설정 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            알림 설정
          </h3>

          {/* 알림 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              알림 이름
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              placeholder="예: 매물 변경 알림"
            />
          </div>

          {/* 알림 단지 (관심단지 자동 사용) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                알림 대상 단지
              </label>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                ✓ 관심단지 {complexes.length}개 자동 적용
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                💡 <strong>관심단지 목록</strong>의 모든 단지에 대해 알림을 보냅니다.
                단지를 추가하거나 제거하려면 <strong>단지 목록</strong> 페이지에서 관심 등록을 변경하세요.
              </p>
              {complexes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {complexes.map((complex) => (
                    <span
                      key={complex.complexNo}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800"
                    >
                      ⭐ {complex.complexName}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">
                    ⚠️ 관심 등록된 단지가 없습니다
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    단지 목록 페이지에서 먼저 관심단지를 등록해주세요
                  </p>
                  <Link
                    href="/complexes"
                    className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                  >
                    단지 목록으로 이동
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 거래 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              거래 유형
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              선택한 거래 유형의 매물만 알림을 받습니다. 선택하지 않으면 모든 거래 유형을 알립니다.
            </p>
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
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-gray-900 dark:text-white font-medium">{type}</span>
                </label>
              ))}
            </div>
            {formData.tradeTypes.length > 0 && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                ✓ {formData.tradeTypes.join(", ")} 매물만 알림
              </p>
            )}
            {formData.tradeTypes.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                → 모든 거래 유형 알림
              </p>
            )}
          </div>

          {/* Discord 웹훅 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Discord 웹훅 URL *
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Discord 서버 설정 → 연동 → 웹훅에서 웹훅 URL을 복사하여 입력하세요.
            </p>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              placeholder="https://discord.com/api/webhooks/..."
            />
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook || !formData.webhookUrl}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold text-sm"
            >
              {testingWebhook ? "전송 중..." : "🧪 테스트 알림 보내기"}
            </button>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all font-semibold shadow-lg"
            >
              {saving ? "저장 중..." : currentAlert ? "💾 설정 업데이트" : "✅ 알림 설정 저장"}
            </button>
          </div>
        </div>

        {/* 알림 동작 안내 */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 알림이 언제 발송되나요?
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• <strong>스케줄러가 크롤링을 실행</strong>할 때마다 변경사항을 감지합니다</li>
            <li>• <strong>신규 매물</strong>이 등록되면 Discord로 알림을 보냅니다</li>
            <li>• <strong>매물이 삭제</strong>되면 (거래 완료 가능성) 알림을 보냅니다</li>
            <li>• <strong>가격이 변경</strong>되면 변경 내역과 함께 알림을 보냅니다</li>
            <li>• 거래 유형을 선택하면 해당 유형의 매물만 알림합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
