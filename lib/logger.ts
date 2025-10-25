/**
 * 중앙화된 구조화 로깅 시스템
 * 
 * Winston 기반 로거 (파일, 콘솔 출력 지원)
 * 프로덕션 환경에서는 외부 로깅 서비스(Sentry, CloudWatch 등) 연동 가능
 * 
 * 설치 필요: npm install winston
 */

import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

// 로그 디렉토리 생성
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 구조화된 로거 클래스
 */
class Logger {
  private prefix: string;
  private logLevel: LogLevel;

  constructor(prefix: string = '') {
    this.prefix = prefix;
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * 로그 레벨에 따라 출력 여부 결정
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * 구조화된 로그 객체 생성
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'naver-crawler',
      context: this.prefix,
      message,
      ...context,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * 로그를 파일에 기록
   */
  private writeToFile(level: LogLevel, logEntry: any) {
    if (process.env.NODE_ENV === 'production') {
      try {
        const logFile = level === 'error' 
          ? path.join(logsDir, 'error.log')
          : path.join(logsDir, 'combined.log');
        
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      } catch (err: any) {
        // 파일 쓰기 실패 시 콘솔에만 출력
        console.error('Failed to write log to file:', err);
      }
    }
  }

  /**
   * 콘솔 출력 포맷팅
   */
  private formatConsoleOutput(logEntry: any): string {
    const { timestamp, level, context, message, ...rest } = logEntry;
    const prefix = context ? `[${context}]` : '';
    const time = new Date(timestamp).toLocaleTimeString('ko-KR');
    
    let output = `${time} ${level}${prefix} ${message}`;
    
    // 추가 컨텍스트가 있으면 출력
    const extraKeys = Object.keys(rest).filter(
      key => !['service', 'environment'].includes(key) && rest[key] !== undefined
    );
    
    if (extraKeys.length > 0) {
      const extra = extraKeys.reduce((acc, key) => {
        acc[key] = rest[key];
        return acc;
      }, {} as any);
      
      output += ` ${JSON.stringify(extra)}`;
    }
    
    return output;
  }

  /**
   * Debug 레벨 로그 (개발 환경만)
   */
  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return;

    const logEntry = this.createLogEntry('debug', message, context);
    console.log(this.formatConsoleOutput(logEntry));
    this.writeToFile('debug', logEntry);
  }

  /**
   * Info 레벨 로그
   */
  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.createLogEntry('info', message, context);
    console.log(this.formatConsoleOutput(logEntry));
    this.writeToFile('info', logEntry);
  }

  /**
   * Warning 레벨 로그
   */
  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return;

    const logEntry = this.createLogEntry('warn', message, context);
    console.warn(this.formatConsoleOutput(logEntry));
    this.writeToFile('warn', logEntry);
  }

  /**
   * Error 레벨 로그
   */
  error(message: string, context?: LogContext) {
    if (!this.shouldLog('error')) return;

    const errorContext = { ...context };
    
    // Error 객체가 있으면 파싱
    if (context?.error) {
      const err = context.error;
      errorContext.error = err instanceof Error ? err.message : String(err);
      errorContext.stack = err instanceof Error ? err.stack : undefined;
    }

    const logEntry = this.createLogEntry('error', message, errorContext);
    console.error(this.formatConsoleOutput(logEntry));
    this.writeToFile('error', logEntry);

    // 프로덕션: 외부 로깅 서비스 전송
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // 향후 Sentry 설정 시: Sentry.captureException(context.error, { extra: context })
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
 * logger.info('Server started', { port: 3000 });
 * logger.error('Failed to connect', { error: err, dbHost: 'localhost' });
 *
 * // 도메인별 로거
 * const crawlerLogger = createLogger('CRAWLER');
 * crawlerLogger.info('Starting crawl', { complexNo: '123', userId: 'abc' });
 * crawlerLogger.error('Crawl failed', { error: err, complexNo: '123' });
 *
 * // 중첩 로거
 * const dbLogger = crawlerLogger.child('DB');
 * dbLogger.debug('Query executed', { query: 'SELECT *', duration: 123 });
 * ```
 */
