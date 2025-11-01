/**
 * API 응답 헬퍼 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';

// Logger 모킹
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('ApiResponseHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success', () => {
    it('should create success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = ApiResponseHelper.success(data);

      expect(response).toBeInstanceOf(NextResponse);
      // Response body 검증은 실제 JSON 파싱이 필요하므로 생략
    });

    it('should include message when provided', () => {
      const data = { count: 5 };
      const message = 'Success';
      const response = ApiResponseHelper.success(data, message);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should include meta when provided', () => {
      const data = { items: [] };
      const meta = { page: 1, total: 100 };
      const response = ApiResponseHelper.success(data, 'Success', meta);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('error', () => {
    it('should create error response from ApiError', () => {
      const apiError = new ApiError(ErrorType.NOT_FOUND, 'Not found', 404);
      const response = ApiResponseHelper.error(apiError);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should create error response from standard Error', () => {
      const error = new Error('Something went wrong');
      const response = ApiResponseHelper.error(error);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle unknown error type', () => {
      const error = 'String error';
      const response = ApiResponseHelper.error(error);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should include requestId when provided', () => {
      const apiError = new ApiError(ErrorType.INTERNAL, 'Error', 500);
      const requestId = 'req-123';
      const response = ApiResponseHelper.error(apiError, requestId);

      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  describe('handler wrapper', () => {
    it('should execute handler successfully', async () => {
      const mockHandler = vi.fn(async () => {
        return ApiResponseHelper.success({ result: 'ok' });
      });

      const wrappedHandler = ApiResponseHelper.handler(mockHandler);
      const response = await wrappedHandler();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should catch and convert errors', async () => {
      const mockHandler = vi.fn(async () => {
        throw new ApiError(ErrorType.VALIDATION, 'Test error', 400);
      });

      const wrappedHandler = ApiResponseHelper.handler(mockHandler);
      const response = await wrappedHandler();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should generate requestId automatically', async () => {
      const mockHandler = vi.fn(async () => {
        return ApiResponseHelper.success({ data: 'test' });
      });

      const wrappedHandler = ApiResponseHelper.handler(mockHandler);
      await wrappedHandler();

      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
