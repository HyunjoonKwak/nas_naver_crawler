"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AuthGuard } from "@/components/AuthGuard";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { ENV_TEMPLATES, getTemplate, getAllCategories } from "@/lib/env-templates";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Webhook,
  Mail,
  Network,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";

interface UserEnvConfigItem {
  id: string;
  userId: string;
  key: string;
  value: string;
  displayName: string;
  description: string | null;
  category: string;
  isSecret: boolean;
  inputGuide: string | null;
  placeholder: string | null;
  validation: string | null;
  helpUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  webhook: Webhook,
  notification: Mail,
  network: Network,
};

export default function MyEnvConfigPage() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<UserEnvConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [view, setView] = useState<"list" | "template" | "form">("list");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [editingConfig, setEditingConfig] = useState<UserEnvConfigItem | null>(null);
  const [revealedValues, setRevealedValues] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // 폼 상태
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    displayName: "",
    description: "",
    category: "webhook",
    isSecret: true,
    inputGuide: "",
    placeholder: "",
    validation: "",
    helpUrl: "",
  });

  useEffect(() => {
    if (view === "list") {
      fetchConfigs();
    }
  }, [view, selectedCategory]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === "all"
        ? "/api/user-env-config"
        : `/api/user-env-config?category=${selectedCategory}`;

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

  const handleSelectTemplate = (key: string) => {
    const template = getTemplate(key);
    if (template) {
      setFormData({
        key: template.key,
        displayName: template.displayName,
        category: template.category,
        isSecret: template.isSecret,
        description: template.description,
        inputGuide: template.inputGuide,
        placeholder: template.placeholder,
        validation: template.validation,
        helpUrl: template.helpUrl || "",
        value: "",
      });
      setSelectedTemplate(key);
      setView("form");
    }
  };

  const handleValueChange = (value: string) => {
    setFormData({ ...formData, value });

    // 실시간 검증
    if (formData.validation) {
      try {
        const regex = new RegExp(formData.validation);
        if (!regex.test(value)) {
          setValidationError("형식이 올바르지 않습니다");
        } else {
          setValidationError("");
        }
      } catch {
        setValidationError("");
      }
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const loadingToast = showLoading("연결 테스트 중...");

    try {
      const response = await fetch("/api/user-env-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: formData.key,
          value: formData.value,
        }),
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess(data.message);
      } else {
        showError(data.error);
      }
    } catch (error) {
      dismissToast(loadingToast);
      showError("테스트 실패");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.value) {
      showError("값을 입력해주세요");
      return;
    }

    if (validationError) {
      showError("입력값을 확인해주세요");
      return;
    }

    const loadingToast = showLoading(editingConfig ? "수정 중..." : "저장 중...");

    try {
      const url = editingConfig
        ? "/api/user-env-config"
        : "/api/user-env-config";

      const method = editingConfig ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingConfig ? { ...formData, id: editingConfig.id } : formData),
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess(data.message);
        setView("list");
        setEditingConfig(null);
        fetchConfigs();
      } else {
        showError(data.error);
      }
    } catch (error) {
      dismissToast(loadingToast);
      showError("저장 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    const loadingToast = showLoading("삭제 중...");

    try {
      const response = await fetch(`/api/user-env-config?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess(data.message);
        fetchConfigs();
      } else {
        showError(data.error);
      }
    } catch (error) {
      dismissToast(loadingToast);
      showError("삭제 실패");
    }
  };

  const handleReveal = async (id: string) => {
    try {
      const response = await fetch(`/api/user-env-config/${id}/reveal`);
      const data = await response.json();

      if (data.success) {
        setConfigs(prev => prev.map(config =>
          config.id === id ? { ...config, value: data.data.value } : config
        ));
        setRevealedValues(prev => new Set(prev).add(id));
      } else {
        showError(data.error);
      }
    } catch (error) {
      showError("값 조회 실패");
    }
  };

  const template = getTemplate(selectedTemplate);
  const categories = getAllCategories();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* 헤더 */}
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: "설정", href: "/settings/env-config" },
                { label: "내 환경 변수" },
              ]}
            />
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">내 환경 변수</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                웹훅, 이메일 알림 등 개인 설정을 관리합니다
              </p>
            </div>
          </div>

          {/* 목록 뷰 */}
          {view === "list" && (
            <div>
              {/* 액션 버튼 */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    전체
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === cat.value
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setView("template")}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 설정 추가
                </button>
              </div>

              {/* 설정 목록 */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
                </div>
              ) : configs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Settings className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">설정이 없습니다</p>
                  <button
                    onClick={() => setView("template")}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    첫 설정 추가하기
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {configs.map(config => {
                    const Icon = CATEGORY_ICONS[config.category] || Settings;
                    const isRevealed = revealedValues.has(config.id);

                    return (
                      <div
                        key={config.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{config.displayName}</h3>
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                                {config.category}
                              </span>
                            </div>
                            {config.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{config.description}</p>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                                {config.value}
                              </code>
                              {config.isSecret && !isRevealed && (
                                <button
                                  onClick={() => handleReveal(config.id)}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(config.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 템플릿 선택 뷰 */}
          {view === "template" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">설정 템플릿 선택</h2>
                <button
                  onClick={() => setView("list")}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ENV_TEMPLATES.map(tmpl => {
                  const Icon = CATEGORY_ICONS[tmpl.category] || Settings;
                  return (
                    <button
                      key={tmpl.key}
                      onClick={() => handleSelectTemplate(tmpl.key)}
                      className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{tmpl.displayName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tmpl.description}</p>
                          {tmpl.testable && (
                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              연결 테스트 가능
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 입력 폼 뷰 */}
          {view === "form" && template && (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{template.displayName} 설정</h2>
                <button
                  onClick={() => {
                    setView("list");
                    setSelectedTemplate("");
                    setFormData({
                      key: "",
                      value: "",
                      displayName: "",
                      description: "",
                      category: "webhook",
                      isSecret: true,
                      inputGuide: "",
                      placeholder: "",
                      validation: "",
                      helpUrl: "",
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 가이드 섹션 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  입력 가이드
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{template.inputGuide}</div>
                </div>
                {template.helpUrl && (
                  <a
                    href={template.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    공식 문서 보기 →
                  </a>
                )}
              </div>

              {/* 입력 폼 */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                  {template.displayName}
                </label>
                <input
                  type={template.isSecret ? "password" : "text"}
                  value={formData.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder={template.placeholder}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {validationError && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {validationError}
                  </div>
                )}
                {!validationError && formData.value && (
                  <div className="mt-2 flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    형식이 올바릅니다
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-4">
                {template.testable && (
                  <button
                    onClick={handleTest}
                    disabled={testing || !formData.value || !!validationError}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        테스트 중...
                      </>
                    ) : (
                      <>연결 테스트</>
                    )}
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!formData.value || !!validationError}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  저장
                </button>
              </div>
            </div>
          )}
        </div>

        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
