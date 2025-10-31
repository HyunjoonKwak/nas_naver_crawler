/**
 * 중앙화된 Fetch API 클라이언트
 *
 * 기능:
 * - 자동 JSON 직렬화/역직렬화
 * - 일관된 에러 처리
 * - 자동 타입 추론
 * - 토스트 메시지 통합 (react-hot-toast)
 * - 로딩 상태 관리
 *
 * @example
 * ```tsx
 * import { fetchPost } from '@/lib/fetch-client';
 *
 * const result = await fetchPost('/api/alerts', {
 *   name: 'My Alert',
 *   complexIds: ['123', '456']
 * }, {
 *   showLoading: true,
 *   loadingMessage: '알림 생성 중...',
 *   showSuccess: true,
 *   successMessage: '알림이 생성되었습니다.'
 * });
 *
 * if (result.ok) {
 *   console.log('Created:', result.data);
 * }
 * ```
 */

import * as React from 'react';
import { createLogger } from './logger';
import {
  showLoading as toastShowLoading,
  showSuccess as toastShowSuccess,
  showError as toastShowError,
  dismissToast as toastDismissToast,
} from './toast';

const logger = createLogger('FETCH_CLIENT');

/**
 * 기본 토스트 함수 (lib/toast.ts에서 import)
 */
const defaultToast = {
  showLoading: toastShowLoading,
  showSuccess: toastShowSuccess,
  showError: toastShowError,
  dismissToast: toastDismissToast,
};

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Fetch 옵션 (확장)
 */
export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: any; // JSON.stringify 자동 처리를 위해 any 허용
  showLoading?: boolean; // 로딩 토스트 표시 여부
  showSuccess?: boolean; // 성공 토스트 표시 여부
  showError?: boolean; // 에러 토스트 표시 여부
  loadingMessage?: string; // 커스텀 로딩 메시지
  successMessage?: string; // 커스텀 성공 메시지
  errorMessage?: string; // 커스텀 에러 메시지
}

/**
 * Fetch 결과
 */
export interface FetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  response: Response;
}

/**
 * 토스트 함수 타입 (외부에서 주입)
 */
export interface ToastFunctions {
  showLoading: (message: string | React.ReactNode, options?: { duration?: number }) => string | number;
  showSuccess: (message: string | React.ReactNode, options?: { duration?: number }) => void;
  showError: (message: string | React.ReactNode, options?: { duration?: number }) => void;
  dismissToast: (id: string | number) => void;
}

/**
 * 전역 토스트 함수 (기본값: lib/toast.ts)
 */
let globalToast: ToastFunctions = defaultToast;

/**
 * 토스트 함수 설정 (옵션, 기본값이 있음)
 * @param toast - 토스트 함수 객체
 */
export function setToastFunctions(toast: ToastFunctions) {
  globalToast = toast;
}

/**
 * 기본 fetch wrapper
 */
async function baseFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    body,
    headers = {},
    showLoading = false,
    showSuccess = false,
    showError = true,
    loadingMessage = '요청 처리 중...',
    successMessage = '성공적으로 처리되었습니다.',
    errorMessage,
    ...restOptions
  } = options;

  let loadingToastId: string | number | null = null;

  // 로딩 토스트 표시
  if (showLoading) {
    loadingToastId = globalToast.showLoading(loadingMessage);
  }

  try {
    // body가 있으면 자동으로 JSON.stringify
    const finalOptions: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body !== undefined) {
      finalOptions.body = JSON.stringify(body);
    }

    logger.debug('Fetch request', { url, method: finalOptions.method || 'GET' });

    const response = await fetch(url, finalOptions);

    // 로딩 토스트 제거
    if (loadingToastId !== null) {
      globalToast.dismissToast(loadingToastId);
    }

    // 응답 파싱
    let data: T | undefined;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseError) {
        logger.error('Failed to parse JSON response', { error: parseError });
      }
    }

    // 성공/실패 처리
    if (response.ok) {
      logger.debug('Fetch success', { url, status: response.status });

      if (showSuccess) {
        globalToast.showSuccess(successMessage);
      }

      return {
        ok: true,
        status: response.status,
        data,
        response,
      };
    } else {
      // 에러 메시지 추출
      const errorMsg =
        errorMessage ||
        (data as any)?.error ||
        (data as any)?.message ||
        `요청 실패 (${response.status})`;

      logger.warn('Fetch failed', {
        url,
        status: response.status,
        error: errorMsg,
      });

      if (showError) {
        globalToast.showError(errorMsg);
      }

      return {
        ok: false,
        status: response.status,
        error: errorMsg,
        data,
        response,
      };
    }
  } catch (error: any) {
    // 로딩 토스트 제거
    if (loadingToastId !== null) {
      globalToast.dismissToast(loadingToastId);
    }

    const errorMsg = errorMessage || error.message || '네트워크 오류가 발생했습니다.';

    logger.error('Fetch error', { url, error });

    if (showError && globalToast) {
      globalToast.showError(errorMsg);
    }

    // 더미 Response 객체 (에러 케이스)
    const dummyResponse = new Response(null, { status: 0 });

    return {
      ok: false,
      status: 0,
      error: errorMsg,
      response: dummyResponse,
    };
  }
}

/**
 * GET 요청
 */
export async function fetchGet<T = any>(
  url: string,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<FetchResult<T>> {
  return baseFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 요청
 */
export async function fetchPost<T = any>(
  url: string,
  body?: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<FetchResult<T>> {
  return baseFetch<T>(url, { ...options, method: 'POST', body });
}

/**
 * PUT 요청
 */
export async function fetchPut<T = any>(
  url: string,
  body?: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<FetchResult<T>> {
  return baseFetch<T>(url, { ...options, method: 'PUT', body });
}

/**
 * PATCH 요청
 */
export async function fetchPatch<T = any>(
  url: string,
  body?: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<FetchResult<T>> {
  return baseFetch<T>(url, { ...options, method: 'PATCH', body });
}

/**
 * DELETE 요청
 */
export async function fetchDelete<T = any>(
  url: string,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<FetchResult<T>> {
  return baseFetch<T>(url, { ...options, method: 'DELETE' });
}

/**
 * 편의 함수: unwrap (에러 시 throw)
 */
export async function fetchUnwrap<T = any>(
  promise: Promise<FetchResult<T>>
): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    throw new Error(result.error || 'Request failed');
  }
  return result.data as T;
}

/**
 * 클래스 기반 API (선택적 사용)
 */
export class FetchClient {
  private baseUrl: string;
  private defaultOptions: FetchOptions;

  constructor(baseUrl: string = '', defaultOptions: FetchOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions;
  }

  private getUrl(path: string): string {
    return this.baseUrl + path;
  }

  async get<T = any>(
    path: string,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResult<T>> {
    return fetchGet<T>(this.getUrl(path), { ...this.defaultOptions, ...options });
  }

  async post<T = any>(
    path: string,
    body?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResult<T>> {
    return fetchPost<T>(this.getUrl(path), body, { ...this.defaultOptions, ...options });
  }

  async put<T = any>(
    path: string,
    body?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResult<T>> {
    return fetchPut<T>(this.getUrl(path), body, { ...this.defaultOptions, ...options });
  }

  async patch<T = any>(
    path: string,
    body?: any,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResult<T>> {
    return fetchPatch<T>(this.getUrl(path), body, { ...this.defaultOptions, ...options });
  }

  async delete<T = any>(
    path: string,
    options: Omit<FetchOptions, 'method' | 'body'> = {}
  ): Promise<FetchResult<T>> {
    return fetchDelete<T>(this.getUrl(path), { ...this.defaultOptions, ...options });
  }
}

/**
 * 기본 API 클라이언트 인스턴스
 */
export const apiClient = new FetchClient('/api');
