/**
 * 스키마 검증 헬퍼 함수
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from './logger';

const logger = createLogger('VALIDATION');

/**
 * Zod 스키마 검증 결과
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; response: NextResponse };

/**
 * Request body 검증 헬퍼
 *
 * @example
 * ```ts
 * const result = await validateRequest(request, createPostSchema);
 * if (!result.success) return result.response;
 *
 * const { title, content, category } = result.data;
 * ```
 */
export async function validateRequest<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      const errorMessage = `${firstError.path.join('.')}: ${firstError.message}`;

      logger.warn('Request validation failed', {
        path: firstError.path,
        message: firstError.message,
        code: firstError.code,
      });

      return {
        success: false,
        error: errorMessage,
        response: NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: parsed.error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      data: parsed.data,
    };
  } catch (error: any) {
    logger.error('Failed to parse request body', error);

    return {
      success: false,
      error: 'Invalid request body',
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Query parameters 검증 헬퍼
 *
 * @example
 * ```ts
 * const result = validateQuery(request.url, paginationSchema);
 * if (!result.success) return result.response;
 *
 * const { page, limit, sortBy } = result.data;
 * ```
 */
export function validateQuery<T extends z.ZodTypeAny>(
  url: string,
  schema: T
): ValidationResult<z.infer<T>> {
  try {
    const { searchParams } = new URL(url);
    const params = Object.fromEntries(searchParams.entries());
    const parsed = schema.safeParse(params);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      const errorMessage = `${firstError.path.join('.')}: ${firstError.message}`;

      logger.warn('Query validation failed', {
        path: firstError.path,
        message: firstError.message,
      });

      return {
        success: false,
        error: errorMessage,
        response: NextResponse.json(
          {
            success: false,
            error: errorMessage,
            details: parsed.error.issues.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: true,
      data: parsed.data,
    };
  } catch (error: any) {
    logger.error('Failed to parse query parameters', error);

    return {
      success: false,
      error: 'Invalid query parameters',
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
        },
        { status: 400 }
      ),
    };
  }
}
