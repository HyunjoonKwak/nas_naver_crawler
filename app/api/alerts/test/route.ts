/**
 * 알림 테스트 API
 * Discord 웹훅 테스트 전송
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  sendDiscordNotification,
  createNewArticleEmbed,
  createDeletedArticleEmbed,
  createPriceChangedEmbed,
  createCrawlSummaryEmbed,
} from '@/lib/discord';

/**
 * POST /api/alerts/test - Discord 웹훅 테스트
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, testType = 'new' } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook URL is required',
        },
        { status: 400 }
      );
    }

    // 테스트 데이터
    const testArticle = {
      articleNo: 'TEST12345',
      tradeTypeName: '전세',
      dealOrWarrantPrc: '50000',
      rentPrc: '0',
      area1: 84.5,
      buildingName: '101동 1001호',
      floorInfo: '10/20',
      direction: '남향',
      realtorName: '테스트 부동산',
      articleFeatureDesc: '깨끗한 집, 역세권, 신축 건물',
    };

    const complexName = '테스트 아파트';
    const complexNo = '12345';

    let embed;
    let title = '';

    switch (testType) {
      case 'new':
        embed = createNewArticleEmbed(testArticle, complexName, complexNo);
        title = '신규 매물 알림 테스트';
        break;

      case 'deleted':
        embed = createDeletedArticleEmbed(testArticle, complexName, complexNo);
        title = '삭제된 매물 알림 테스트';
        break;

      case 'priceChanged':
        const oldArticle = { ...testArticle, dealOrWarrantPrc: '55000' };
        embed = createPriceChangedEmbed(oldArticle, testArticle, complexName, complexNo);
        title = '가격 변동 알림 테스트';
        break;

      case 'summary':
        embed = createCrawlSummaryEmbed({
          complexName,
          complexNo,
          newCount: 3,
          deletedCount: 2,
          priceChangedCount: 1,
          totalArticles: 25,
          duration: 5430,
        });
        title = '크롤링 완료 요약 테스트';
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid test type. Use: new, deleted, priceChanged, summary',
          },
          { status: 400 }
        );
    }

    // Discord로 전송
    const result = await sendDiscordNotification(webhookUrl, {
      username: '네이버 부동산 크롤러 (테스트)',
      content: `🧪 ${title}`,
      embeds: [embed],
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test notification',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
    });
  } catch (error: any) {
    console.error('Failed to send test notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test notification',
      },
      { status: 500 }
    );
  }
}
