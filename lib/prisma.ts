// Prisma Client Singleton
// Next.js에서 Hot Reload 시 Prisma Client가 중복 생성되는 것을 방지

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 재연결 설정
    errorFormat: 'minimal',
  })

// 연결 에러 핸들링
prisma.$connect().catch((error) => {
  console.error('Failed to connect to database:', error);
  // 재연결 시도
  setTimeout(() => {
    prisma.$connect().catch(console.error);
  }, 5000);
});

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
