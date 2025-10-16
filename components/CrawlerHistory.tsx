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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<Record<string, any>>({});
  const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set());

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

  // 크롤링 시작 시간으로 타임스탬프 생성
  const generateTimestamp = (createdAt: string) => {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}${second}`;
  };

  const toggleRow = async (itemId: string, timestamp: string) => {
    const newExpandedRows = new Set(expandedRows);

    if (expandedRows.has(itemId)) {
      // 닫기
      newExpandedRows.delete(itemId);
      setExpandedRows(newExpandedRows);
    } else {
      // 열기
      newExpandedRows.add(itemId);
      setExpandedRows(newExpandedRows);

      // 파일 내용 로드 (아직 로드하지 않은 경우)
      if (!fileContents[itemId]) {
        await fetchFileContentsByTimestamp(itemId, timestamp);
      }
    }
  };

  const fetchFileContentsByTimestamp = async (itemId: string, timestamp: string) => {
    setLoadingFiles(new Set(loadingFiles).add(itemId));

    try {
      // 타임스탬프로 파일들을 검색
      const response = await fetch(`/api/csv?timestamp=${encodeURIComponent(timestamp)}`);

      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        setFileContents(prev => ({ ...prev, [itemId]: [] }));
        return;
      }

      const data = await response.json();
      console.log(`[CrawlerHistory] Fetched files for timestamp ${timestamp}:`, data);

      if (data.files && data.files.length > 0) {
        // 파일별로 레이블 추가
        const filesWithLabels = data.files.map((file: any) => {
          let label = file.filename;
          if (file.filename.includes('complexes') && file.type === 'json') {
            label = '단지 정보 (JSON)';
          } else if (file.filename.includes('complexes') && file.type === 'csv') {
            label = '단지 정보 (CSV)';
          } else if (file.filename.includes('articles') && file.type === 'json') {
            label = '매물 정보 (JSON)';
          } else if (file.filename.includes('articles') && file.type === 'csv') {
            label = '매물 정보 (CSV)';
          }
          return {
            name: file.filename,
            label,
            data: file
          };
        });

        setFileContents(prev => ({
          ...prev,
          [itemId]: filesWithLabels
        }));
      } else {
        console.warn(`[CrawlerHistory] No files found for timestamp ${timestamp}`);
        // 빈 배열로 설정하여 "파일을 불러올 수 없습니다" 메시지 표시
        setFileContents(prev => ({
          ...prev,
          [itemId]: []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setFileContents(prev => ({
        ...prev,
        [itemId]: []
      }));
    } finally {
      const newLoadingFiles = new Set(loadingFiles);
      newLoadingFiles.delete(itemId);
      setLoadingFiles(newLoadingFiles);
    }
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => {
                const progressPercent = item.totalComplexes > 0
                  ? Math.round((item.processedComplexes / item.totalComplexes) * 100)
                  : 0;

                return (
                  <>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(item.status === 'completed' || item.status === 'success') && (
                        <button
                          onClick={() => toggleRow(item.id, generateTimestamp(item.createdAt))}
                          className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors font-semibold inline-flex items-center gap-1"
                          title="크롤링 결과 파일 보기"
                        >
                          {expandedRows.has(item.id) ? '📤 닫기' : '📄 파일 보기'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* 확장된 행 - 파일 내용 표시 */}
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-gray-50 dark:bg-gray-900">
                      <td colSpan={8} className="px-4 py-4">
                        {loadingFiles.has(item.id) ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600 dark:text-gray-400">파일 로딩 중...</span>
                          </div>
                        ) : fileContents[item.id] && fileContents[item.id].length > 0 ? (
                          <div className="space-y-6">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                              📦 크롤링 결과 파일 ({fileContents[item.id].length}개)
                            </h4>

                            {/* 파일 목록을 그리드로 표시 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {fileContents[item.id].map((file: any, index: number) => (
                                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  {/* 파일 헤더 */}
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span>{file.data.type === 'json' ? '📄' : '📊'}</span>
                                        <span>{file.label}</span>
                                      </h5>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {(file.data.size / 1024).toFixed(2)} KB
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {file.name}
                                    </div>
                                  </div>

                                  {/* 파일 내용 */}
                                  <div className="p-4 max-h-80 overflow-auto">
                                    {file.data.type === 'json' ? (
                                      <div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                          {Array.isArray(file.data.data)
                                            ? `${file.data.data.length}개 항목`
                                            : 'JSON 객체'}
                                        </div>
                                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                                          {JSON.stringify(file.data.data, null, 2)}
                                        </pre>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                          {file.data.rowCount}개 행 × {file.data.headers?.length || 0}개 열
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="min-w-full text-xs">
                                            <thead className="bg-gray-100 dark:bg-gray-700">
                                              <tr>
                                                {file.data.headers?.map((header: string, i: number) => (
                                                  <th key={i} className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
                                                    {header}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {file.data.data?.slice(0, 10).map((row: any, i: number) => (
                                                <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                                                  {file.data.headers?.map((header: string, j: number) => (
                                                    <td key={j} className="px-2 py-1 text-gray-700 dark:text-gray-300">
                                                      {row[header]}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          {file.data.data?.length > 10 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                              ... 외 {file.data.data.length - 10}개 행
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            파일을 불러올 수 없습니다.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

