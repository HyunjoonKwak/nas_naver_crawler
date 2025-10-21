/**
 * 환경 변수 검증 및 타입 안전한 접근
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

/**
 * 약한 시크릿 키 패턴 (보안 취약)
 */
const weakSecretPatterns = [
  'your-secret-key',
  'change-me',
  'replace-with',
  'secret',
  'password',
  'test',
  'demo',
  'example',
];

/**
 * 필수 환경 변수 검증
 * 앱 시작 시 한 번만 호출
 */
export function validateEnv() {
  // Skip validation during build time
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.log('⏭️  Skipping environment validation (build time)');
    return;
  }

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

  // NEXTAUTH_SECRET 강도 검증 (프로덕션 환경만)
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.NEXTAUTH_SECRET || '';

    // 길이 검증 (최소 32자)
    if (secret.length < 32) {
      throw new Error(
        `❌ NEXTAUTH_SECRET is too short (${secret.length} characters).\n` +
        `It must be at least 32 characters for production.\n` +
        `Generate a strong secret with: openssl rand -base64 32`
      );
    }

    // 약한 패턴 검증
    const secretLower = secret.toLowerCase();
    const weakPattern = weakSecretPatterns.find(pattern =>
      secretLower.includes(pattern)
    );

    if (weakPattern) {
      throw new Error(
        `❌ NEXTAUTH_SECRET contains weak pattern: "${weakPattern}"\n` +
        `Please use a strong random string for production.\n` +
        `Generate a strong secret with: openssl rand -base64 32`
      );
    }
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
