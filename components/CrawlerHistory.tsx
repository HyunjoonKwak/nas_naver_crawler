"use client";

import { useEffect, useState } from "react";
import PropertyDetail from "./PropertyDetail";

interface CrawlerHistoryProps {
  refresh: number;
}

interface CrawlResult {
  filename: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  data: any;
}

export default function CrawlerHistory({ refresh }: CrawlerHistoryProps) {
  const [results, setResults] = useState<CrawlResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<CrawlResult | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [refresh]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    
    // 확인 다이얼로그
    const confirmed = window.confirm(
      `이 파일을 삭제하시겠습니까?\n\n${filename}\n\n삭제된 파일은 복구할 수 없습니다.`
    );
    
    if (!confirmed) return;
    
    setDeleting(filename);
    try {
      const response = await fetch(`/api/results?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 삭제 성공 - 목록 새로고침
        await fetchResults();
      } else {
        alert(`삭제 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
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
      timeZone: 'Asia/Seoul',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getComplexInfo = (result: CrawlResult) => {
    if (Array.isArray(result.data)) {
      if (result.data.length > 0 && result.data[0].overview) {
        return {
          name: result.data[0].overview.complexName,
          count: result.data.length,
          complexNo: result.data[0].overview.complexNo,
        };
      }
    } else if (result.data?.overview) {
      return {
        name: result.data.overview.complexName,
        count: 1,
        complexNo: result.data.overview.complexNo,
      };
    }
    return { name: '알 수 없음', count: 0, complexNo: '' };
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          크롤링 히스토리
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={fetchResults}
          className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors font-semibold"
        >
          🔄 새로고침
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <div className="text-7xl mb-4">📭</div>
          <p className="text-xl font-semibold mb-2">크롤링 데이터가 없습니다</p>
          <p className="text-sm">위에서 단지 번호를 입력하여 크롤링을 시작하세요</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수집일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  파일크기
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result, index) => {
                const info = getComplexInfo(result);
                const isDeleting = deleting === result.filename;
                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {info.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {info.complexNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(result.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatSize(result.size)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {info.count}개
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          📋 상세보기
                        </button>
                        <a
                          href={`/api/download?filename=${encodeURIComponent(result.filename)}`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium inline-block"
                        >
                          💾 다운로드
                        </a>
                        <button
                          onClick={(e) => handleDelete(result.filename, e)}
                          disabled={isDeleting}
                          className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                            isDeleting
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {isDeleting ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for detailed view */}
      {selectedResult && (
        <PropertyDetail 
          data={selectedResult.data}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}

