import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimit, rateLimitPresets } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const logger = createLogger('DB-RESET');

/**
 * POST /api/database/reset
 * 데이터베이스 초기화 (모든 테이블 데이터 삭제)
 * ADMIN 전용
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (시간당 3회 - 위험한 작업 방지)
    const rateLimitResponse = rateLimit(request, rateLimitPresets.dangerous);
    if (rateLimitResponse) return rateLimitResponse;

    // ADMIN 권한 확인
    const currentUser = await requireAuth();
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '관리자만 데이터베이스를 초기화할 수 있습니다.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { confirmText, deleteFiles } = body;

    // 안전장치: "RESET DATABASE" 텍스트 확인
    if (confirmText !== 'RESET DATABASE') {
      return NextResponse.json(
        { error: '확인 텍스트가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    logger.warn('Database reset initiated', { userId: currentUser.id, email: currentUser.email });

    // 트랜잭션으로 모든 테이블 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 알림 로그 삭제
      await tx.notificationLog.deleteMany({});
      logger.info('NotificationLog deleted');

      // 2. 스케줄 로그 삭제
      await tx.scheduleLog.deleteMany({});
      logger.info('ScheduleLog deleted');

      // 3. 알림 삭제
      await tx.alert.deleteMany({});
      logger.info('Alert deleted');

      // 4. 스케줄 삭제
      await tx.schedule.deleteMany({});
      logger.info('Schedule deleted');

      // 5. 크롤링 히스토리 삭제
      await tx.crawlHistory.deleteMany({});
      logger.info('CrawlHistory deleted');

      // 6. 즐겨찾기 삭제
      await tx.favorite.deleteMany({});
      logger.info('Favorite deleted');

      // 7. 매물 삭제
      await tx.article.deleteMany({});
      logger.info('Article deleted');

      // 8. 단지 삭제
      await tx.complex.deleteMany({});
      logger.info('Complex deleted');
    });

    // favorites.json 파일 초기화 (선택적)
    if (deleteFiles) {
      const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
      const favoritesPath = path.join(baseDir, 'crawled_data', 'favorites.json');
      try {
        await fs.writeFile(favoritesPath, JSON.stringify({ favorites: [] }, null, 2));
        logger.info('favorites.json initialized');
      } catch (error: any) {
        logger.warn('Failed to initialize favorites.json (ignored)', { error: error.message });
      }
    }

    logger.info('Database reset completed successfully');

    return NextResponse.json({
      success: true,
      message: '데이터베이스가 성공적으로 초기화되었습니다.',
      deletedTables: [
        'NotificationLog',
        'ScheduleLog',
        'Alert',
        'Schedule',
        'CrawlHistory',
        'Favorite',
        'Article',
        'Complex',
      ],
    });
  } catch (error: any) {
    logger.error('Database reset failed', error);
    return NextResponse.json(
      { error: '데이터베이스 초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/database/reset
 * 현재 DB 상태 조회 (초기화 전 확인용)
 */
export async function GET(request: NextRequest) {
  try {
    const [
      complexCount,
      articleCount,
      favoriteCount,
      crawlHistoryCount,
      alertCount,
      scheduleCount,
    ] = await Promise.all([
      prisma.complex.count(),
      prisma.article.count(),
      prisma.favorite.count(),
      prisma.crawlHistory.count(),
      prisma.alert.count(),
      prisma.schedule.count(),
    ]);

    const total = complexCount + articleCount + favoriteCount + crawlHistoryCount + alertCount + scheduleCount;
    logger.debug('Database status checked', { total });

    return NextResponse.json({
      tables: {
        Complex: complexCount,
        Article: articleCount,
        Favorite: favoriteCount,
        CrawlHistory: crawlHistoryCount,
        Alert: alertCount,
        Schedule: scheduleCount,
      },
      total,
    });
  } catch (error: any) {
    logger.error('Database status check failed', error);
    return NextResponse.json(
      { error: '데이터베이스 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
