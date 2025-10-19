import { useState, useEffect, useRef } from 'react';

/**
 * 쓰로틀 훅
 *
 * @param value - 쓰로틀할 값
 * @param delay - 지연 시간 (ms)
 * @returns 쓰로틀된 값
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= delay) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, delay - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
}

/**
 * 쓰로틀 콜백 훅
 *
 * @param callback - 쓰로틀할 콜백 함수
 * @param delay - 지연 시간 (ms)
 * @returns 쓰로틀된 콜백 함수
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRan = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useRef((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;

    if (timeSinceLastRun >= delay) {
      lastRan.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastRan.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastRun);
    }
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback.current as T;
}
