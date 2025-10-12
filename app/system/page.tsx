"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CrawlerHistory from "@/components/CrawlerHistory";

interface StatusData {
  crawler: {
    scriptExists: boolean;
    playwrightReady: boolean;
    ready: boolean;
  };
  data: {
    crawledFilesCount: number;
  };
  status: string;
  crawledDataCount?: number;
  favoritesCount?: number;
  crawledDataSize?: string;
}

interface CSVFile {
  filename: string;
  type: 'csv';
  size: number;
  createdAt: string;
  headers: string[];
  data: { [key: string]: string }[];
  rowCount: number;
}

interface JSONFile {
  filename: string;
  type: 'json';
  size: number;
  createdAt: string;
  data: any;
}

type FileType = CSVFile | JSONFile;

export default function SystemPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'status' | 'data' | 'history'>('status');
  const [refresh, setRefresh] = useState(0);

  // CSV/JSON viewer states
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [jsonFiles, setJsonFiles] = useState<JSONFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 10초마다 업데이트
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSection === 'data') {
      fetchFiles();
    }
  }, [activeSection]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      setFilesLoading(true);
      const response = await fetch('/api/csv');
      const data = await response.json();
      setCsvFiles(data.csvFiles || []);
      setJsonFiles(data.jsonFiles || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${filename} 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/csv', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        if (selectedFile?.filename === filename) {
          setSelectedFile(null);
        }
        await fetchFiles();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('파일 삭제 중 오류가 발생했습니다.');
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
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!selectedFile || selectedFile.type !== 'csv' || !sortColumn) return selectedFile?.type === 'csv' ? selectedFile.data : [];

    const sorted = [...selectedFile.data].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';

      // 숫자로 변환 가능한 경우 숫자로 비교
      const aNum = parseFloat(aVal.replace(/,/g, ''));
      const bNum = parseFloat(bVal.replace(/,/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // 문자열 비교
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal, 'ko')
        : bVal.localeCompare(aVal, 'ko');
    });

    return sorted;
  };

  const renderFileList = (files: FileType[], fileType: 'csv' | 'json') => {
    if (filesLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">로딩 중...</p>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="text-7xl mb-4">📂</div>
          <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">
            {fileType === 'csv' ? 'CSV' : 'JSON'} 파일이 없습니다
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                파일명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                생성일시
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                파일크기
              </th>
              {fileType === 'csv' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  행 개수
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => (
              <tr
                key={file.filename}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                  selectedFile?.filename === file.filename
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
                onClick={() => setSelectedFile(file)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {file.filename}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(file.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatSize(file.size)}
                  </div>
                </td>
                {fileType === 'csv' && file.type === 'csv' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {file.rowCount}행
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {file.type === 'json' && (
                      <a
                        href={`/api/download?filename=${encodeURIComponent(file.filename)}`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        다운로드
                      </a>
                    )}
                    <button
                      onClick={(e) => handleDelete(file.filename, e)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  ⚙️
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    시스템 관리
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    시스템 상태 및 데이터 관리
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 홈
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveSection('status')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeSection === 'status'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">⚙️</span>
                <span>시스템 상태</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('data')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeSection === 'data'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                <span>데이터 뷰어</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeSection === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📚</span>
                <span>크롤링 히스토리</span>
              </div>
            </button>
          </div>
        </div>

        {/* Status Section */}
        {activeSection === 'status' && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      시스템 상태
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      10초마다 자동 업데이트
                    </p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl flex items-center gap-3 ${
                    status?.status === 'ready'
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="text-3xl">
                      {status?.status === 'ready' ? '🟢' : '🔴'}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        전체 상태
                      </div>
                      <div className={`text-xl font-bold ${
                        status?.status === 'ready'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {status?.status === 'ready' ? '정상 작동' : '준비 필요'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crawler Components Status */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  크롤러 구성 요소
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Script Status */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">📄</div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status?.crawler.scriptExists
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {status?.crawler.scriptExists ? '✓ 정상' : '✗ 필요'}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Python 스크립트
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      크롤링 스크립트 파일 존재 여부를 확인합니다.
                    </p>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 text-xs text-gray-500 dark:text-gray-400">
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">
                        logic/nas_playwright_crawler.py
                      </code>
                    </div>
                  </div>

                  {/* Playwright Status */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">🎭</div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status?.crawler.playwrightReady
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {status?.crawler.playwrightReady ? '✓ 정상' : '✗ 필요'}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Playwright
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      브라우저 자동화 라이브러리 설치 상태를 확인합니다.
                    </p>
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700 text-xs text-gray-500 dark:text-gray-400">
                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">
                        pip install playwright
                      </code>
                    </div>
                  </div>

                  {/* Crawler Ready Status */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">🤖</div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status?.crawler.ready
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {status?.crawler.ready ? '✓ 준비됨' : '✗ 필요'}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      크롤러 상태
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      스크립트와 Playwright가 모두 준비되어야 작동합니다.
                    </p>
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 text-xs text-gray-500 dark:text-gray-400">
                      {status?.crawler.ready ? '크롤링 실행 가능' : '설정이 필요합니다'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Statistics */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  데이터 통계
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Crawled Files */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-100 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">📁</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      크롤링 파일
                    </h4>
                    <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                      {status?.crawledDataCount || status?.data.crawledFilesCount || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      수집된 JSON 데이터 파일 개수
                    </p>
                  </div>

                  {/* Favorites */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-pink-100 dark:border-pink-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">⭐</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      선호 단지
                    </h4>
                    <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                      {status?.favoritesCount || 0}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      등록된 관심 단지 개수
                    </p>
                  </div>

                  {/* Disk Usage */}
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-cyan-100 dark:border-cyan-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">💾</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      디스크 사용량
                    </h4>
                    <div className="text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                      {status?.crawledDataSize || '-'}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      크롤링 데이터 저장 공간
                    </p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  시스템 정보
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🐍</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Python 환경
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          크롤링 스크립트 실행 환경
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Python 3.x
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">⚛️</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Next.js 프레임워크
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          웹 애플리케이션 프레임워크
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Next.js 14
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">🐳</div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Docker 컨테이너
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          컨테이너 기반 배포
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      활성화
                    </div>
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-xl border border-blue-200 dark:border-blue-800 p-8">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💡</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      시스템 상태 설명
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <strong className="text-blue-600 dark:text-blue-400">스크립트:</strong>
                        {' '}크롤링을 수행하는 Python 스크립트 파일의 존재 여부를 확인합니다.
                        파일이 없으면 크롤링을 실행할 수 없습니다.
                      </div>
                      <div>
                        <strong className="text-purple-600 dark:text-purple-400">Playwright:</strong>
                        {' '}웹 브라우저를 제어하기 위한 Python 라이브러리입니다.
                        설치되어 있지 않으면 크롤링이 작동하지 않습니다.
                      </div>
                      <div>
                        <strong className="text-green-600 dark:text-green-400">크롤러:</strong>
                        {' '}스크립트와 Playwright가 모두 준비되어야 크롤링을 실행할 수 있습니다.
                      </div>
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                        <strong>참고:</strong> 이 상태 체크는 NAS 시스템에 최초로 설정할 때
                        필요한 구성 요소를 확인하기 위한 것입니다.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Data Viewer Section */}
        {activeSection === 'data' && (
          <div className="space-y-6">
            {/* File List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📊 데이터 파일 목록
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  CSV {csvFiles.length}개 / JSON {jsonFiles.length}개
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('csv')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'csv'
                        ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    📊 CSV 파일 ({csvFiles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('json')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'json'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    📄 JSON 파일 ({jsonFiles.length})
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'csv' ? renderFileList(csvFiles, 'csv') : renderFileList(jsonFiles, 'json')}
              </div>
            </div>

            {/* Data Viewer */}
            {selectedFile && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {selectedFile.type === 'csv' ? '📊' : '📄'} {selectedFile.filename}
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    {selectedFile.type === 'csv'
                      ? `총 ${selectedFile.rowCount}행의 데이터`
                      : 'JSON 원본 데이터'}
                  </p>
                </div>

                <div className="p-6">
                  {selectedFile.type === 'csv' ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {selectedFile.headers.map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => handleSort(header)}
                              >
                                <div className="flex items-center gap-2">
                                  {header}
                                  {sortColumn === header && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {getSortedData().map((row, index) => (
                            <tr
                              key={index}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              {selectedFile.headers.map((header) => (
                                <td
                                  key={header}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                                >
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-900 dark:text-gray-100 overflow-auto max-h-[600px]">
                        {JSON.stringify(selectedFile.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                전체 크롤링 히스토리
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                지금까지 수집한 모든 크롤링 데이터를 확인하세요
              </p>
            </div>

            {/* History Content */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-6">
                <CrawlerHistory refresh={refresh} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
