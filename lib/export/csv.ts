/**
 * CSV 내보내기 유틸리티
 */

export interface ExportColumn<T = any> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = 'export.csv'
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // CSV 헤더 생성
  const headers = columns.map(col => col.label).join(',');

  // CSV 데이터 행 생성
  const rows = data.map(row => {
    return columns
      .map(col => {
        const value = row[col.key as keyof T];
        const formatted = col.format ? col.format(value, row) : value;

        // CSV 이스케이프 처리
        const stringValue = String(formatted ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  // CSV 문자열 생성
  const csv = [headers, ...rows].join('\n');

  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  // 다운로드
  downloadBlob(blob, filename);
}

/**
 * JSON 배열을 CSV로 내보내기 (자동 컬럼 감지)
 */
export function exportJSONToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.csv',
  excludeKeys: string[] = []
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // 첫 번째 객체에서 키 추출
  const keys = Object.keys(data[0]).filter(key => !excludeKeys.includes(key));

  const columns: ExportColumn<T>[] = keys.map(key => ({
    key,
    label: key,
  }));

  exportToCSV(data, columns, filename);
}

/**
 * Blob을 파일로 다운로드
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 복잡한 객체를 CSV에 적합한 형태로 평탄화
 */
export function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flattened[newKey] = '';
    } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = value.join('; ');
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
