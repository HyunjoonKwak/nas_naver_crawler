import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/database/reset
 * 데이터베이스 초기화 (모든 테이블 데이터 삭제)
 * ADMIN 전용
 */
export async function POST(request: NextRequest) {
  try {
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

    // 트랜잭션으로 모든 테이블 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 알림 로그 삭제
      await tx.notificationLog.deleteMany({});
      console.log('✓ NotificationLog 삭제 완료');

      // 2. 스케줄 로그 삭제
      await tx.scheduleLog.deleteMany({});
      console.log('✓ ScheduleLog 삭제 완료');

      // 3. 알림 삭제
      await tx.alert.deleteMany({});
      console.log('✓ Alert 삭제 완료');

      // 4. 스케줄 삭제
      await tx.schedule.deleteMany({});
      console.log('✓ Schedule 삭제 완료');

      // 5. 크롤링 히스토리 삭제
      await tx.crawlHistory.deleteMany({});
      console.log('✓ CrawlHistory 삭제 완료');

      // 6. 즐겨찾기 삭제
      await tx.favorite.deleteMany({});
      console.log('✓ Favorite 삭제 완료');

      // 7. 매물 삭제
      await tx.article.deleteMany({});
      console.log('✓ Article 삭제 완료');

      // 8. 단지 삭제
      await tx.complex.deleteMany({});
      console.log('✓ Complex 삭제 완료');
    });

    // favorites.json 파일 초기화 (선택적)
    if (deleteFiles) {
      const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
      const favoritesPath = path.join(baseDir, 'crawled_data', 'favorites.json');
      try {
        await fs.writeFile(favoritesPath, JSON.stringify({ favorites: [] }, null, 2));
        console.log('✓ favorites.json 초기화 완료');
      } catch (error) {
        console.warn('favorites.json 초기화 실패 (무시):', error);
      }
    }

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
  } catch (error) {
    console.error('Database reset error:', error);
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

    return NextResponse.json({
      tables: {
        Complex: complexCount,
        Article: articleCount,
        Favorite: favoriteCount,
        CrawlHistory: crawlHistoryCount,
        Alert: alertCount,
        Schedule: scheduleCount,
      },
      total: complexCount + articleCount + favoriteCount + crawlHistoryCount + alertCount + scheduleCount,
    });
  } catch (error) {
    console.error('Database status check error:', error);
    return NextResponse.json(
      { error: '데이터베이스 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
