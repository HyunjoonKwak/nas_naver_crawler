/**
 * Next.js Instrumentation
 * 서버 시작 시 실행되는 초기화 코드
 */

export async function register() {
  // 빌드 시에는 실행하지 않음 (DB 연결 불가)
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏭️  Skipping scheduler initialization (build time)');
    return;
  }

  // 서버 환경에서만 실행
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // EventEmitter 메모리 누수 방지: MaxListeners 증가
    // SSE, 크롤러, Prisma 등 여러 모듈에서 beforeExit 리스너를 등록하므로
    // 기본값 10개로는 부족할 수 있음
    process.setMaxListeners(20);
    console.log('⚙️  EventEmitter MaxListeners set to 20');
    const { loadAllSchedules } = await import('@/lib/scheduler');

    console.log('🚀 Server starting - Initializing schedulers...');

    // 스케줄러 초기화
    try {
      const count = await loadAllSchedules();
      console.log(`✅ Scheduler initialization complete: ${count} schedule(s) loaded`);
    } catch (error: any) {
      console.error('❌ Failed to initialize schedulers:', error);
    }
  }
}
