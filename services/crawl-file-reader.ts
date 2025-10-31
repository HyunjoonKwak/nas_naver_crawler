/**
 * 크롤링 결과 파일 읽기 서비스
 *
 * 책임:
 * - 최신 크롤링 결과 파일 찾기
 * - JSON 파일 읽기 및 파싱
 * - 데이터 유효성 검증
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CRAWL_FILE_READER');

export interface CrawlFileMetadata {
  fileName: string;
  filePath: string;
  mtime: Date;
  size: number;
}

/**
 * 크롤링 데이터 디렉토리에서 최신 결과 파일을 찾습니다.
 *
 * @param crawledDataDir - 크롤링 데이터 디렉토리 경로
 * @returns 최신 파일의 메타데이터, 없으면 null
 */
export async function findLatestCrawlFile(
  crawledDataDir: string
): Promise<CrawlFileMetadata | null> {
  try {
    const files = await fs.readdir(crawledDataDir);

    // complexes_로 시작하는 JSON 파일만 필터링
    const jsonFiles = files
      .filter(f => f.startsWith('complexes_') && f.endsWith('.json'))
      .map(f => {
        const fullPath = path.join(crawledDataDir, f);
        const stats = require('fs').statSync(fullPath);
        return {
          fileName: f,
          filePath: fullPath,
          mtime: stats.mtime,
          size: stats.size,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // 최신순 정렬

    if (jsonFiles.length === 0) {
      logger.warn('No crawl result files found', { crawledDataDir });
      return null;
    }

    const latest = jsonFiles[0];
    logger.info('Found latest crawl file', {
      fileName: latest.fileName,
      size: latest.size,
      mtime: latest.mtime,
    });

    return latest;
  } catch (error: any) {
    logger.error('Failed to find crawl files', {
      crawledDataDir,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 크롤링 결과 파일을 읽고 파싱합니다.
 *
 * @param filePath - 파일 경로
 * @returns 파싱된 크롤링 데이터 배열
 */
export async function readCrawlData(filePath: string): Promise<any[]> {
  try {
    logger.debug('Reading crawl data file', { filePath });

    const rawData = await fs.readFile(filePath, 'utf-8');
    const crawlData = JSON.parse(rawData);

    // 데이터가 배열인지 확인하고, 아니면 배열로 변환
    const dataArray = Array.isArray(crawlData) ? crawlData : [crawlData];

    logger.info('Crawl data loaded', {
      filePath,
      complexCount: dataArray.length,
    });

    return dataArray;
  } catch (error: any) {
    logger.error('Failed to read crawl data', {
      filePath,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 크롤링 데이터의 유효성을 검증합니다.
 *
 * @param data - 크롤링 데이터
 * @returns 유효한 데이터만 필터링
 */
export function validateCrawlData(data: any[]): {
  valid: any[];
  invalid: { index: number; reason: string }[];
} {
  const valid: any[] = [];
  const invalid: { index: number; reason: string }[] = [];

  data.forEach((item, index) => {
    // Overview와 Articles 중 최소 하나는 있어야 함
    if (!item.overview && !item.articles) {
      invalid.push({
        index,
        reason: 'Missing both overview and articles',
      });
      return;
    }

    // complexNo 필수
    const complexNo = item.overview?.complexNo || item.crawling_info?.complex_no;
    if (!complexNo) {
      invalid.push({
        index,
        reason: 'Missing complexNo',
      });
      return;
    }

    valid.push(item);
  });

  if (invalid.length > 0) {
    logger.warn('Invalid crawl data found', {
      totalCount: data.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      invalidItems: invalid,
    });
  }

  return { valid, invalid };
}

/**
 * 최신 크롤링 결과를 읽고 유효성 검증까지 수행합니다. (헬퍼 함수)
 *
 * @param baseDir - 베이스 디렉토리
 * @returns 유효한 크롤링 데이터 배열
 */
export async function loadLatestCrawlData(baseDir: string): Promise<{
  data: any[];
  errors: string[];
}> {
  const crawledDataDir = path.join(baseDir, 'crawled_data');

  // 최신 파일 찾기
  const fileMetadata = await findLatestCrawlFile(crawledDataDir);
  if (!fileMetadata) {
    return {
      data: [],
      errors: ['No crawl result files found'],
    };
  }

  // 파일 읽기
  const rawData = await readCrawlData(fileMetadata.filePath);

  // 유효성 검증
  const { valid, invalid } = validateCrawlData(rawData);

  const errors = invalid.map(
    item => `Complex ${item.index}: ${item.reason}`
  );

  return {
    data: valid,
    errors,
  };
}
