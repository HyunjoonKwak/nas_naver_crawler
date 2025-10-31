/**
 * 크롤링 서비스 관련 타입 정의
 */

/**
 * 크롤링 DB 저장 결과
 */
export interface CrawlDbResult {
  totalArticles: number;
  totalComplexes: number;
  errors: string[];
  newArticles?: number;
  updatedArticles?: number;
  deletedArticles?: number;
}

/**
 * 크롤링 실행 옵션
 */
export interface CrawlExecutionOptions {
  crawlId: string;
  complexNos: string[];
  userId: string;
  scheduleId?: string | null;
  baseDir: string;
  timeout: number;
}

/**
 * 알림 발송 결과
 */
export interface AlertSendResult {
  totalAlerts: number;
  sentAlerts: number;
  failedAlerts: number;
  errors: string[];
}

/**
 * 크롤링 상태
 */
export type CrawlStatus = 'pending' | 'crawling' | 'saving' | 'success' | 'partial' | 'failed';

/**
 * 크롤링 히스토리 업데이트 데이터
 */
export interface CrawlHistoryUpdate {
  successCount?: number;
  errorCount?: number;
  totalArticles?: number;
  duration?: number;
  status?: CrawlStatus;
  errorMessage?: string | null;
  currentStep?: string;
}
