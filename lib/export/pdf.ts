/**
 * PDF 리포트 생성 유틸리티
 *
 * 참고: 브라우저에서 PDF 생성을 위해서는 다음 중 하나를 사용:
 * 1. jsPDF (클라이언트 사이드)
 * 2. Puppeteer (서버 사이드)
 * 3. react-pdf (React 컴포넌트)
 *
 * 현재는 간단한 HTML to PDF 변환 방식으로 구현
 */

export interface PDFReportOptions {
  title: string;
  author?: string;
  content: string; // HTML 문자열
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

/**
 * HTML을 PDF로 변환하여 다운로드
 *
 * 브라우저의 print 기능을 활용한 간단한 구현
 */
export function generatePDFReport(options: PDFReportOptions): void {
  const {
    title,
    author = 'Real Estate Crawler',
    content,
    orientation = 'portrait',
    pageSize = 'A4',
  } = options;

  // PDF 스타일
  const styles = `
    <style>
      @page {
        size: ${pageSize} ${orientation};
        margin: 2cm;
      }

      @media print {
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .page-break {
          page-break-after: always;
        }

        .no-print {
          display: none;
        }
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }

      h1 {
        color: #2563eb;
        border-bottom: 3px solid #2563eb;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }

      h2 {
        color: #1e40af;
        margin-top: 30px;
        margin-bottom: 15px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }

      th {
        background-color: #f3f4f6;
        font-weight: 600;
      }

      .metadata {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 30px;
      }

      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
      }
    </style>
  `;

  // PDF HTML 생성
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      <h1>${title}</h1>
      <div class="metadata">
        <p>생성일: ${new Date().toLocaleString('ko-KR')}</p>
        <p>생성자: ${author}</p>
      </div>

      ${content}

      <div class="footer">
        <p>이 리포트는 부동산 인사이트 시스템에서 자동 생성되었습니다.</p>
      </div>
    </body>
    </html>
  `;

  // 새 창에서 열어서 인쇄 대화상자 표시
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // 문서 로드 후 인쇄
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    console.error('Failed to open print window. Please check popup blocker.');
  }
}

/**
 * 데이터를 테이블 형태의 HTML로 변환
 */
export function dataToHTMLTable<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string; format?: (value: any) => string }>
): string {
  if (data.length === 0) {
    return '<p>데이터가 없습니다.</p>';
  }

  const headers = columns.map(col => `<th>${col.label}</th>`).join('');
  const rows = data
    .map(row => {
      const cells = columns
        .map(col => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value) : value;
          return `<td>${formatted ?? '-'}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * 단순 리포트 생성 헬퍼
 */
export function generateSimpleReport<T extends Record<string, any>>(
  title: string,
  data: T[],
  columns: Array<{ key: keyof T; label: string; format?: (value: any) => string }>
): void {
  const tableHTML = dataToHTMLTable(data, columns);

  const content = `
    <h2>데이터 요약</h2>
    <p>총 ${data.length}개의 항목</p>
    ${tableHTML}
  `;

  generatePDFReport({
    title,
    content,
  });
}
