/**
 * 환경 변수 검증 및 타입 안전 접근
 * Zod를 사용한 스키마 검증
 */

import { z } from 'zod';

// 환경 변수 스키마
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Internal API
  INTERNAL_API_SECRET: z.string().min(32, 'INTERNAL_API_SECRET must be at least 32 characters'),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Naver Maps API (optional)
  NAVER_MAPS_CLIENT_ID: z.string().optional(),
  NAVER_MAPS_CLIENT_SECRET: z.string().optional(),

  // Public Data Portal API (optional)
  PUBLIC_DATA_SERVICE_KEY: z.string().optional(),
});

// 환경 변수 파싱 및 검증
export function validateEnv() {
  // 빌드 시점에는 검증 스킵
  if (process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NODE_ENV === 'test') {
    return process.env as any;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('❌ 환경 변수 검증 실패:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });

      // 개발 환경에서는 경고만
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  개발 환경이므로 계속 진행합니다.');
        return process.env as any;
      }

      throw new Error('환경 변수 검증 실패. .env 파일을 확인하세요.');
    }
    throw error;
  }
}

// 환경 변수 정보 로깅
export function logEnvInfo() {
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Environment Info:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
    console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Not set');
    console.log('  - REDIS_URL:', process.env.REDIS_URL ? '✓ Set' : '✗ Not set');
  }
}

// 검증된 환경 변수 export
export const env = validateEnv();

/**
 * 사용 예시:
 * 
 * ```typescript
 * import { env } from '@/lib/env';
 * 
 * // 타입 안전하게 사용
 * const dbUrl = env.DATABASE_URL;  // string (타입 보장)
 * const secret = env.NEXTAUTH_SECRET;  // string (최소 32자)
 * ```
 */
