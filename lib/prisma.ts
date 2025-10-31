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

// 연결 에러 핸들링 (빌드 시에는 건너뛰기)
if (process.env.SKIP_ENV_VALIDATION !== 'true') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error);
    // 재연결 시도
    setTimeout(() => {
      prisma.$connect().catch(console.error);
    }, 5000);
  });
}

// Graceful shutdown (중복 등록 방지)
if (typeof window === 'undefined') {
  // 기존 리스너 제거 후 등록 (메모리 누수 방지)
  const cleanupHandler = async () => {
    await prisma.$disconnect();
  };

  // beforeExit 리스너를 한 번만 등록 (중복 방지)
  if (!globalForPrisma.prisma) {
    process.on('beforeExit', cleanupHandler);
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
