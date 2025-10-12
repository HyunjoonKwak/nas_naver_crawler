"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function DataViewerPage() {
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [jsonFiles, setJsonFiles] = useState<JSONFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/csv');
      const data = await response.json();
      setCsvFiles(data.csvFiles || []);
      setJsonFiles(data.jsonFiles || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
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
    if (loading) {
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
                  <button
                    onClick={(e) => handleDelete(file.filename, e)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
              >
                🏠
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  데이터 뷰어
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  크롤링 데이터 조회 (CSV / JSON)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-semibold"
              >
                🏠 홈
              </Link>
              <Link
                href="/complexes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
              >
                🏘️ 단지 목록
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
              >
                📚 히스토리
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              📊 파일 목록
            </h2>
            <p className="text-green-100 text-sm mt-1">
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {selectedFile.type === 'csv' ? '📊' : '📄'} {selectedFile.filename}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {selectedFile.type === 'csv'
                  ? `총 ${selectedFile.rowCount}행의 데이터`
                  : 'JSON 원본 데이터'}
              </p>
            </div>

            <div className="p-6">
              {selectedFile.type === 'csv' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {selectedFile.headers.map((header) => (
                          <th
                            key={header}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {getSortedData().map((row, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                  <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm text-gray-900 dark:text-gray-100 overflow-auto max-h-[600px]">
                    {JSON.stringify(selectedFile.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
