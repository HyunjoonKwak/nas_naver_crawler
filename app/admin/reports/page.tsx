"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showError, showSuccess } from "@/lib/toast";

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  post?: {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name: string;
    };
  };
  comment?: {
    id: string;
    content: string;
    postId: string;
    author: {
      id: string;
      name: string;
    };
  };
}

const REASON_LABELS: Record<string, string> = {
  SPAM: "스팸/도배",
  ABUSE: "욕설/비방",
  INAPPROPRIATE: "부적절한 내용",
  COPYRIGHT: "저작권 침해",
  FRAUD: "사기/허위정보",
  ETC: "기타",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기중",
  IN_REVIEW: "검토중",
  RESOLVED: "처리완료",
  REJECTED: "반려",
};

export default function AdminReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"post" | "comment">("post");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/home");
      return;
    }
    fetchReports();
  }, [isAdmin, filter, statusFilter]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ type: filter });
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/admin/reports?${params}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
      } else {
        showError(data.error || "신고 목록을 불러오는데 실패했습니다");
      }
    } catch (error: any) {
      console.error("Failed to fetch reports:", error);
      showError("신고 목록을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (
    reportId: string,
    type: "post" | "comment",
    status: string
  ) => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          type,
          status,
        }),
      });

      if (response.ok) {
        showSuccess("신고 상태가 업데이트되었습니다");
        fetchReports();
      } else {
        showError("상태 업데이트에 실패했습니다");
      }
    } catch (error: any) {
      console.error("Failed to update status:", error);
      showError("상태 업데이트에 실패했습니다");
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AuthGuard requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                신고 관리
              </h1>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter("post")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === "post"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    게시글 신고
                  </button>
                  <button
                    onClick={() => setFilter("comment")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === "comment"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    댓글 신고
                  </button>
                </div>

                <select
                  value={statusFilter || ""}
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">전체 상태</option>
                  <option value="PENDING">대기중</option>
                  <option value="IN_REVIEW">검토중</option>
                  <option value="RESOLVED">처리완료</option>
                  <option value="REJECTED">반려</option>
                </select>
              </div>
            </div>

            {/* Reports List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400">신고가 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => (
                  <div key={report.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {REASON_LABELS[report.reason]}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              report.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : report.status === "IN_REVIEW"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : report.status === "RESOLVED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {STATUS_LABELS[report.status]}
                          </span>
                        </div>

                        {/* Reported Content */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-3">
                          {report.post && (
                            <>
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                게시글: {report.post.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {report.post.content}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                작성자: {report.post.author.name}
                              </p>
                            </>
                          )}
                          {report.comment && (
                            <>
                              <p className="text-sm text-gray-900 dark:text-white mb-1">
                                {report.comment.content}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                작성자: {report.comment.author.name}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Report Details */}
                        {report.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            신고 내용: {report.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          신고자: {report.reporter.name} |{" "}
                          {new Date(report.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        {report.post && (
                          <Link
                            href={`/community/${report.post.id}`}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-center"
                            target="_blank"
                          >
                            게시글 보기
                          </Link>
                        )}
                        {report.comment && (
                          <Link
                            href={`/community/${report.comment.postId}#comment-${report.comment.id}`}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-center"
                            target="_blank"
                          >
                            댓글 보기
                          </Link>
                        )}

                        {report.status !== "RESOLVED" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(report.id, filter, "RESOLVED")
                            }
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            처리완료
                          </button>
                        )}
                        {report.status !== "REJECTED" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(report.id, filter, "REJECTED")
                            }
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            반려
                          </button>
                        )}
                        {report.status === "PENDING" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(report.id, filter, "IN_REVIEW")
                            }
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            검토중으로
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
