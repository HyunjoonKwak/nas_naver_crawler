/**
 * 중앙화된 로깅 시스템
 * 프로덕션 환경에서는 외부 로깅 서비스(Sentry, LogRocket 등) 연동 가능
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  /**
   * 로그 레벨에 따라 출력 여부 결정
   */
  private shouldLog(level: LogLevel): boolean {
    const isProduction = process.env.NODE_ENV === 'production';

    // 프로덕션에서는 debug 로그 숨김
    if (isProduction && level === 'debug') {
      return false;
    }

    return true;
  }

  /**
   * 로그 메시지 포맷팅
   */
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';

    return `${timestamp} ${level.toUpperCase()}${prefix} ${message}${contextStr}`;
  }

  /**
   * Debug 레벨 로그 (개발 환경만)
   */
  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message, context));
    }
  }

  /**
   * Info 레벨 로그
   */
  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, context));
    }
  }

  /**
   * Warning 레벨 로그
   */
  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  /**
   * Error 레벨 로그
   */
  error(message: string, error?: Error | any, context?: LogContext) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        ...(error && {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }),
      };

      console.error(this.format('error', message, errorContext));

      // 프로덕션: 외부 로깅 서비스 전송 (Sentry, LogRocket 등)
      if (process.env.NODE_ENV === 'production' && error instanceof Error) {
        // 향후 Sentry 설정 시: Sentry.captureException(error, { extra: context })
      }
    }
  }

  /**
   * 하위 로거 생성 (prefix 추가)
   */
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger(childPrefix);
  }
}

/**
 * 기본 로거 인스턴스
 */
export const logger = new Logger();

/**
 * 도메인별 로거 생성 헬퍼
 */
export function createLogger(domain: string): Logger {
  return logger.child(domain);
}

/**
 * 사용 예시:
 *
 * ```ts
 * import { logger, createLogger } from '@/lib/logger';
 *
 * // 기본 사용
 * logger.info('Server started');
 * logger.error('Failed to connect', error);
 *
 * // 도메인별 로거
 * const crawlerLogger = createLogger('CRAWLER');
 * crawlerLogger.info('Starting crawl', { complexNo: '123' });
 * crawlerLogger.error('Crawl failed', error, { complexNo: '123' });
 * ```
 */
