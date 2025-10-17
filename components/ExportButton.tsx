"use client";

import { useState } from 'react';
import { exportToCSV, exportToExcel, ExportColumn } from '@/lib/export';
import { Button } from './ui/Button';

interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  format?: 'csv' | 'excel' | 'both';
  disabled?: boolean;
}

export function ExportButton<T>({
  data,
  columns,
  filename = 'export',
  format = 'csv',
  disabled = false,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (exportFormat: 'csv' | 'excel') => {
    setIsExporting(true);
    setShowMenu(false);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filenameWithDate = `${filename}_${timestamp}`;

      if (exportFormat === 'csv') {
        exportToCSV(data, columns, `${filenameWithDate}.csv`);
      } else if (exportFormat === 'excel') {
        exportToExcel({
          filename: `${filenameWithDate}.xlsx`,
          sheets: [{ name: 'Data', data }],
        });
      }

      // 성공 피드백 (선택적)
      console.log(`Exported ${data.length} rows as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (format === 'both') {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
          disabled={disabled || data.length === 0}
          loading={isExporting}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          내보내기
        </Button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg"
              >
                <div className="font-medium text-gray-900 dark:text-white">CSV 파일</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Excel에서 열기</div>
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg border-t border-gray-200 dark:border-gray-700"
              >
                <div className="font-medium text-gray-900 dark:text-white">Excel 파일</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">고급 서식 지원</div>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleExport(format)}
      disabled={disabled || data.length === 0}
      loading={isExporting}
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    >
      {format === 'csv' ? 'CSV 내보내기' : 'Excel 내보내기'}
    </Button>
  );
}
