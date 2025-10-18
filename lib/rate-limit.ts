import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limit 레코드
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * IP별 요청 기록 저장
 * 프로덕션에서는 Redis 등 외부 스토리지 사용 권장
 */
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Rate Limit 옵션
 */
export interface RateLimitOptions {
  max: number;        // 최대 요청 수
  windowMs: number;   // 시간 윈도우 (밀리초)
}

/**
 * 만료된 레코드 정리 (메모리 관리)
 */
function cleanup() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (record.resetAt < now) {
      rateLimitMap.delete(ip);
    }
  }
}

// 5분마다 정리
setInterval(cleanup, 5 * 60 * 1000);

/**
 * Rate Limiting 체크
 *
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const rateLimitResponse = rateLimit(request, {
 *     max: 10,          // 10회
 *     windowMs: 60000   // 1분
 *   });
 *
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // ... 정상 로직
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  // IP 주소 추출
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  let record = rateLimitMap.get(ip);

  // 레코드가 없거나 만료된 경우 새로 생성
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + options.windowMs,
    };
    rateLimitMap.set(ip, record);
  }

  // 요청 카운트 증가
  record.count++;

  // 제한 초과 체크
  if (record.count > options.max) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: `${retryAfter} seconds`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(options.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(record.resetAt / 1000)),
        },
      }
    );
  }

  // 정상 - null 반환 (제한 없음)
  return null;
}

/**
 * 사전 정의된 Rate Limit 프리셋
 */
export const rateLimitPresets = {
  // 크롤링 API: 분당 10회
  crawl: { max: 10, windowMs: 60 * 1000 },

  // 일반 API: 분당 60회
  api: { max: 60, windowMs: 60 * 1000 },

  // 인증 API: 5분당 5회 (브루트포스 방지)
  auth: { max: 5, windowMs: 5 * 60 * 1000 },

  // 회원가입: 시간당 3회
  register: { max: 3, windowMs: 60 * 60 * 1000 },

  // 게시글 작성: 분당 5회
  post: { max: 5, windowMs: 60 * 1000 },

  // 댓글 작성: 분당 10회
  comment: { max: 10, windowMs: 60 * 1000 },

  // 비밀번호 재설정: 10분당 3회
  passwordReset: { max: 3, windowMs: 10 * 60 * 1000 },

  // DB 초기화: 시간당 3회
  dangerous: { max: 3, windowMs: 60 * 60 * 1000 },
};
