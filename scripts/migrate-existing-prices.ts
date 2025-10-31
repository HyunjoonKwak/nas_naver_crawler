#!/usr/bin/env ts-node
/**
 * 기존 매물 데이터의 문자열 가격을 숫자 컬럼으로 마이그레이션
 *
 * 실행 방법:
 * npx ts-node scripts/migrate-existing-prices.ts
 */

import { PrismaClient } from '@prisma/client';
import { parsePriceToWonBigInt } from '../lib/price-utils';

const prisma = new PrismaClient();

async function migratePrices() {
  console.log('🔄 Starting price migration...\n');
  
  try {
    // 1. 전체 매물 수 확인
    const totalCount = await prisma.article.count({
      where: {
        OR: [
          { dealOrWarrantPrcWon: null },
          { dealOrWarrantPrcWon: 0 }
        ]
      }
    });
    
    console.log(`📊 Found ${totalCount} articles to migrate`);
    
    if (totalCount === 0) {
      console.log('✅ No articles to migrate - all prices are already converted');
      return;
    }
    
    // 2. 배치 처리 (1000개씩)
    const batchSize = 1000;
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    
    while (processed < totalCount) {
      const startTime = Date.now();
      
      // 배치 조회
      const articles = await prisma.article.findMany({
        where: {
          OR: [
            { dealOrWarrantPrcWon: null },
            { dealOrWarrantPrcWon: 0 }
          ]
        },
        select: {
          id: true,
          dealOrWarrantPrc: true,
          rentPrc: true,
        },
        take: batchSize,
      });
      
      if (articles.length === 0) break;
      
      // 3. 트랜잭션으로 배치 업데이트
      try {
        await prisma.$transaction(
          articles.map(article => {
            const dealWon = parsePriceToWonBigInt(article.dealOrWarrantPrc);
            const rentWon = article.rentPrc ? parsePriceToWonBigInt(article.rentPrc) : null;
            
            return prisma.article.update({
              where: { id: article.id },
              data: {
                dealOrWarrantPrcWon: dealWon,
                rentPrcWon: rentWon,
              }
            });
          })
        );
        
        successCount += articles.length;
      } catch (error: any) {
        console.error(`\n❌ Batch update failed:`, error.message);
        errorCount += articles.length;
      }
      
      processed += articles.length;
      const progress = ((processed / totalCount) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`⏳ Progress: ${processed}/${totalCount} (${progress}%) - Batch time: ${elapsed}s`);
    }
    
    console.log('\n✅ Migration completed!');
    console.log(`📈 Results:`);
    console.log(`   - Total processed: ${processed}`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    
    // 4. 검증
    const verifyCount = await prisma.article.count({
      where: {
        AND: [
          { dealOrWarrantPrcWon: { not: null } },
          { dealOrWarrantPrcWon: { gt: 0 } }
        ]
      }
    });
    
    console.log(`\n🔍 Verification:`);
    console.log(`   - Articles with numeric prices: ${verifyCount}`);
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// 메인 실행
migratePrices()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

