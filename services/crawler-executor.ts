/**
 * Python 크롤러 실행 서비스
 *
 * 책임:
 * - Python 크롤러 프로세스 실행
 * - stdout/stderr 스트리밍
 * - 타임아웃 관리
 */

import { spawn } from 'child_process';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CRAWLER_EXECUTOR');

export interface CrawlerExecutionOptions {
  crawlId: string;
  complexNos: string; // 콤마로 구분된 단지 번호
  baseDir: string;
  timeout: number; // 밀리초
}

export interface CrawlerExecutionResult {
  success: boolean;
  exitCode: number;
  error?: string;
  duration: number;
}

/**
 * Python 크롤러를 실행합니다.
 *
 * @param options - 크롤러 실행 옵션
 * @returns 실행 결과
 */
export async function executePythonCrawler(
  options: CrawlerExecutionOptions
): Promise<CrawlerExecutionResult> {
  const { crawlId, complexNos, baseDir, timeout } = options;
  const startTime = Date.now();

  logger.info('Starting Python crawler', {
    crawlId,
    complexCount: complexNos.split(',').length,
    timeout,
  });

  return new Promise((resolve) => {
    const pythonProcess = spawn(
      'python3',
      [
        '-u', // unbuffered output
        `${baseDir}/logic/nas_playwright_crawler.py`,
        complexNos,
        crawlId,
      ],
      {
        cwd: baseDir,
        env: process.env,
      }
    );

    let hasOutput = false;

    // stdout 실시간 출력
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (!hasOutput) {
        logger.debug('Python crawler output started');
        hasOutput = true;
      }
      process.stdout.write(output);
    });

    // stderr 실시간 출력
    pythonProcess.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      logger.warn('Crawler timeout reached, killing process', {
        crawlId,
        timeout,
      });
      pythonProcess.kill('SIGTERM');
    }, timeout);

    // 프로세스 종료 처리
    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      if (code === 0) {
        logger.info('Python crawler completed successfully', {
          crawlId,
          duration,
        });
        resolve({
          success: true,
          exitCode: code,
          duration,
        });
      } else {
        logger.error('Python crawler failed', {
          crawlId,
          exitCode: code,
          duration,
        });
        resolve({
          success: false,
          exitCode: code,
          error: `Python crawler exited with code ${code}`,
          duration,
        });
      }
    });

    // 프로세스 에러 처리
    pythonProcess.on('error', (error) => {
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      logger.error('Python crawler process error', {
        crawlId,
        error: error.message,
        duration,
      });

      resolve({
        success: false,
        exitCode: -1,
        error: error.message,
        duration,
      });
    });
  });
}
