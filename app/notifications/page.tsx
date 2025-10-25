"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { AuthGuard } from "@/components/AuthGuard";
import { showError, showSuccess } from "@/lib/toast";

interface Notification {
  id: string;
  type: "COMMENT" | "ACCEPTED" | "NOTICE";
  message: string;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session, pagination.page, filter]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filter === "unread") {
        params.append("unreadOnly", "true");
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setPagination(data.pagination);
        setUnreadCount(data.unreadCount);
      } else {
        showError(data.error || "알림을 불러오는데 실패했습니다");
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      showError("알림을 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error: any) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        showSuccess("모든 알림을 읽음 처리했습니다");
        fetchNotifications();
      }
    } catch (error: any) {
      console.error("Failed to mark all as read:", error);
      showError("알림 처리에 실패했습니다");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm("이 알림을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showSuccess("알림을 삭제했습니다");
        fetchNotifications();
      }
    } catch (error: any) {
      console.error("Failed to delete notification:", error);
      showError("알림 삭제에 실패했습니다");
    }
  };

  const handleDeleteAllRead = async () => {
    if (!confirm("읽은 알림을 모두 삭제하시겠습니까?")) return;

    try {
      const response = await fetch("/api/notifications?deleteAll=true", {
        method: "DELETE",
      });

      if (response.ok) {
        showSuccess("읽은 알림을 모두 삭제했습니다");
        fetchNotifications();
      }
    } catch (error: any) {
      console.error("Failed to delete all:", error);
      showError("알림 삭제에 실패했습니다");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // 게시글로 이동
    if (notification.postId) {
      router.push(`/community/${notification.postId}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "COMMENT":
        return "💬";
      case "ACCEPTED":
        return "✅";
      case "NOTICE":
        return "📢";
      default:
        return "🔔";
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  알림
                </h1>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      모두 읽음
                    </button>
                  )}
                  <button
                    onClick={handleDeleteAllRead}
                    className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    읽은 알림 삭제
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFilter("all");
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  전체 ({pagination.total})
                </button>
                <button
                  onClick={() => {
                    setFilter("unread");
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === "unread"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  읽지 않음 ({unreadCount})
                </button>
              </div>
            </div>

            {/* Notifications List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400">
                  {filter === "unread" ? "읽지 않은 알림이 없습니다" : "알림이 없습니다"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      !notification.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleNotificationClick(notification)}
                          className="w-full text-left"
                        >
                          <p className="text-sm text-gray-900 dark:text-white mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.createdAt).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            읽음
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />
      </div>
    </AuthGuard>
  );
}
