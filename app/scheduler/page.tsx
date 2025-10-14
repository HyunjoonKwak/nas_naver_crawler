"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

interface Complex {
  complexNo: string;
  complexName: string;
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    complexNos: [] as string[],
    cronExpr: "0 9 * * *", // 기본값: 매일 오전 9시
    selectedDays: [0, 1, 2, 3, 4, 5, 6] as number[], // 0=일요일, 6=토요일
    selectedHour: 9,
    selectedMinute: 0,
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

      // 단지 목록 조회 (favorites.json에서 읽기)
      console.log('[SCHEDULER] /api/favorites 호출 (favorites.json 읽기)');
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
      alert("관심단지가 없습니다. 먼저 단지 목록 페이지에서 관심단지를 등록해주세요.");
      return;
    }

    // 요일/시간 선택으로부터 Cron 표현식 생성
    const cronExpr = buildCronExpr(formData.selectedDays, formData.selectedHour, formData.selectedMinute);

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

      if (response.ok) {
        alert(editingSchedule ? "스케줄이 수정되었습니다!" : "스케줄이 생성되었습니다!");
        handleCloseModal();
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || "스케줄 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save schedule:", error);
      alert("스케줄 저장 중 오류가 발생했습니다.");
    }
  };

  const handleToggleActive = async (schedule: Schedule) => {
    try {
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.isActive }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert("스케줄 상태 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
      alert("스케줄 상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/schedules?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("스케줄이 삭제되었습니다.");
        fetchData();
      } else {
        alert("스케줄 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      alert("스케줄 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleRunNow = async (id: string) => {
    if (!confirm("이 스케줄을 지금 실행하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/schedules/${id}/run`, {
        method: "POST",
      });

      if (response.ok) {
        alert("스케줄이 실행되었습니다! 잠시 후 결과를 확인하세요.");
        fetchData();
      } else {
        alert("스케줄 실행에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to run schedule:", error);
      alert("스케줄 실행 중 오류가 발생했습니다.");
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
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                ⏰
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">스케줄 크롤링</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  정기 자동 크롤링 설정
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
                href="/alerts"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
              >
                🔔 알림
              </Link>
              <Link
                href="/system"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
              >
                ⚙️ 시스템
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                          className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                        >
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
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {log.articlesCount || 0}개 매물
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-sm"
                  >
                    ▶️ 즉시 실행
                  </button>
                  <button
                    onClick={() => handleOpenModal(schedule)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm"
                  >
                    ✏️ 수정
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
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
    </div>
  );
}
