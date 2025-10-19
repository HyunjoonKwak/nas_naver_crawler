'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * React Query Provider
 * - 클라이언트 사이드 캐싱 및 데이터 동기화
 * - 자동 리프레시, 낙관적 업데이트 지원
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 캐시 정책
            staleTime: 30 * 1000, // 30초 동안은 fresh로 간주
            gcTime: 5 * 60 * 1000, // 5분 동안 가비지 컬렉션 방지 (구 cacheTime)

            // 리프레시 정책
            refetchOnWindowFocus: false, // 윈도우 포커스 시 리프레시 비활성화
            refetchOnReconnect: true, // 재연결 시 리프레시
            retry: 1, // 실패 시 1회 재시도

            // 기본 에러 처리
            useErrorBoundary: false,
          },
          mutations: {
            // 변경 작업 정책
            retry: 0, // 변경 작업은 재시도 안 함
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
