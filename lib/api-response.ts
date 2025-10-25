import { NextResponse } from 'next/server';
import { ApiError, toApiError } from './api-error';
import { createLogger } from './logger';

const logger = createLogger('API');

/**
 * API 응답 타입 정의
 */
export type ApiResponse<T = any> =
  | { success: true; data: T; message?: string; meta?: any }
  | { success: false; error: { type: string; message: string; details?: any }; requestId?: string };

/**
 * 성공 응답 생성 헬퍼
 * 
 * @example
 * ```typescript
 * return ApiResponse.success(data, '크롤링 완료', { duration: 1234 });
 * ```
 */
export class ApiResponseHelper {
  /**
   * 성공 응답 생성
   */
  static success<T>(data: T, message?: string, meta?: any) {
    return NextResponse.json({
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { meta }),
    });
  }

  /**
   * 에러 응답 생성
   * 
   * @param error - ApiError 또는 일반 Error 객체
   * @param requestId - 요청 추적용 ID (선택)
   */
  static error(error: ApiError | Error | unknown, requestId?: string) {
    const apiError = toApiError(error);
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 500 에러는 상세 로그 남기기
    if (apiError.statusCode >= 500) {
      logger.error('API Error', {
        requestId,
        type: apiError.type,
        message: apiError.message,
        statusCode: apiError.statusCode,
        stack: apiError.stack,
        details: apiError.details,
      });
    } else {
      logger.warn('API Warning', {
        requestId,
        type: apiError.type,
        message: apiError.message,
        statusCode: apiError.statusCode,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          type: apiError.type,
          message: apiError.message,
          // 개발 환경에서만 상세 정보 노출
          ...(isDevelopment && apiError.details ? { details: apiError.details } : {}),
        },
        ...(requestId && { requestId }),
      },
      { status: apiError.statusCode }
    );
  }

  /**
   * API 핸들러 래퍼 - 자동 에러 처리 및 요청 ID 추가
   * 
   * @example
   * ```typescript
   * export const POST = ApiResponse.handler(async (request) => {
   *   const body = await request.json();
   *   const result = await processData(body);
   *   return ApiResponse.success(result, '처리 완료');
   * });
   * ```
   */
  static handler<T extends any[]>(
    handler: (...args: T) => Promise<NextResponse>
  ) {
    return async (...args: T): Promise<NextResponse> => {
      const requestId = crypto.randomUUID();
      const startTime = Date.now();

      try {
        logger.debug('API Request Started', { requestId });
        
        const response = await handler(...args);
        
        const duration = Date.now() - startTime;
        logger.info('API Request Completed', { requestId, duration });
        
        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        logger.error('API Request Failed', {
          requestId,
          duration,
          error: err instanceof Error ? err.message : String(err),
        });

        return this.error(err, requestId);
      }
    };
  }
}

// Legacy 호환성을 위한 함수 export
export const success = <T>(data: T, status: number = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};

export const error = (message: string, status: number = 500, details?: any) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(isDevelopment && details && { details: String(details) }),
    },
    { status }
  );
};

export const apiHandler = ApiResponseHelper.handler;
