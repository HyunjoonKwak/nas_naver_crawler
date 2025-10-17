"use client";

import { Suspense, ComponentType, lazy } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface LazyLoadProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function LazyLoad({ fallback, children }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <LoadingSpinner size="lg" text="로딩 중..." />}>
      {children}
    </Suspense>
  );
}

/**
 * 동적 컴포넌트 로딩 헬퍼
 *
 * @example
 * const HeavyChart = lazyLoadComponent(() => import('./HeavyChart'));
 *
 * <LazyLoad>
 *   <HeavyChart data={data} />
 * </LazyLoad>
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <LoadingSpinner size="lg" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * 지연 로딩 (Intersection Observer 기반)
 * 뷰포트에 들어올 때만 로드
 */
interface LazyLoadOnViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export function LazyLoadOnView({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
}: LazyLoadOnViewProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <div style={{ minHeight: '200px' }} />)}
    </div>
  );
}

// React import 추가
import * as React from 'react';
