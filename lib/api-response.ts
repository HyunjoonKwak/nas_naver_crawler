import { NextResponse } from 'next/server';

/**
 * API 응답 타입 정의
 */
export type ApiResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string };

/**
 * 성공 응답 생성
 */
export function success<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * 에러 응답 생성
 * 프로덕션 환경에서는 상세 에러 정보를 숨김
 */
export function error(
  message: string,
  status: number = 500,
  details?: any
) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(isDevelopment && details && { details: String(details) }),
    },
    { status }
  );
}

/**
 * API 핸들러 래퍼 - 자동 에러 처리
 */
export function apiHandler<T = any>(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err: any) {
      console.error('[API Error]', err);

      // 인증 에러
      if (err.message?.includes('로그인') || err.message?.includes('승인')) {
        return error(err.message, 401);
      }

      // 권한 에러
      if (err.message?.includes('권한')) {
        return error(err.message, 403);
      }

      // 일반 에러
      return error(
        '서버 오류가 발생했습니다.',
        500,
        err.message
      );
    }
  };
}
