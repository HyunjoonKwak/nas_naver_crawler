/**
 * API 에러 타입 정의
 * 표준화된 에러 처리를 위한 에러 분류
 */
export enum ErrorType {
  /** 요청 데이터 유효성 검증 실패 */
  VALIDATION = 'VALIDATION_ERROR',
  
  /** 인증 실패 (로그인 필요) */
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  
  /** 권한 부족 */
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  
  /** 리소스를 찾을 수 없음 */
  NOT_FOUND = 'NOT_FOUND',
  
  /** Rate Limit 초과 */
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  
  /** 서버 내부 오류 */
  INTERNAL = 'INTERNAL_SERVER_ERROR',
  
  /** 외부 API 호출 실패 */
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  
  /** 데이터베이스 오류 */
  DATABASE = 'DATABASE_ERROR',
  
  /** 크롤링 관련 오류 */
  CRAWLER = 'CRAWLER_ERROR',
}

/**
 * 표준화된 API 에러 클래스
 * 
 * @example
 * ```typescript
 * throw new ApiError(
 *   ErrorType.VALIDATION,
 *   '단지 번호를 입력해주세요.',
 *   400,
 *   { field: 'complexNumbers', received: body }
 * );
 * ```
 */
export class ApiError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * JSON 직렬화를 위한 메서드
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * 일반 Error를 ApiError로 변환
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(
      ErrorType.INTERNAL,
      error.message,
      500,
      { originalError: error.name, stack: error.stack }
    );
  }

  return new ApiError(
    ErrorType.INTERNAL,
    String(error),
    500
  );
}

/**
 * 사전 정의된 에러 생성 헬퍼
 */
export const ApiErrors = {
  validation: (message: string, details?: any) =>
    new ApiError(ErrorType.VALIDATION, message, 400, details),

  authentication: (message = '인증이 필요합니다.') =>
    new ApiError(ErrorType.AUTHENTICATION, message, 401),

  authorization: (message = '접근 권한이 없습니다.') =>
    new ApiError(ErrorType.AUTHORIZATION, message, 403),

  notFound: (resource: string) =>
    new ApiError(ErrorType.NOT_FOUND, `${resource}을(를) 찾을 수 없습니다.`, 404),

  rateLimit: (message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.') =>
    new ApiError(ErrorType.RATE_LIMIT, message, 429),

  internal: (message = '서버 오류가 발생했습니다.', details?: any) =>
    new ApiError(ErrorType.INTERNAL, message, 500, details),

  externalApi: (service: string, originalError?: any) =>
    new ApiError(
      ErrorType.EXTERNAL_API,
      `외부 서비스(${service}) 호출에 실패했습니다.`,
      502,
      { service, originalError: originalError?.message }
    ),

  database: (operation: string, originalError?: any) =>
    new ApiError(
      ErrorType.DATABASE,
      `데이터베이스 작업(${operation})에 실패했습니다.`,
      500,
      { operation, originalError: originalError?.message }
    ),

  crawler: (message: string, details?: any) =>
    new ApiError(ErrorType.CRAWLER, message, 500, details),
};

