/**
 * 기존 Article 데이터의 문자열 가격을 숫자로 변환하여 새 컬럼에 저장
 *
 * 사용법:
 *   npx ts-node scripts/migrate-price-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { parsePriceToWon } from '../lib/price-utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting price data migration...\n');

  try {
    // 전체 Article 수 조회
    const totalCount = await prisma.article.count();
    console.log(`📊 Total articles to migrate: ${totalCount.toLocaleString()}\n`);

    if (totalCount === 0) {
      console.log('✅ No articles to migrate.');
      return;
    }

    // 배치 크기
    const batchSize = 100;
    const totalBatches = Math.ceil(totalCount / batchSize);
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    console.log(`📦 Processing in ${totalBatches} batches (${batchSize} articles per batch)\n`);

    for (let batch = 0; batch < totalBatches; batch++) {
      const skip = batch * batchSize;

      // 배치 단위로 조회
      const articles = await prisma.article.findMany({
        select: {
          id: true,
          dealOrWarrantPrc: true,
          rentPrc: true,
        },
        skip,
        take: batchSize,
      });

      // 각 Article 업데이트
      for (const article of articles) {
        try {
          const dealOrWarrantPrcWon = parsePriceToWon(article.dealOrWarrantPrc);
          const rentPrcWon = article.rentPrc ? parsePriceToWon(article.rentPrc) : null;

          await prisma.article.update({
            where: { id: article.id },
            data: {
              dealOrWarrantPrcWon: dealOrWarrantPrcWon > 0 ? BigInt(dealOrWarrantPrcWon) : null,
              rentPrcWon: rentPrcWon && rentPrcWon > 0 ? BigInt(rentPrcWon) : null,
            },
          });

          updatedCount++;
        } catch (error: any) {
          console.error(`❌ Error updating article ${article.id}:`, error);
          errorCount++;
        }

        processedCount++;
      }

      // 진행 상황 표시
      const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
      process.stdout.write(`\r⏳ Progress: ${progress}% (${processedCount.toLocaleString()}/${totalCount.toLocaleString()})`);
    }

    console.log('\n');
    console.log('✅ Migration completed!');
    console.log(`   - Total processed: ${processedCount.toLocaleString()}`);
    console.log(`   - Successfully updated: ${updatedCount.toLocaleString()}`);
    console.log(`   - Errors: ${errorCount.toLocaleString()}`);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
