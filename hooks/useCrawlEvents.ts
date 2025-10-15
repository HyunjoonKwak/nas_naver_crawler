/**
 * Server-Sent Events (SSE) 크롤링 이벤트 구독 훅
 * 모든 페이지에서 실시간 크롤링 알림을 받을 수 있음
 */

import { useEffect, useRef, useState } from 'react';
import { showSuccess, showError, showInfo } from '@/lib/toast';

interface CrawlEvent {
  type: 'crawl-start' | 'crawl-progress' | 'crawl-complete' | 'crawl-failed' | 'connected';
  crawlId?: string;
  timestamp: string;
  data?: {
    progress?: number;
    currentStep?: string;
    totalComplexes?: number;
    processedComplexes?: number;
    articlesCount?: number;
    errorMessage?: string;
  };
}

interface CrawlStatus {
  isActive: boolean;
  crawlId: string | null;
  progress: number;
  currentStep: string;
}

export function useCrawlEvents(onCrawlComplete?: () => void) {
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>({
    isActive: false,
    crawlId: null,
    progress: 0,
    currentStep: '',
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCrawlIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      console.log('[SSE] Connecting to event stream...');

      try {
        const eventSource = new EventSource('/api/events');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data: CrawlEvent = JSON.parse(event.data);

            console.log('[SSE] Event received:', data);

            switch (data.type) {
              case 'connected':
                console.log('[SSE] Connection established');
                break;

              case 'crawl-start':
                if (data.crawlId) {
                  setCrawlStatus({
                    isActive: true,
                    crawlId: data.crawlId,
                    progress: 0,
                    currentStep: '크롤링 시작 중...',
                  });

                  // 새로운 크롤링이면 토스트 알림
                  if (lastCrawlIdRef.current !== data.crawlId) {
                    showInfo(`🚀 크롤링이 시작되었습니다 (${data.data?.totalComplexes}개 단지)`);
                    lastCrawlIdRef.current = data.crawlId;
                  }
                }
                break;

              case 'crawl-progress':
                if (data.crawlId && data.data) {
                  setCrawlStatus({
                    isActive: true,
                    crawlId: data.crawlId,
                    progress: data.data.progress || 0,
                    currentStep: data.data.currentStep || '크롤링 중...',
                  });
                }
                break;

              case 'crawl-complete':
                if (data.crawlId) {
                  setCrawlStatus({
                    isActive: false,
                    crawlId: null,
                    progress: 100,
                    currentStep: '완료',
                  });

                  showSuccess(`✅ 크롤링이 완료되었습니다 (${data.data?.articlesCount || 0}개 매물)`);

                  // 완료 콜백 실행
                  if (onCrawlComplete) {
                    setTimeout(onCrawlComplete, 500);
                  }

                  lastCrawlIdRef.current = null;
                }
                break;

              case 'crawl-failed':
                if (data.crawlId) {
                  setCrawlStatus({
                    isActive: false,
                    crawlId: null,
                    progress: 0,
                    currentStep: '실패',
                  });

                  showError(`❌ 크롤링이 실패했습니다: ${data.data?.errorMessage || '알 수 없는 오류'}`);
                  lastCrawlIdRef.current = null;
                }
                break;
            }
          } catch (error) {
            console.error('[SSE] Failed to parse event:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          eventSource.close();

          // 5초 후 재연결 시도
          if (isMounted) {
            console.log('[SSE] Reconnecting in 5 seconds...');
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                connect();
              }
            }, 5000);
          }
        };

      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
      }
    };

    // 초기 연결
    connect();

    // Cleanup
    return () => {
      isMounted = false;

      if (eventSourceRef.current) {
        console.log('[SSE] Closing connection');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [onCrawlComplete]);

  return crawlStatus;
}
