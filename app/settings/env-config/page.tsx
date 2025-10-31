"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Key,
  Lock,
  Webhook,
  Bell,
  Code,
} from "lucide-react";

interface EnvConfigItem {
  id: string;
  key: string;
  value: string;
  displayName: string;
  description: string | null;
  category: string;
  isSecret: boolean;
  isActive: boolean;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "api", label: "API 키", icon: Key, color: "blue" },
  { value: "webhook", label: "웹훅", icon: Webhook, color: "green" },
  { value: "notification", label: "알림", icon: Bell, color: "yellow" },
  { value: "system", label: "시스템", icon: Settings, color: "gray" },
  { value: "other", label: "기타", icon: Code, color: "purple" },
];

export default function EnvConfigPage() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<EnvConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EnvConfigItem | null>(null);
  const [revealedValues, setRevealedValues] = useState<Set<string>>(new Set());

  // 폼 상태
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    displayName: "",
    description: "",
    category: "api",
    isSecret: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, [selectedCategory]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === "all"
        ? "/api/env-config"
        : `/api/env-config?category=${selectedCategory}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setConfigs(data.data);
      } else {
        showError(data.error || "환경 변수 조회 실패");
      }
    } catch (error) {
      showError("환경 변수 조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.key || !formData.value || !formData.displayName) {
      showError("필수 항목을 모두 입력해주세요");
      return;
    }

    const loadingToast = showLoading("환경 변수 생성 중...");
    try {
      const response = await fetch("/api/env-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("환경 변수가 생성되었습니다");
        setShowAddModal(false);
        resetForm();
        fetchConfigs();
      } else {
        showError(data.error || "생성 실패");
      }
    } catch (error) {
      showError("환경 변수 생성 중 오류가 발생했습니다");
    } finally {
      dismissToast(loadingToast);
    }
  };

  const handleUpdate = async () => {
    if (!editingConfig) return;

    const loadingToast = showLoading("환경 변수 업데이트 중...");
    try {
      const response = await fetch("/api/env-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingConfig.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("환경 변수가 업데이트되었습니다");
        setShowEditModal(false);
        setEditingConfig(null);
        resetForm();
        fetchConfigs();
      } else {
        showError(data.error || "업데이트 실패");
      }
    } catch (error) {
      showError("환경 변수 업데이트 중 오류가 발생했습니다");
    } finally {
      dismissToast(loadingToast);
    }
  };

  const handleDelete = async (id: string, displayName: string) => {
    if (!confirm(`"${displayName}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    const loadingToast = showLoading("삭제 중...");
    try {
      const response = await fetch(`/api/env-config?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showSuccess("환경 변수가 삭제되었습니다");
        fetchConfigs();
      } else {
        showError(data.error || "삭제 실패");
      }
    } catch (error) {
      showError("환경 변수 삭제 중 오류가 발생했습니다");
    } finally {
      dismissToast(loadingToast);
    }
  };

  const revealValue = async (id: string) => {
    try {
      const response = await fetch(`/api/env-config/${id}/reveal`);
      const data = await response.json();

      if (data.success) {
        // 실제 값으로 업데이트
        setConfigs(prev => prev.map(config =>
          config.id === id ? { ...config, value: data.data.value } : config
        ));
        setRevealedValues(prev => new Set(prev).add(id));
      } else {
        showError(data.error || "값 조회 실패");
      }
    } catch (error) {
      showError("값 조회 중 오류가 발생했습니다");
    }
  };

  const hideValue = (id: string) => {
    setRevealedValues(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchConfigs(); // 다시 마스킹된 값으로 불러오기
  };

  const openEditModal = (config: EnvConfigItem) => {
    setEditingConfig(config);
    setFormData({
      key: config.key,
      value: "", // 보안상 빈 값으로 시작
      displayName: config.displayName,
      description: config.description || "",
      category: config.category,
      isSecret: config.isSecret,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      key: "",
      value: "",
      displayName: "",
      description: "",
      category: "api",
      isSecret: true,
    });
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat || CATEGORIES[CATEGORIES.length - 1];
  };

  const filteredConfigs = selectedCategory === "all"
    ? configs
    : configs.filter(c => c.category === selectedCategory);

  // 관리자 권한 체크
  if ((session?.user as any)?.role !== "ADMIN") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              접근 권한 없음
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              이 페이지는 관리자만 접근할 수 있습니다.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <MobileNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb
              items={[
                { label: "설정", href: "/settings" },
                { label: "환경 변수 관리" },
              ]}
            />
          </div>

          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  환경 변수 관리
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  API 키, 웹훅 URL 등 각종 환경 설정을 관리합니다
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                추가
              </button>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              전체
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* 환경 변수 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                등록된 환경 변수가 없습니다
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredConfigs.map((config) => {
                const catInfo = getCategoryIcon(config.category);
                const CategoryIcon = catInfo.icon;
                const isRevealed = revealedValues.has(config.id);

                return (
                  <div
                    key={config.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CategoryIcon className={`w-5 h-5 text-${catInfo.color}-600`} />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {config.displayName}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full bg-${catInfo.color}-100 dark:bg-${catInfo.color}-900/30 text-${catInfo.color}-700 dark:text-${catInfo.color}-400`}>
                            {catInfo.label}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400 font-mono">
                              {config.key}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded font-mono text-xs">
                              {config.value}
                            </code>
                            {config.isSecret && (
                              <button
                                onClick={() => isRevealed ? hideValue(config.id) : revealValue(config.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                title={isRevealed ? "숨기기" : "표시하기"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                )}
                              </button>
                            )}
                          </div>

                          {config.description && (
                            <p className="text-gray-600 dark:text-gray-400">
                              {config.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
                            <span>수정: {new Date(config.updatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openEditModal(config)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id, config.displayName)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    환경 변수 추가
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      카테고리 *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      키 (KEY) *
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      placeholder="OPENDATA_SERVICE_KEY"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      표시 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="공공데이터 서비스 키"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      값 (VALUE) *
                    </label>
                    <textarea
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      rows={3}
                      placeholder="실제 키 값 입력..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      설명
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      placeholder="이 환경 변수에 대한 설명..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isSecret"
                      checked={formData.isSecret}
                      onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isSecret" className="text-sm text-gray-700 dark:text-gray-300">
                      민감 정보 (화면에서 마스킹)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCreate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 수정 모달 (추가 모달과 유사하지만 key는 수정 불가) */}
        {showEditModal && editingConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    환경 변수 수정
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingConfig(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      키 (KEY)
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      표시 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      값 (VALUE) - 새 값 입력 시에만 업데이트됨
                    </label>
                    <textarea
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      rows={3}
                      placeholder="새 값을 입력하세요 (빈 칸이면 기존 값 유지)"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      설명
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isSecretEdit"
                      checked={formData.isSecret}
                      onChange={(e) => setFormData({ ...formData, isSecret: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isSecretEdit" className="text-sm text-gray-700 dark:text-gray-300">
                      민감 정보 (화면에서 마스킹)
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleUpdate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingConfig(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
