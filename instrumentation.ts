/**
 * Next.js Instrumentation
 * 서버 시작 시 실행되는 초기화 코드
 */

export async function register() {
  // 서버 환경에서만 실행
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { loadAllSchedules } = await import('@/lib/scheduler');

    console.log('🚀 Server starting - Initializing schedulers...');

    // 스케줄러 초기화
    try {
      const count = await loadAllSchedules();
      console.log(`✅ Scheduler initialization complete: ${count} schedule(s) loaded`);
    } catch (error) {
      console.error('❌ Failed to initialize schedulers:', error);
    }
  }
}
