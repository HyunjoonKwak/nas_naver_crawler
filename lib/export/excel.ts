/**
 * Excel 내보내기 유틸리티 (브라우저 전용)
 *
 * 참고: 이 기능을 사용하려면 다음 패키지 설치 필요:
 * npm install xlsx
 *
 * 현재는 인터페이스만 정의하고, 실제 구현은 xlsx 패키지 설치 후 활성화
 */

export interface ExcelSheet {
  name: string;
  data: any[];
  columns?: Array<{
    key: string;
    label: string;
    width?: number;
  }>;
}

export interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
  creator?: string;
}

/**
 * 데이터를 Excel 파일로 내보내기
 *
 * @example
 * exportToExcel({
 *   filename: 'report.xlsx',
 *   sheets: [
 *     { name: 'Sheet1', data: complexes },
 *     { name: 'Sheet2', data: articles }
 *   ]
 * });
 */
export function exportToExcel(options: ExcelExportOptions): void {
  // xlsx 패키지가 설치되어 있는지 확인
  try {
    // 동적 import를 시도
    console.warn('Excel export requires xlsx package. Please install: npm install xlsx');

    // Fallback: CSV로 내보내기
    const { exportToCSV } = require('./csv');

    if (options.sheets.length > 0) {
      const firstSheet = options.sheets[0];
      const columns = firstSheet.columns || Object.keys(firstSheet.data[0] || {}).map(key => ({
        key,
        label: key,
      }));

      exportToCSV(
        firstSheet.data,
        columns,
        options.filename.replace('.xlsx', '.csv')
      );
    }
  } catch (error) {
    console.error('Failed to export Excel:', error);
  }
}

/**
 * 실제 구현 (xlsx 패키지 설치 후 활성화)
 *
 * export function exportToExcel(options: ExcelExportOptions): void {
 *   const XLSX = require('xlsx');
 *
 *   const workbook = XLSX.utils.book_new();
 *   workbook.Props = {
 *     Title: options.filename,
 *     Author: options.creator || 'Real Estate Crawler',
 *     CreatedDate: new Date(),
 *   };
 *
 *   options.sheets.forEach(sheet => {
 *     const worksheet = XLSX.utils.json_to_sheet(sheet.data);
 *
 *     // 컬럼 너비 설정
 *     if (sheet.columns) {
 *       worksheet['!cols'] = sheet.columns.map(col => ({
 *         wch: col.width || 15,
 *       }));
 *     }
 *
 *     XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
 *   });
 *
 *   XLSX.writeFile(workbook, options.filename);
 * }
 */

/**
 * 단일 시트 Excel 내보내기 간편 함수
 */
export function exportArrayToExcel<T>(
  data: T[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
): void {
  exportToExcel({
    filename,
    sheets: [{ name: sheetName, data }],
  });
}
