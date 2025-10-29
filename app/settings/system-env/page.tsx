"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AuthGuard } from "@/components/AuthGuard";
import { showError } from "@/lib/toast";
import {
  Lock,
  Key,
  Database,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader,
} from "lucide-react";

interface SystemEnvConfig {
  key: string;
  value: string;
  displayName: string;
  description: string | null;
  category: string;
  isSecret: boolean;
  canView: boolean;
  editGuide: string;
}

const CATEGORY_INFO: Record<string, { label: string; icon: any; color: string }> = {
  security: { label: "보안 설정", icon: Lock, color: "red" },
  infrastructure: { label: "인프라", icon: Database, color: "purple" },
  api: { label: "공공 API 키", icon: Key, color: "blue" },
  crawler: { label: "크롤러 설정", icon: SettingsIcon, color: "green" },
};

export default function SystemEnvPage() {
  const { data: session } = useSession();
  const [configs, setConfigs] = useState<SystemEnvConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedGuides, setExpandedGuides] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchConfigs();
  }, [selectedCategory]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === "all"
        ? "/api/system-env-config"
        : `/api/system-env-config?category=${selectedCategory}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setConfigs(data.data);
      } else {
        showError(data.error || "시스템 환경 변수 조회 실패");
      }
    } catch (error) {
      showError("시스템 환경 변수 조회 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const toggleGuide = (key: string) => {
    const newExpanded = new Set(expandedGuides);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGuides(newExpanded);
  };

  // 관리자 권한 확인
  if (session?.user?.role !== "ADMIN") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Navigation />
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center py-12">
              <Lock className="w-16 h-16 mx-auto text-red-500" />
              <h1 className="text-2xl font-bold mt-4">접근 권한 없음</h1>
              <p className="text-gray-600 mt-2">관리자만 접근할 수 있습니다.</p>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </AuthGuard>
    );
  }

  // 카테고리별 그룹화
  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, SystemEnvConfig[]>);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navigation />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* 헤더 */}
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: "설정", href: "/settings/env-config" },
                { label: "시스템 환경 변수" },
              ]}
            />
            <div className="mt-4">
              <h1 className="text-3xl font-bold text-gray-900">시스템 환경 변수</h1>
              <p className="text-gray-600 mt-2">
                config.env 파일의 시스템 설정을 조회합니다 (관리자 전용)
              </p>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900">주의</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  시스템 환경 변수는 웹 UI에서 편집할 수 없습니다.
                  SSH를 통해 config.env 파일을 직접 수정해야 하며,
                  변경 후에는 반드시 컨테이너를 재시작해야 합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300"
              }`}
            >
              전체
            </button>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === key
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300"
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>

          {/* 설정 목록 */}
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedConfigs).map(([category, items]) => {
                const categoryInfo = CATEGORY_INFO[category];
                if (!categoryInfo) return null;

                const Icon = categoryInfo.icon;

                return (
                  <section key={category}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {categoryInfo.label}
                    </h2>

                    <div className="space-y-3">
                      {items.map(config => {
                        const isExpanded = expandedGuides.has(config.key);

                        return (
                          <div
                            key={config.key}
                            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                          >
                            <div className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono font-bold text-gray-800">
                                      {config.key}
                                    </code>
                                    {!config.canView && (
                                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                        조회 불가
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {config.description}
                                  </p>
                                  {config.canView && (
                                    <div className="mt-2">
                                      <span className="text-xs text-gray-500">현재 값:</span>
                                      <code className="ml-2 px-3 py-1 bg-gray-100 rounded text-sm font-mono">
                                        {config.value}
                                      </code>
                                    </div>
                                  )}
                                </div>

                                {config.canView && (
                                  <button
                                    onClick={() => toggleGuide(config.key)}
                                    className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                                  >
                                    편집 방법 보기
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* 편집 가이드 */}
                            {isExpanded && config.editGuide && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <div className="prose prose-sm max-w-none">
                                  <div className="whitespace-pre-wrap text-sm text-gray-700">
                                    {config.editGuide}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
