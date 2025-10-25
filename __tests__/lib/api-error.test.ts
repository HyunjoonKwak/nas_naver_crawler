import { describe, it, expect } from 'vitest';
import { ApiError, ErrorType, ApiErrors, toApiError } from '@/lib/api-error';

describe('ApiError', () => {
  describe('기본 생성', () => {
    it('should create an ApiError with all properties', () => {
      const error = new ApiError(
        ErrorType.VALIDATION,
        'Invalid input',
        400,
        { field: 'email' }
      );

      expect(error).toBeInstanceOf(ApiError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should have correct name property', () => {
      const error = new ApiError(ErrorType.INTERNAL, 'Test', 500);
      expect(error.name).toBe('ApiError');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON correctly', () => {
      const error = new ApiError(
        ErrorType.NOT_FOUND,
        'Resource not found',
        404,
        { resourceId: '123' }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        type: ErrorType.NOT_FOUND,
        message: 'Resource not found',
        statusCode: 404,
        details: { resourceId: '123' },
      });
    });

    it('should omit details if not provided', () => {
      const error = new ApiError(ErrorType.INTERNAL, 'Test', 500);
      const json = error.toJSON();

      expect(json).toEqual({
        type: ErrorType.INTERNAL,
        message: 'Test',
        statusCode: 500,
      });
      expect(json).not.toHaveProperty('details');
    });
  });

  describe('toApiError', () => {
    it('should return ApiError as is', () => {
      const original = new ApiError(ErrorType.VALIDATION, 'Test', 400);
      const converted = toApiError(original);

      expect(converted).toBe(original);
    });

    it('should convert Error to ApiError', () => {
      const original = new Error('Something went wrong');
      const converted = toApiError(original);

      expect(converted).toBeInstanceOf(ApiError);
      expect(converted.type).toBe(ErrorType.INTERNAL);
      expect(converted.message).toBe('Something went wrong');
      expect(converted.statusCode).toBe(500);
    });

    it('should convert string to ApiError', () => {
      const converted = toApiError('Unknown error');

      expect(converted).toBeInstanceOf(ApiError);
      expect(converted.type).toBe(ErrorType.INTERNAL);
      expect(converted.message).toBe('Unknown error');
      expect(converted.statusCode).toBe(500);
    });
  });

  describe('ApiErrors helper', () => {
    it('should create validation error', () => {
      const error = ApiErrors.validation('Invalid email', { field: 'email' });

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create authentication error', () => {
      const error = ApiErrors.authentication();

      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.message).toBe('인증이 필요합니다.');
      expect(error.statusCode).toBe(401);
    });

    it('should create authorization error', () => {
      const error = ApiErrors.authorization();

      expect(error.type).toBe(ErrorType.AUTHORIZATION);
      expect(error.message).toBe('접근 권한이 없습니다.');
      expect(error.statusCode).toBe(403);
    });

    it('should create not found error', () => {
      const error = ApiErrors.notFound('단지');

      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.message).toContain('단지');
      expect(error.statusCode).toBe(404);
    });

    it('should create rate limit error', () => {
      const error = ApiErrors.rateLimit();

      expect(error.type).toBe(ErrorType.RATE_LIMIT);
      expect(error.statusCode).toBe(429);
    });

    it('should create internal error', () => {
      const error = ApiErrors.internal('Database connection failed');

      expect(error.type).toBe(ErrorType.INTERNAL);
      expect(error.message).toBe('Database connection failed');
      expect(error.statusCode).toBe(500);
    });

    it('should create external API error', () => {
      const error = ApiErrors.externalApi('Naver API');

      expect(error.type).toBe(ErrorType.EXTERNAL_API);
      expect(error.message).toContain('Naver API');
      expect(error.statusCode).toBe(502);
    });

    it('should create database error', () => {
      const error = ApiErrors.database('insert');

      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.message).toContain('insert');
      expect(error.statusCode).toBe(500);
    });

    it('should create crawler error', () => {
      const error = ApiErrors.crawler('Failed to parse HTML');

      expect(error.type).toBe(ErrorType.CRAWLER);
      expect(error.message).toBe('Failed to parse HTML');
      expect(error.statusCode).toBe(500);
    });
  });
});

