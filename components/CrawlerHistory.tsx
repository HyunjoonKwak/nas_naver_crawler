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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          크롤링 히스토리
        </h2>
        <button
          onClick={fetchResults}
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          🔄 새로고침
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">📭 크롤링 데이터가 없습니다.</p>
          <p className="text-sm">위에서 단지 번호를 입력하여 크롤링을 시작하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result, index) => {
            const info = getComplexInfo(result);
            const isDeleting = deleting === result.filename;
            return (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedResult(result)}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {info.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>📌 {info.complexNo}</span>
                      <span>📊 {info.count}개 단지</span>
                      <span>📁 {formatSize(result.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{formatDate(result.createdAt)}</p>
                      <p className="text-xs mt-1">{result.filename}</p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(result.filename, e)}
                      disabled={isDeleting}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        isDeleting
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
                      }`}
                      title="삭제"
                    >
                      {isDeleting ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

