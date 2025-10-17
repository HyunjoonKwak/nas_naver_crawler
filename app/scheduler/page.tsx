"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle, Dialog } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { useCrawlEvents } from "@/hooks/useCrawlEvents";

interface Schedule {
  id: string;
  name: string;
  complexNos: string[];
  complexes: Array<{ complexNo: string; complexName: string }>;
  cronExpr: string;
  cronDescription: string;
  isActive: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
  logs: ScheduleLog[];
}

interface ScheduleLog {
  id: string;
  status: string;
  duration: number;
  articlesCount: number | null;
  errorMessage: string | null;
  executedAt: string;
}

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

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<"scheduler" | "alerts">("scheduler");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  // SSE: 실시간 크롤링 이벤트 구독 (스케줄 완료 시 자동 갱신)
  useCrawlEvents(() => {
    console.log('[SCHEDULER] Crawl/Schedule complete event received, refreshing data...');
    fetchData();
  });

  // 알림 상태
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Dialog 상태
  const [deleteScheduleDialog, setDeleteScheduleDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [runNowDialog, setRunNowDialog] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // 스케줄 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    complexNos: [] as string[],
    cronExpr: "0 9 * * *", // 기본값: 매일 오전 9시
    selectedDays: [0, 1, 2, 3, 4, 5, 6] as number[], // 0=일요일, 6=토요일
    selectedHour: 9,
    selectedMinute: 0,
  });

  // 알림 폼 상태
  const [alertFormData, setAlertFormData] = useState({
    name: "매물 변경 알림",
    tradeTypes: [] as string[],
    webhookUrl: "",
    isActive: true,
  });

  // 요일 목록
  const weekDays = [
    { label: "일", value: 0 },
    { label: "월", value: 1 },
    { label: "화", value: 2 },
    { label: "수", value: 3 },
    { label: "목", value: 4 },
    { label: "금", value: 5 },
    { label: "토", value: 6 },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[SCHEDULER] 데이터 조회 시작');

      // 스케줄 목록 조회
      console.log('[SCHEDULER] /api/schedules 호출');
      const schedulesResponse = await fetch("/api/schedules");
      const schedulesData = await schedulesResponse.json();
      setSchedules(schedulesData.schedules || []);
      console.log('[SCHEDULER] 스케줄 목록 조회 완료:', { count: schedulesData.schedules?.length || 0 });

      // 알림 목록 조회
      const alertsResponse = await fetch("/api/alerts");
      const alertsData = await alertsResponse.json();
      const alerts = alertsData.alerts || [];
      if (alerts.length > 0) {
        const existingAlert = alerts[0];
        setCurrentAlert(existingAlert);
        setAlertFormData({
          name: existingAlert.name,
          tradeTypes: existingAlert.tradeTypes,
          webhookUrl: existingAlert.webhookUrl || "",
          isActive: existingAlert.isActive,
        });
      }

      // 단지 목록 조회 (DB에서 읽기)
      console.log('[SCHEDULER] /api/favorites 호출 (DB에서 읽기)');
      const favResponse = await fetch("/api/favorites");
      const favData = await favResponse.json();
      const favoriteComplexes = favData.favorites || [];
      console.log('[SCHEDULER] 관심단지 조회 완료:', {
        count: favoriteComplexes.length,
        favorites: favoriteComplexes.map((f: any) => ({
          complexNo: f.complexNo,
          complexName: f.complexName,
          order: f.order
        }))
      });

      // 단지 상세 정보 조회
      console.log('[SCHEDULER] /api/results 호출 (단지명 매칭용)');
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
      console.log('[SCHEDULER] 최종 단지 목록 설정 완료:', {
        count: complexList.length,
        complexes: complexList
      });
    } catch (error) {
      console.error("[SCHEDULER] Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cron 표현식을 요일/시간으로 파싱
  const parseCronExpr = (cronExpr: string) => {
    const parts = cronExpr.split(" ");
    if (parts.length === 5) {
      const minute = parseInt(parts[0]) || 0;
      const hour = parseInt(parts[1]) || 9;
      const dayOfWeek = parts[4];

      let days: number[] = [];
      if (dayOfWeek === "*") {
        days = [0, 1, 2, 3, 4, 5, 6];
      } else {
        const dayParts = dayOfWeek.split(",");
        days = dayParts.map((d) => parseInt(d));
      }

      return { minute, hour, days };
    }
    return { minute: 0, hour: 9, days: [0, 1, 2, 3, 4, 5, 6] };
  };

  // 요일/시간을 Cron 표현식으로 변환
  const buildCronExpr = (days: number[], hour: number, minute: number) => {
    const dayStr = days.length === 7 ? "*" : days.sort().join(",");
    return `${minute} ${hour} * * ${dayStr}`;
  };

  const handleOpenModal = (schedule?: Schedule) => {
    // 현재 관심단지 목록을 자동으로 사용
    const currentFavoriteComplexNos = complexes.map((c) => c.complexNo);

    if (schedule) {
      // 수정 모드
      setEditingSchedule(schedule);
      const parsed = parseCronExpr(schedule.cronExpr);
      setFormData({
        name: schedule.name,
        complexNos: currentFavoriteComplexNos, // 관심단지로 자동 설정
        cronExpr: schedule.cronExpr,
        selectedDays: parsed.days,
        selectedHour: parsed.hour,
        selectedMinute: parsed.minute,
      });
    } else {
      // 생성 모드
      setEditingSchedule(null);
      setFormData({
        name: "",
        complexNos: currentFavoriteComplexNos, // 관심단지로 자동 설정
        cronExpr: "0 9 * * *",
        selectedDays: [0, 1, 2, 3, 4, 5, 6],
        selectedHour: 9,
        selectedMinute: 0,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 관심단지가 없으면 스케줄 생성 불가
    if (complexes.length === 0) {
      showError("관심단지가 없습니다. 먼저 단지 목록 페이지에서 관심단지를 등록해주세요.");
      return;
    }

    // 요일/시간 선택으로부터 Cron 표현식 생성
    const cronExpr = buildCronExpr(formData.selectedDays, formData.selectedHour, formData.selectedMinute);

    const loadingToast = showLoading(editingSchedule ? "스케줄 수정 중..." : "스케줄 생성 중...");
    try {
      const payload = {
        name: formData.name,
        complexNos: formData.complexNos,
        cronExpr: cronExpr,
      };

      const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : "/api/schedules";
      const method = editingSchedule ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(editingSchedule ? "스케줄이 수정되었습니다!" : "스케줄이 생성되었습니다!");
        handleCloseModal();
        fetchData();
      } else {
        const data = await response.json();
        showError(data.error || "스케줄 저장에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to save schedule:", error);
      showError("스케줄 저장 중 오류가 발생했습니다.");
    }
  };

  const handleToggleActive = async (schedule: Schedule) => {
    const loadingToast = showLoading("스케줄 상태 변경 중...");
    try {
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.isActive }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(schedule.isActive ? "스케줄이 비활성화되었습니다." : "스케줄이 활성화되었습니다.");
        fetchData();
      } else {
        showError("스케줄 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to toggle schedule:", error);
      showError("스케줄 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteScheduleDialog({ isOpen: true, id });
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleDialog.id) return;

    const loadingToast = showLoading("스케줄 삭제 중...");
    try {
      const response = await fetch(`/api/schedules?id=${deleteScheduleDialog.id}`, {
        method: "DELETE",
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess("스케줄이 삭제되었습니다.");
        fetchData();
      } else {
        showError("스케줄 삭제에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to delete schedule:", error);
      showError("스케줄 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteScheduleDialog({ isOpen: false, id: null });
    }
  };

  const handleRunNow = (id: string) => {
    setRunNowDialog({ isOpen: true, id });
  };

  const confirmRunNow = async () => {
    if (!runNowDialog.id) return;

    const loadingToast = showLoading("스케줄 실행 중...");
    try {
      setRunningScheduleId(runNowDialog.id);
      const response = await fetch(`/api/schedules/${runNowDialog.id}/run`, {
        method: "POST",
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess("스케줄이 실행되었습니다! 잠시 후 결과를 확인하세요.");
        await fetchData();
      } else {
        showError("스케줄 실행에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to run schedule:", error);
      showError("스케줄 실행 중 오류가 발생했습니다.");
    } finally {
      setRunningScheduleId(null);
      setRunNowDialog({ isOpen: false, id: null });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });
  };

  // 알림 저장 핸들러
  const handleSaveAlert = async () => {
    if (complexes.length === 0) {
      showError("관심단지가 없습니다. 먼저 단지 목록 페이지에서 관심단지를 등록해주세요.");
      return;
    }

    if (!alertFormData.webhookUrl) {
      showError("Discord 웹훅 URL을 입력해주세요.");
      return;
    }

    const loadingToast = showLoading("알림 설정 저장 중...");
    try {
      setSaving(true);
      const complexIds = complexes.map((c) => c.complexNo);

      const payload = {
        name: alertFormData.name,
        complexIds: complexIds,
        tradeTypes: alertFormData.tradeTypes,
        minPrice: null,
        maxPrice: null,
        minArea: null,
        maxArea: null,
        notifyWebhook: !!alertFormData.webhookUrl,
        webhookUrl: alertFormData.webhookUrl || null,
      };

      const url = currentAlert ? `/api/alerts/${currentAlert.id}` : "/api/alerts";
      const method = currentAlert ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess("알림 설정이 저장되었습니다!");
        fetchData();
      } else {
        const data = await response.json();
        showError(data.error || "알림 저장에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to save alert:", error);
      showError("알림 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 알림 활성화/비활성화 토글
  const handleToggleAlert = async () => {
    if (!currentAlert) return;

    const loadingToast = showLoading("알림 상태 변경 중...");
    try {
      const response = await fetch(`/api/alerts/${currentAlert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alertFormData.isActive }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        setAlertFormData({ ...alertFormData, isActive: !alertFormData.isActive });
        showSuccess("알림 상태가 변경되었습니다.");
        fetchData();
      } else {
        showError("알림 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to toggle alert:", error);
      showError("알림 상태 변경 중 오류가 발생했습니다.");
    }
  };

  // 웹훅 테스트
  const handleTestWebhook = async () => {
    if (!alertFormData.webhookUrl) {
      showError("웹훅 URL을 입력해주세요.");
      return;
    }

    const loadingToast = showLoading("테스트 알림 전송 중...");
    try {
      setTestingWebhook(true);

      const response = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: alertFormData.webhookUrl,
          testType: "summary",
        }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess("테스트 알림이 전송되었습니다! Discord를 확인해주세요.");
      } else {
        const data = await response.json();
        showError(data.error || "테스트 알림 전송에 실패했습니다.");
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error("Failed to test webhook:", error);
      showError("테스트 알림 전송 중 오류가 발생했습니다.");
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">스케줄 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("scheduler")}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === "scheduler"
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                ⏰ 스케줄 관리
              </span>
              {activeTab === "scheduler" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-600 to-emerald-600"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-6 py-3 font-semibold transition-all relative ${
                activeTab === "alerts"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                🔔 알림 설정
              </span>
              {activeTab === "alerts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* 스케줄러 탭 콘텐츠 */}
        {activeTab === "scheduler" && (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">스케줄 목록</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {schedules.length}개의 스케줄이 등록되어 있습니다
                </p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
              >
                ➕ 새 스케줄 만들기
              </button>
            </div>

        {/* 스케줄 목록 */}
        {schedules.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-7xl mb-4">⏰</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              등록된 스케줄이 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              새 스케줄을 만들어 자동 크롤링을 시작하세요
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
            >
              ➕ 첫 스케줄 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                {/* 스케줄 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {schedule.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {schedule.cronDescription}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(schedule)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        schedule.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {schedule.isActive ? "✓ 활성" : "✗ 비활성"}
                    </button>
                  </div>
                </div>

                {/* 단지 목록 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🏘️ 크롤링 단지
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {schedule.complexes.map((complex) => (
                      <span
                        key={complex.complexNo}
                        className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium"
                      >
                        {complex.complexName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 실행 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">마지막 실행:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {formatDate(schedule.lastRun)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">다음 실행:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {formatDate(schedule.nextRun)}
                    </span>
                  </div>
                </div>

                {/* 최근 실행 로그 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📊 최근 실행: {schedule.logs.length}건
                  </h4>
                  {schedule.logs.length > 0 && (
                    <div className="space-y-1">
                      {schedule.logs.slice(0, 3).map((log) => (
                        <div
                          key={log.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded px-2 py-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  log.status === "success"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              ></span>
                              <span className="text-gray-600 dark:text-gray-300">
                                {formatDate(log.executedAt)}
                              </span>
                            </span>
                            <span className="font-semibold">
                              {log.status === "success" ? (
                                log.articlesCount !== null && log.articlesCount > 0 ? (
                                  <span className="text-gray-900 dark:text-white">
                                    {log.articlesCount}개 매물
                                  </span>
                                ) : (
                                  <span className="text-orange-600 dark:text-orange-400">
                                    매물 없음
                                  </span>
                                )
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  크롤링 실패
                                </span>
                              )}
                            </span>
                          </div>
                          {log.status === "failed" && log.errorMessage && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                              💬 {log.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    disabled={runningScheduleId === schedule.id}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                      runningScheduleId === schedule.id
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {runningScheduleId === schedule.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        실행 중...
                      </span>
                    ) : (
                      '▶️ 즉시 실행'
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(schedule)}
                    disabled={runningScheduleId === schedule.id}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                      runningScheduleId === schedule.id
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    disabled={runningScheduleId === schedule.id}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                      runningScheduleId === schedule.id
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}

        {/* 알림 탭 콘텐츠 */}
        {activeTab === "alerts" && (
          <>
            {/* 알림 상태 표시 */}
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {alertFormData.isActive ? "🔔" : "🔕"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {alertFormData.isActive ? "알림 활성화됨" : "알림 비활성화됨"}
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
                    onClick={handleToggleAlert}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      alertFormData.isActive
                        ? "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {alertFormData.isActive ? "🔕 비활성화" : "🔔 활성화"}
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
                  value={alertFormData.name}
                  onChange={(e) => setAlertFormData({ ...alertFormData, name: e.target.value })}
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
                        checked={alertFormData.tradeTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAlertFormData({
                              ...alertFormData,
                              tradeTypes: [...alertFormData.tradeTypes, type],
                            });
                          } else {
                            setAlertFormData({
                              ...alertFormData,
                              tradeTypes: alertFormData.tradeTypes.filter((t) => t !== type),
                            });
                          }
                        }}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-900 dark:text-white font-medium">{type}</span>
                    </label>
                  ))}
                </div>
                {alertFormData.tradeTypes.length > 0 && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    ✓ {alertFormData.tradeTypes.join(", ")} 매물만 알림
                  </p>
                )}
                {alertFormData.tradeTypes.length === 0 && (
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
                  value={alertFormData.webhookUrl}
                  onChange={(e) => setAlertFormData({ ...alertFormData, webhookUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !alertFormData.webhookUrl}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  {testingWebhook ? "전송 중..." : "🧪 테스트 알림 보내기"}
                </button>
              </div>

              {/* 저장 버튼 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveAlert}
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
          </>
        )}
      </div>

      {/* 스케줄 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-2xl font-bold text-white">
                {editingSchedule ? "스케줄 수정" : "새 스케줄 만들기"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 스케줄 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  스케줄 이름 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="예: 매일 오전 크롤링"
                />
              </div>

              {/* 크롤링 단지 (관심단지 자동 사용) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    크롤링 단지 (관심단지 자동 사용)
                  </label>
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                    ✓ 총 {complexes.length}개 단지
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    💡 스케줄러는 자동으로 <strong>관심단지 목록</strong>의 모든 단지를 크롤링합니다.
                    단지를 추가하거나 제거하려면 <strong>단지 목록</strong> 페이지에서 관심 등록을 변경하세요.
                  </p>
                  {complexes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {complexes.map((complex) => (
                        <span
                          key={complex.complexNo}
                          className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium border border-green-200 dark:border-green-800"
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
                    </div>
                  )}
                </div>
              </div>

              {/* 실행 요일 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  실행 요일 *
                </label>
                <div className="flex gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const isSelected = formData.selectedDays.includes(day.value);
                        setFormData({
                          ...formData,
                          selectedDays: isSelected
                            ? formData.selectedDays.filter((d) => d !== day.value)
                            : [...formData.selectedDays, day.value],
                        });
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                        formData.selectedDays.includes(day.value)
                          ? "bg-green-100 border-green-600 text-green-800 dark:bg-green-900/30 dark:border-green-500 dark:text-green-400"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {formData.selectedDays.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">최소 하나의 요일을 선택해주세요</p>
                )}
              </div>

              {/* 실행 시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  실행 시간 *
                </label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">시</label>
                    <select
                      value={formData.selectedHour}
                      onChange={(e) =>
                        setFormData({ ...formData, selectedHour: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}시
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">분</label>
                    <select
                      value={formData.selectedMinute}
                      onChange={(e) =>
                        setFormData({ ...formData, selectedMinute: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}분
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  선택된 요일의 {formData.selectedHour.toString().padStart(2, "0")}:
                  {formData.selectedMinute.toString().padStart(2, "0")}에 실행됩니다
                </p>
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                >
                  {editingSchedule ? "수정하기" : "만들기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Schedule Confirmation Dialog */}
      <Dialog
        isOpen={deleteScheduleDialog.isOpen}
        onClose={() => setDeleteScheduleDialog({ isOpen: false, id: null })}
        onConfirm={confirmDeleteSchedule}
        title="스케줄 삭제"
        description="이 스케줄을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Run Now Confirmation Dialog */}
      <Dialog
        isOpen={runNowDialog.isOpen}
        onClose={() => setRunNowDialog({ isOpen: false, id: null })}
        onConfirm={confirmRunNow}
        title="스케줄 즉시 실행"
        description="이 스케줄을 지금 실행하시겠습니까?"
        confirmText="실행"
        cancelText="취소"
        variant="default"
      />
    </div>
  );
}
