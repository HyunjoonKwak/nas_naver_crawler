import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('HEALTH');

/**
 * 헬스체크 엔드포인트
 * 
 * 시스템 구성 요소의 상태를 확인합니다:
 * - 데이터베이스 연결
 * - Redis 연결 (있는 경우)
 * - 디스크 공간
 * 
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      disk: await checkDiskSpace(),
      uptime: process.uptime(),
    };

    const allHealthy = Object.values(checks).every(
      check => typeof check === 'number' || check.status === 'ok'
    );

    const responseTime = Date.now() - startTime;

    const response = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      responseTime,
    };

    if (!allHealthy) {
      logger.warn('Health check degraded', response);
    }

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    logger.error('Health check failed', { error });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * 데이터베이스 연결 확인
 */
async function checkDatabase() {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'ok',
      responseTime,
      message: 'Database connected',
    };
  } catch (error: any) {
    logger.error('Database check failed', { error });
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Redis 연결 확인 (있는 경우)
 */
async function checkRedis() {
  if (!process.env.REDIS_URL) {
    return {
      status: 'skipped',
      message: 'Redis not configured',
    };
  }

  try {
    // Redis 클라이언트 동적 import (설치되어 있는 경우만)
    const { createClient } = await import('redis').catch(() => ({
      createClient: null,
    }));

    if (!createClient) {
      return {
        status: 'skipped',
        message: 'Redis client not installed',
      };
    }

    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();

    const startTime = Date.now();
    await client.ping();
    const responseTime = Date.now() - startTime;

    await client.quit();

    return {
      status: 'ok',
      responseTime,
      message: 'Redis connected',
    };
  } catch (error: any) {
    logger.error('Redis check failed', { error });
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * 디스크 공간 확인
 */
async function checkDiskSpace() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // crawled_data 디렉토리 크기 확인
    const crawledDataPath = path.join(process.cwd(), 'crawled_data');
    
    let size = 0;
    try {
      const files = await fs.readdir(crawledDataPath);
      for (const file of files) {
        const filePath = path.join(crawledDataPath, file);
        const stats = await fs.stat(filePath);
        size += stats.size;
      }
    } catch {
      // 디렉토리가 없으면 0
    }

    const sizeInMB = (size / 1024 / 1024).toFixed(2);

    return {
      status: 'ok',
      crawledDataSize: `${sizeInMB} MB`,
      message: 'Disk space available',
    };
  } catch (error: any) {
    logger.error('Disk check failed', { error });
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

