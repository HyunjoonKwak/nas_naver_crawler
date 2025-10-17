/**
 * 환경 변수 검증 및 타입 안전한 접근
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

/**
 * 필수 환경 변수 검증
 * 앱 시작 시 한 번만 호출
 */
export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\n` +
      `Please check your .env file and ensure all required variables are set.\n` +
      `See .env.example for reference.`
    );
  }

  console.log('✅ Environment variables validated');
}

/**
 * 타입 안전한 환경 변수 접근
 */
export const env = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL!,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },
} as const;

/**
 * 환경 변수 로깅 (민감 정보 제외)
 */
export function logEnvInfo() {
  if (env.app.isDevelopment) {
    console.log('📋 Environment Info:');
    console.log(`  - NODE_ENV: ${env.app.nodeEnv}`);
    console.log(`  - NEXTAUTH_URL: ${env.auth.url}`);
    console.log(`  - DATABASE_URL: ${env.database.url.replace(/:[^:@]+@/, ':****@')}`);
  }
}
