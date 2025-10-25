import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createLogger } from '@/lib/logger';
import fs from 'fs';

// Console 메서드 모킹
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

// fs.appendFileSync 모킹
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

describe('Logger', () => {
  beforeEach(() => {
    // 각 테스트 전에 spy 초기화
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
    consoleSpy.error.mockClear();
  });

  afterEach(() => {
    // 환경 변수 초기화
    delete process.env.LOG_LEVEL;
  });

  describe('기본 로깅', () => {
    it('should log info message', () => {
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('INFO');
      expect(logOutput).toContain('Test message');
    });

    it('should log warning message', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logOutput = consoleSpy.warn.mock.calls[0][0];
      expect(logOutput).toContain('WARN');
      expect(logOutput).toContain('Warning message');
    });

    it('should log error message', () => {
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('ERROR');
      expect(logOutput).toContain('Error message');
    });

    it('should log debug message in development', () => {
      process.env.LOG_LEVEL = 'debug';
      const debugLogger = createLogger('DEBUG');
      
      debugLogger.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('컨텍스트 로깅', () => {
    it('should log with context data', () => {
      logger.info('User logged in', { userId: '123', ip: '127.0.0.1' });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('User logged in');
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('123');
    });

    it('should handle error context', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', { error });

      expect(consoleSpy.error).toHaveBeenCalled();
      const logOutput = consoleSpy.error.mock.calls[0][0];
      expect(logOutput).toContain('Operation failed');
      expect(logOutput).toContain('Test error');
    });
  });

  describe('도메인별 로거', () => {
    it('should create logger with domain prefix', () => {
      const crawlerLogger = createLogger('CRAWLER');
      crawlerLogger.info('Crawling started');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('[CRAWLER]');
      expect(logOutput).toContain('Crawling started');
    });

    it('should create nested logger', () => {
      const parentLogger = createLogger('PARENT');
      const childLogger = parentLogger.child('CHILD');
      
      childLogger.info('Nested message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const logOutput = consoleSpy.log.mock.calls[0][0];
      expect(logOutput).toContain('[PARENT:CHILD]');
    });
  });

  describe('로그 레벨 필터링', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      const warnLogger = createLogger('WARN_TEST');

      // info는 필터링되어야 함
      warnLogger.info('Should not log');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      // warn은 로그되어야 함
      warnLogger.warn('Should log');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should default to info level', () => {
      const defaultLogger = createLogger('DEFAULT');

      defaultLogger.debug('Should not log');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      defaultLogger.info('Should log');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});

