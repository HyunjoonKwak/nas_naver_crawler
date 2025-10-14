"use client";

import { useEffect, useState } from "react";

interface CrawlerHistoryProps {
  refresh: number;
}

interface CrawlHistoryItem {
  id: string;
  status: string;
  totalComplexes: number;
  processedComplexes: number;
  totalArticles: number;
  processedArticles: number;
  duration: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  currentStep: string | null;
}

export default function CrawlerHistory({ refresh }: CrawlerHistoryProps) {
  const [history, setHistory] = useState<CrawlHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [refresh]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/crawl-history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch crawl history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: '대기중', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: '⏳' },
      crawling: { label: '크롤링중', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: '🔄' },
      saving: { label: '저장중', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '💾' },
      success: { label: '완료', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: '✅' },
      completed: { label: '완료', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: '✅' },
      partial: { label: '부분완료', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: '⚠️' },
      failed: { label: '실패', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: '❌' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.color} inline-flex items-center gap-1`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={fetchHistory}
          className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors font-semibold"
        >
          🔄 새로고침
        </button>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          총 <span className="font-semibold text-blue-600 dark:text-blue-400">{history.length}</span>개의 크롤링 기록
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <div className="text-7xl mb-4">📭</div>
          <p className="text-xl font-semibold mb-2">크롤링 기록이 없습니다</p>
          <p className="text-sm">단지 번호를 입력하여 크롤링을 시작하세요</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  시작 시간
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  소요 시간
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  매물 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  진행률
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  마지막 단계
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => {
                const progressPercent = item.totalComplexes > 0
                  ? Math.round((item.processedComplexes / item.totalComplexes) * 100)
                  : 0;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-300">
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDuration(item.duration)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{item.processedComplexes}</span>
                        <span className="text-gray-500 dark:text-gray-400"> / {item.totalComplexes}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold text-green-600 dark:text-green-400">{item.processedArticles}</span>
                        {item.totalArticles > 0 && (
                          <span className="text-gray-500 dark:text-gray-400"> / {item.totalArticles}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              item.status === 'completed' || item.status === 'success'
                                ? 'bg-green-500'
                                : item.status === 'partial'
                                ? 'bg-orange-500'
                                : item.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {item.currentStep || '-'}
                      </div>
                      {item.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs truncate" title={item.errorMessage}>
                          ⚠️ {item.errorMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

