/**
 * 동적 타임아웃 계산 유틸리티
 * 크롤링 히스토리를 분석하여 적절한 타임아웃을 계산
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 동적 타임아웃 계산
 * 최근 크롤링 히스토리를 분석하여 단지당 평균 소요 시간을 계산하고,
 * 크롤링할 단지 개수를 기반으로 적절한 타임아웃을 반환
 */
export async function calculateDynamicTimeout(complexCount: number): Promise<number> {
  try {
    // 최근 30일간의 성공한 크롤링 히스토리 조회
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentCrawls = await prisma.crawlHistory.findMany({
      where: {
        status: {
          in: ['success', 'completed', 'partial']
        },
        createdAt: {
          gte: thirtyDaysAgo
        },
        totalComplexes: {
          gt: 0
        },
        duration: {
          gt: 0
        }
      },
      select: {
        totalComplexes: true,
        duration: true,
        totalArticles: true,
      },
      take: 50, // 최근 50개만 분석
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (recentCrawls.length === 0) {
      // 히스토리가 없으면 기본값 사용: 단지당 3분 + 기본 5분
      const baseTimeout = 5 * 60 * 1000; // 5분
      const perComplexTimeout = 3 * 60 * 1000; // 단지당 3분
      const calculated = baseTimeout + (complexCount * perComplexTimeout);
      console.log(`   [Timeout] No history found, using default: ${Math.floor(calculated / 1000)}s`);
      return Math.min(calculated, 1800000); // 최대 30분
    }

    // 단지당 평균 소요 시간 계산 (초 단위)
    const avgTimePerComplex = recentCrawls.reduce((sum, crawl) => {
      return sum + (crawl.duration / crawl.totalComplexes);
    }, 0) / recentCrawls.length;

    // 매물 개수가 많을수록 시간이 더 걸릴 수 있으므로 추가 고려
    const avgArticlesPerComplex = recentCrawls.reduce((sum, crawl) => {
      return sum + (crawl.totalArticles / crawl.totalComplexes);
    }, 0) / recentCrawls.length;

    console.log(`   [Timeout] Analysis from ${recentCrawls.length} recent crawls:`);
    console.log(`   [Timeout] - Avg time per complex: ${Math.floor(avgTimePerComplex)}s`);
    console.log(`   [Timeout] - Avg articles per complex: ${Math.floor(avgArticlesPerComplex)}`);

    // 기본 타임아웃: (단지당 평균 시간 * 단지 개수) * 1.5배 여유 + 5분 버퍼
    const baseTimeout = 5 * 60; // 5분 버퍼 (초 단위)
    const calculatedTimeout = (avgTimePerComplex * complexCount * 1.5) + baseTimeout;

    // 최소 10분, 최대 30분
    const minTimeout = 10 * 60; // 10분
    const maxTimeout = 30 * 60; // 30분
    const finalTimeout = Math.max(minTimeout, Math.min(calculatedTimeout, maxTimeout));

    console.log(`   [Timeout] Calculated timeout: ${Math.floor(finalTimeout)}s (${Math.floor(finalTimeout / 60)}min)`);

    return finalTimeout * 1000; // 밀리초로 변환
  } catch (error) {
    console.error('   [Timeout] Failed to calculate dynamic timeout:', error);
    // 에러 시 안전한 기본값 반환: 단지당 3분 + 5분 버퍼
    const fallbackTimeout = (complexCount * 3 * 60 + 5 * 60) * 1000;
    return Math.min(fallbackTimeout, 1800000); // 최대 30분
  }
}
