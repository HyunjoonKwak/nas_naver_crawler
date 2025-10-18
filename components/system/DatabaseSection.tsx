"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CrawlerHistory from "@/components/CrawlerHistory";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";

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

interface DBStats {
  database: {
    totalComplexes: number;
    totalArticles: number;
    favoriteComplexes: number;
    recentComplexes: number;
    recentArticles: number;
  };
  crawling: {
    totalCrawls: number;
    completedCrawls: number;
    failedCrawls: number;
    avgDuration: number;
    recentCrawls: Array<{
      id: string;
      status: string;
      totalComplexes: number;
      processedComplexes: number;
      totalArticles: number;
      processedArticles: number;
      duration: number | null;
      createdAt: string;
    }>;
  };
  tradeTypes: Record<string, number>;
}

interface DatabaseSectionProps {
  status: StatusData | null;
  refresh: number;
  isAdmin: boolean;
}

export const DatabaseSection = ({
  status,
  refresh,
  isAdmin
}: DatabaseSectionProps) => {
  // Database stats states
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [deleteFilesOption, setDeleteFilesOption] = useState(true);

  // CSV/JSON viewer states
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [jsonFiles, setJsonFiles] = useState<JSONFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');

  // Sub-tab state
  const [databaseTab, setDatabaseTab] = useState<'stats' | 'history' | 'files'>('stats');

  // Delete confirmation dialogs
  const [deleteFileDialog, setDeleteFileDialog] = useState<{ isOpen: boolean; filename: string | null }>({ isOpen: false, filename: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  useEffect(() => {
    fetchDBStats();
    if (databaseTab === 'files' && isAdmin) {
      fetchFiles();
    }
  }, [databaseTab, isAdmin]);

  const fetchDBStats = async () => {
    try {
      setDbLoading(true);
      const response = await fetch('/api/db-stats');
      const data = await response.json();
      setDbStats(data);
    } catch (error) {
      console.error('Failed to fetch DB stats:', error);
    } finally {
      setDbLoading(false);
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

  const handleDatabaseReset = async () => {
    if (resetConfirmText !== 'RESET DATABASE') {
      showError('확인 텍스트를 정확히 입력해주세요: RESET DATABASE');
      return;
    }

    const loadingToast = showLoading('데이터베이스 초기화 중...');
    setIsResetting(true);
    try {
      const response = await fetch('/api/database/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmText: resetConfirmText,
          deleteFiles: deleteFilesOption,
        }),
      });

      const data = await response.json();

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('데이터베이스가 성공적으로 초기화되었습니다.');
        setShowResetModal(false);
        setResetConfirmText('');
        // DB 통계 새로고침
        await fetchDBStats();
      } else {
        showError(`초기화 실패: ${data.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Database reset error:', error);
      showError('데이터베이스 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteFileDialog({ isOpen: true, filename });
  };

  const confirmDelete = async () => {
    if (!deleteFileDialog.filename) return;

    const loadingToast = showLoading('파일 삭제 중...');
    try {
      const response = await fetch('/api/csv', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: deleteFileDialog.filename }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('파일이 삭제되었습니다.');
        if (selectedFile?.filename === deleteFileDialog.filename) {
          setSelectedFile(null);
        }
        await fetchFiles();
      } else {
        const error = await response.json();
        showError(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Delete error:', error);
      showError('파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteFileDialog({ isOpen: false, filename: null });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    setBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    const loadingToast = showLoading(`${selectedFiles.size}개 파일 삭제 중...`);
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedFiles).map(filename =>
        fetch('/api/csv', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename }),
        })
      );

      await Promise.all(deletePromises);

      dismissToast(loadingToast);
      showSuccess(`${selectedFiles.size}개 파일이 삭제되었습니다.`);

      if (selectedFile && selectedFiles.has(selectedFile.filename)) {
        setSelectedFile(null);
        setShowModal(false);
      }

      setSelectedFiles(new Set());
      await fetchFiles();
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Bulk delete error:', error);
      showError('파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setBulkDeleteDialog(false);
    }
  };

  const toggleFileSelection = (filename: string, e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = (files: FileType[]) => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.filename)));
    }
  };

  const openFileModal = (file: FileType) => {
    setSelectedFile(file);
    setShowModal(true);
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
      return <LoadingSpinner message="로딩 중..." />;
    }

    if (files.length === 0) {
      return (
        <EmptyState
          icon="📂"
          title={`${fileType === 'csv' ? 'CSV' : 'JSON'} 파일이 없습니다`}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={() => toggleSelectAll(files)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </th>
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
                  selectedFiles.has(file.filename)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
                onClick={() => openFileModal(file)}
              >
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.filename)}
                    onChange={(e) => toggleFileSelection(file.filename, e)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {file.filename}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(file.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatSize(file.size)}
                  </div>
                </td>
                {fileType === 'csv' && file.type === 'csv' && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {file.rowCount}행
                    </span>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm">
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
    <>
      {dbLoading ? (
        <LoadingSpinner color="cyan-600" />
      ) : dbStats ? (
        <div className="space-y-4">
          {/* Page Header */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
                데이터베이스 현황
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                저장된 데이터와 크롤링 통계를 확인하세요
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
            >
              🗑️ DB 초기화
            </button>
          </div>

          {/* Database Sub-Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex gap-1 p-2">
              <button
                onClick={() => setDatabaseTab('stats')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  databaseTab === 'stats'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                📊 통계
              </button>
              <button
                onClick={() => setDatabaseTab('history')}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  databaseTab === 'history'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                📚 히스토리
              </button>
              {isAdmin && (
                <button
                  onClick={() => setDatabaseTab('files')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    databaseTab === 'files'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  📁 파일
                </button>
              )}
            </div>
          </div>

          {/* Stats Tab Content */}
          {databaseTab === 'stats' && (
            <>
              {/* Database Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  데이터 통계
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">등록 단지</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dbStats.database.totalComplexes.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      최근 7일 +{dbStats.database.recentComplexes}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">등록 매물</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dbStats.database.totalArticles.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      최근 7일 +{dbStats.database.recentArticles}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">관심 단지</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dbStats.database.favoriteComplexes.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {dbStats.database.totalComplexes > 0 ? ((dbStats.database.favoriteComplexes / dbStats.database.totalComplexes) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Crawling Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  크롤링 통계
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">전체</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {dbStats.crawling.totalCrawls}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">완료</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {dbStats.crawling.completedCrawls}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">실패</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">
                      {dbStats.crawling.failedCrawls}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">평균 소요시간</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {Math.floor(dbStats.crawling.avgDuration / 60)}:{String(dbStats.crawling.avgDuration % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Crawls */}
              {dbStats.crawling.recentCrawls.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    최근 크롤링 기록 (최근 5개)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">시작 시간</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">단지</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">매물</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">소요시간</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {dbStats.crawling.recentCrawls.map((crawl) => (
                          <tr key={crawl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                crawl.status === 'completed' || crawl.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                crawl.status === 'partial' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                crawl.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                crawl.status === 'saving' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {crawl.status === 'completed' || crawl.status === 'success' ? '✅ 완료' :
                                 crawl.status === 'partial' ? '⚠️ 부분완료' :
                                 crawl.status === 'failed' ? '❌ 실패' :
                                 crawl.status === 'saving' ? '💾 저장중' :
                                 crawl.status === 'crawling' ? '🔄 크롤링중' : '⏳ 진행중'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                              {new Date(crawl.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className="font-semibold">{crawl.processedComplexes}</span>
                              <span className="text-gray-500 dark:text-gray-400"> / {crawl.totalComplexes}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className="font-semibold">{crawl.processedArticles}</span>
                              {crawl.totalArticles > 0 && (
                                <span className="text-gray-500 dark:text-gray-400"> / {crawl.totalArticles}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {crawl.duration ? `${Math.floor(crawl.duration / 60)}분 ${crawl.duration % 60}초` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* System Status - integrated into DB section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      시스템 상태
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      10초마다 자동 업데이트
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-6 py-3 rounded-xl flex items-center gap-3 ${
                      status?.status === 'ready'
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="text-xl">
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
                    <Link
                      href="/system/details"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      📋 상세 정보
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* History Tab Content */}
          {databaseTab === 'history' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-6">
                <CrawlerHistory refresh={refresh} />
              </div>
            </div>
          )}

          {/* Files Tab Content */}
          {isAdmin && databaseTab === 'files' && (
            <div className="space-y-6">
              {/* File List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-blue-600 px-4 py-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    📊 데이터 파일 목록
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    CSV {csvFiles.length}개 / JSON {jsonFiles.length}개
                  </p>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
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
                    {selectedFiles.size > 0 && (
                      <div className="flex items-center gap-3 px-6">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedFiles.size}개 선택됨
                        </span>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isDeleting}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          {isDeleting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              삭제 중...
                            </>
                          ) : (
                            <>
                              🗑️ 선택 삭제
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  {activeTab === 'csv' ? renderFileList(csvFiles, 'csv') : renderFileList(jsonFiles, 'json')}
                </div>
              </div>

              {/* Modal for File Viewing */}
              {showModal && selectedFile && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-7xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {selectedFile.type === 'csv' ? '📊' : '📄'} {selectedFile.filename}
                        </h3>
                        <p className="text-indigo-100 text-sm mt-1">
                          {selectedFile.type === 'csv'
                            ? `총 ${selectedFile.rowCount}행의 데이터`
                            : 'JSON 원본 데이터'}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowModal(false)}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                      {selectedFile.type === 'csv' ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
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
                                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
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
                          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-900 dark:text-gray-100 overflow-auto">
                            {JSON.stringify(selectedFile.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Database Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  ⚠️ 데이터베이스 초기화
                </h2>
                <p className="text-red-100 text-sm mt-1">
                  이 작업은 되돌릴 수 없습니다
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
                  다음 데이터가 모두 삭제됩니다:
                </h3>
                <ul className="space-y-1 text-red-800 dark:text-red-300">
                  <li>• 등록된 모든 단지 (Complex)</li>
                  <li>• 수집된 모든 매물 (Article)</li>
                  <li>• 즐겨찾기 정보 (Favorite)</li>
                  <li>• 크롤링 히스토리 (CrawlHistory)</li>
                  <li>• 알림 설정 및 로그 (Alert, NotificationLog)</li>
                  <li>• 스케줄 설정 및 로그 (Schedule, ScheduleLog)</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteFilesOption}
                      onChange={(e) => setDeleteFilesOption(e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      레거시 파일도 초기화 (favorites.json 등)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    계속하려면 <span className="font-bold text-red-600">RESET DATABASE</span>를 입력하세요:
                  </label>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESET DATABASE"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDatabaseReset}
                  disabled={resetConfirmText !== 'RESET DATABASE' || isResetting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      초기화 중...
                    </>
                  ) : (
                    '데이터베이스 초기화'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Dialog */}
      <Dialog
        isOpen={deleteFileDialog.isOpen}
        onClose={() => setDeleteFileDialog({ isOpen: false, filename: null })}
        onConfirm={confirmDelete}
        title="파일 삭제"
        description={`${deleteFileDialog.filename} 파일을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        isOpen={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        title="파일 일괄 삭제"
        description={`선택한 ${selectedFiles.size}개 파일을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </>
  );
};
