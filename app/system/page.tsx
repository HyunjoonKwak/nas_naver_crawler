"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import CrawlerHistory from "@/components/CrawlerHistory";
import { ThemeToggle, Dialog } from "@/components/ui";
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

export default function SystemPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'data' | 'history' | 'database' | 'info' | 'users'>('database');
  const [refresh, setRefresh] = useState(0);

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

  // Database stats states
  const [dbStats, setDbStats] = useState<DBStats | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [deleteFilesOption, setDeleteFilesOption] = useState(true);

  // Delete confirmation dialogs
  const [deleteFileDialog, setDeleteFileDialog] = useState<{ isOpen: boolean; filename: string | null }>({ isOpen: false, filename: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // Useful links states
  const [links, setLinks] = useState<any[]>([]);
  const [groupedLinks, setGroupedLinks] = useState<Record<string, any[]>>({});
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    description: '',
    category: 'reference',
    icon: '🔗',
    order: 0,
  });

  // Users states
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Refresh when page becomes visible (탭 전환 시에만)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[System] Page visible, refreshing status...');
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'data') {
      fetchFiles();
    } else if (activeSection === 'database') {
      fetchDBStats();
    } else if (activeSection === 'info') {
      fetchLinks();
    } else if (activeSection === 'users') {
      fetchUsers();
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

  const fetchLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await fetch('/api/useful-links');
      const data = await response.json();
      if (data.success) {
        setLinks(data.links);
        setGroupedLinks(data.groupedLinks);
      }
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleAddLink = () => {
    setEditingLink(null);
    setLinkForm({
      title: '',
      url: '',
      description: '',
      category: 'reference',
      icon: '🔗',
      order: 0,
    });
    setShowLinkModal(true);
  };

  const handleEditLink = (link: any) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      category: link.category,
      icon: link.icon || '🔗',
      order: link.order || 0,
    });
    setShowLinkModal(true);
  };

  const handleSaveLink = async () => {
    const loadingToast = showLoading(editingLink ? '링크 수정 중...' : '링크 추가 중...');
    try {
      const method = editingLink ? 'PUT' : 'POST';
      const body = editingLink
        ? { id: editingLink.id, ...linkForm }
        : linkForm;

      const response = await fetch('/api/useful-links', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(editingLink ? '링크가 수정되었습니다.' : '링크가 추가되었습니다.');
        setShowLinkModal(false);
        await fetchLinks();
      } else {
        const error = await response.json();
        showError(`저장 실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Save link error:', error);
      showError('링크 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return;

    const loadingToast = showLoading('링크 삭제 중...');
    try {
      const response = await fetch(`/api/useful-links?id=${id}`, {
        method: 'DELETE',
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('링크가 삭제되었습니다.');
        await fetchLinks();
      } else {
        const error = await response.json();
        showError(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Delete link error:', error);
      showError('링크 삭제 중 오류가 발생했습니다.');
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showError('사용자 목록 조회에 실패했습니다.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserApprove = async (userId: string, isApproved: boolean) => {
    const loadingToast = showLoading(isApproved ? '승인 중...' : '승인 취소 중...');
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isApproved }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(isApproved ? '사용자가 승인되었습니다.' : '승인이 취소되었습니다.');
        await fetchUsers();
      } else {
        const error = await response.json();
        showError(`실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('User approve error:', error);
      showError('처리 중 오류가 발생했습니다.');
    }
  };

  const handleUserActivate = async (userId: string, isActive: boolean) => {
    const loadingToast = showLoading(isActive ? '활성화 중...' : '비활성화 중...');
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess(isActive ? '사용자가 활성화되었습니다.' : '사용자가 비활성화되었습니다.');
        await fetchUsers();
      } else {
        const error = await response.json();
        showError(`실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('User activate error:', error);
      showError('처리 중 오류가 발생했습니다.');
    }
  };

  const handleUserRoleChange = async (userId: string, role: string) => {
    const loadingToast = showLoading('역할 변경 중...');
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('역할이 변경되었습니다.');
        await fetchUsers();
      } else {
        const error = await response.json();
        showError(`실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('User role change error:', error);
      showError('처리 중 오류가 발생했습니다.');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;

    const loadingToast = showLoading('사용자 삭제 중...');
    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('사용자가 삭제되었습니다.');
        await fetchUsers();
      } else {
        const error = await response.json();
        showError(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('User delete error:', error);
      showError('삭제 중 오류가 발생했습니다.');
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
        // 상태 새로고침
        await fetchStatus();
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
      <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
          <div className="grid grid-cols-5 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveSection('database')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'database'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🗄️</span>
                <span>DB 현황</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
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
            <button
              onClick={() => setActiveSection('data')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'data'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                <span>파일 뷰어</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('info')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'info'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📌</span>
                <span>유용한 정보</span>
              </div>
            </button>
            <button
              onClick={() => setActiveSection('users')}
              className={`px-4 py-4 text-center font-semibold transition-colors ${
                activeSection === 'users'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">👥</span>
                <span>사용자 관리</span>
              </div>
            </button>
          </div>
        </div>

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
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {selectedFile.type === 'csv' ? '📊' : '📄'} {selectedFile.filename}
                      </h2>
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

        {/* Database Section */}
        {activeSection === 'database' && (
          dbLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
          ) : dbStats ? (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    데이터베이스 현황
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    저장된 데이터와 크롤링 통계를 확인하세요
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                >
                  🗑️ 데이터베이스 초기화
                </button>
              </div>

              {/* Database Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  데이터 통계
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Complexes */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">🏢</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      등록 단지
                    </h4>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                      {dbStats.database.totalComplexes.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      전체 단지 수
                    </p>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 text-xs text-gray-500 dark:text-gray-400">
                      최근 7일: <span className="font-semibold text-blue-600 dark:text-blue-400">+{dbStats.database.recentComplexes}</span>
                    </div>
                  </div>

                  {/* Total Articles */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">📋</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      등록 매물
                    </h4>
                    <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                      {dbStats.database.totalArticles.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      전체 매물 수
                    </p>
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 text-xs text-gray-500 dark:text-gray-400">
                      최근 7일: <span className="font-semibold text-green-600 dark:text-green-400">+{dbStats.database.recentArticles}</span>
                    </div>
                  </div>

                  {/* Favorite Complexes */}
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-6 border border-pink-100 dark:border-pink-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl">⭐</div>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      관심 단지
                    </h4>
                    <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                      {dbStats.database.favoriteComplexes.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      즐겨찾기 등록 단지
                    </p>
                    <div className="mt-3 pt-3 border-t border-pink-200 dark:border-pink-700 text-xs text-gray-500 dark:text-gray-400">
                      전체의 {((dbStats.database.favoriteComplexes / dbStats.database.totalComplexes) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Crawling Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  크롤링 통계
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="text-3xl mb-3">📊</div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      전체 크롤링
                    </h4>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {dbStats.crawling.totalCrawls}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
                    <div className="text-3xl mb-3">✅</div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      완료
                    </h4>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {dbStats.crawling.completedCrawls}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-red-100 dark:border-red-800">
                    <div className="text-3xl mb-3">❌</div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      실패
                    </h4>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {dbStats.crawling.failedCrawls}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-cyan-100 dark:border-cyan-800">
                    <div className="text-3xl mb-3">⏱️</div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      평균 소요시간
                    </h4>
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      {Math.floor(dbStats.crawling.avgDuration / 60)}분 {dbStats.crawling.avgDuration % 60}초
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Crawls */}
              {dbStats.crawling.recentCrawls.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
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
                    <Link
                      href="/system/details"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      📋 상세 정보
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null
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

        {/* Info Section - Useful Links */}
        {activeSection === 'info' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  유용한 정보
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  부동산 크롤링 및 분석에 도움이 되는 사이트 모음
                </p>
              </div>
              <button
                onClick={handleAddLink}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                ➕ 링크 추가
              </button>
            </div>

            {linksLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : Object.keys(groupedLinks).length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <div className="text-7xl mb-4">📌</div>
                <p className="text-xl font-semibold mb-2">등록된 링크가 없습니다</p>
                <p className="text-sm">유용한 사이트를 추가해보세요</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedLinks).map(([category, categoryLinks]) => {
                  const categoryInfo: Record<string, { title: string; icon: string; color: string }> = {
                    geocoding: { title: '지오코딩', icon: '🗺️', color: 'blue' },
                    transaction: { title: '실거래가', icon: '💰', color: 'green' },
                    reference: { title: '참고자료', icon: '📚', color: 'purple' },
                    api: { title: 'API', icon: '🔌', color: 'orange' },
                    tool: { title: '도구', icon: '🛠️', color: 'cyan' },
                  };

                  const info = categoryInfo[category] || { title: category, icon: '🔗', color: 'gray' };

                  return (
                    <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className={`bg-gradient-to-r from-${info.color}-600 to-${info.color}-700 px-6 py-4`}>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{info.title}</span>
                          <span className="text-sm font-normal opacity-80">({categoryLinks.length})</span>
                        </h3>
                      </div>

                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryLinks.map((link: any) => (
                          <div
                            key={link.id}
                            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{link.icon || '🔗'}</span>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {link.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditLink(link)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                  title="수정"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                  title="삭제"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {link.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {link.description}
                              </p>
                            )}

                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all flex items-center gap-1"
                            >
                              <span>🔗</span>
                              <span className="truncate">{link.url}</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Users Section - User Management */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                사용자 관리
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                시스템 사용자 계정을 관리하세요
              </p>
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <div className="text-7xl mb-4">👥</div>
                <p className="text-xl font-semibold mb-2">등록된 사용자가 없습니다</p>
                <p className="text-sm">첫 번째 사용자를 등록해보세요</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>👥</span>
                    <span>전체 사용자 ({users.length})</span>
                  </h3>
                </div>

                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">이름</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">이메일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">역할</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">승인 상태</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">활성화</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">마지막 로그인</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">가입일</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">관리</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={user.role}
                                onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="GUEST">게스트 (격리)</option>
                                <option value="FAMILY">패밀리 (공유)</option>
                                <option value="ADMIN">관리자</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.isApproved ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  ✅ 승인됨
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleUserApprove(user.id, true)}
                                  className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                                >
                                  ⏳ 승인 대기
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleUserActivate(user.id, !user.isActive)}
                                className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                                  user.isActive
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {user.isActive ? '🟢 활성화' : '⚫ 비활성화'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.lastLoginAt
                                  ? new Date(user.lastLoginAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                                  : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(user.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handleUserDelete(user.id)}
                                className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors font-medium"
                              >
                                🗑️ 삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Database Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowResetModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
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
                        favorites.json 파일도 초기화
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
      </main>

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

      {/* Add/Edit Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {editingLink ? '✏️ 링크 수정' : '➕ 링크 추가'}
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  유용한 사이트 정보를 입력하세요
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder="예: 카카오 지도 API"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  placeholder="간단한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리 *
                  </label>
                  <select
                    value={linkForm.category}
                    onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="geocoding">지오코딩</option>
                    <option value="transaction">실거래가</option>
                    <option value="reference">참고자료</option>
                    <option value="api">API</option>
                    <option value="tool">도구</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    아이콘 선택
                  </label>
                  <div className="grid grid-cols-8 gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 max-h-32 overflow-y-auto">
                    {[
                      '🗺️', '📍', '🌏', '🧭', // 지오코딩/지도
                      '💰', '💵', '💴', '📈', '📊', // 실거래가/금융
                      '📚', '📖', '📝', '📄', '📋', // 참고자료/문서
                      '🔌', '⚡', '🔗', '🌐', // API/네트워크
                      '🛠️', '⚙️', '🔧', '🔨', // 도구
                      '🏢', '🏠', '🏘️', '🏗️', // 부동산
                      '📱', '💻', '🖥️', '⌨️', // 디지털/기술
                      '🔍', '🔎', '📡', '🎯', // 검색/분석
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setLinkForm({ ...linkForm, icon: emoji })}
                        className={`text-2xl p-2 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors ${
                          linkForm.icon === emoji ? 'bg-emerald-200 dark:bg-emerald-900/50 ring-2 ring-emerald-500' : ''
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={linkForm.icon}
                      onChange={(e) => setLinkForm({ ...linkForm, icon: e.target.value })}
                      placeholder="또는 직접 입력"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                    />
                    <span className="text-3xl">{linkForm.icon}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveLink}
                  disabled={!linkForm.title || !linkForm.url || !linkForm.category}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {editingLink ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
