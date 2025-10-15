/**
 * Server-Sent Events (SSE) 크롤링 이벤트 구독 훅
 * 모든 페이지에서 실시간 크롤링 알림을 받을 수 있음
 *
 * 전역 싱글톤 SSE 클라이언트를 사용하여 중복 연결 방지
 */

import { useEffect, useRef, useState } from 'react';
import { showSuccess, showError, showInfo } from '@/lib/toast';
import { sseClient } from '@/lib/sseClient';

interface CrawlEvent {
  type:
    | 'crawl-start'
    | 'crawl-progress'
    | 'crawl-complete'
    | 'crawl-failed'
    | 'schedule-start'
    | 'schedule-complete'
    | 'schedule-failed'
    | 'connected';
  crawlId?: string;
  timestamp: string;
  data?: {
    progress?: number;
    currentStep?: string;
    totalComplexes?: number;
    processedComplexes?: number;
    articlesCount?: number;
    errorMessage?: string;
    scheduleId?: string;
    scheduleName?: string;
    duration?: number;
  };
}

interface CrawlStatus {
  isActive: boolean;
  crawlId: string | null;
  progress: number;
  currentStep: string;
  startTime: number | null;
  elapsedSeconds: number;
  totalComplexes?: number;
  scheduleName?: string;
}

export function useCrawlEvents(onCrawlComplete?: () => void) {
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>({
    isActive: false,
    crawlId: null,
    progress: 0,
    currentStep: '',
    startTime: null,
    elapsedSeconds: 0,
  });

  const lastCrawlIdRef = useRef<string | null>(null);
  const onCrawlCompleteRef = useRef(onCrawlComplete);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // onCrawlComplete를 최신 상태로 유지
  useEffect(() => {
    onCrawlCompleteRef.current = onCrawlComplete;
  }, [onCrawlComplete]);

  // Elapsed time 타이머
  useEffect(() => {
    if (crawlStatus.isActive && crawlStatus.startTime) {
      // 1초마다 경과 시간 업데이트
      timerRef.current = setInterval(() => {
        setCrawlStatus(prev => {
          if (!prev.startTime) return prev;
          const elapsed = Math.floor((Date.now() - prev.startTime) / 1000);
          return { ...prev, elapsedSeconds: elapsed };
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [crawlStatus.isActive, crawlStatus.startTime]);

  useEffect(() => {
    // 이벤트 핸들러
    const handleEvent = (data: CrawlEvent) => {
      console.log('[useCrawlEvents] Event received:', data.type);

      switch (data.type) {
        case 'connected':
          console.log('[useCrawlEvents] Connection established');
          break;

        case 'crawl-start':
          if (data.crawlId) {
            setCrawlStatus({
              isActive: true,
              crawlId: data.crawlId,
              progress: 0,
              currentStep: '크롤링 시작 중...',
              startTime: Date.now(),
              elapsedSeconds: 0,
              totalComplexes: data.data?.totalComplexes,
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
            setCrawlStatus(prev => ({
              ...prev,
              isActive: true,
              crawlId: data.crawlId!,
              progress: data.data!.progress || 0,
              currentStep: data.data!.currentStep || '크롤링 중...',
            }));
          }
          break;

        case 'crawl-complete':
          if (data.crawlId) {
            // 타이머 정리
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setCrawlStatus({
              isActive: false,
              crawlId: null,
              progress: 100,
              currentStep: '완료',
              startTime: null,
              elapsedSeconds: 0,
            });

            showSuccess(`✅ 크롤링이 완료되었습니다 (${data.data?.articlesCount || 0}개 매물)`);

            // 완료 콜백 실행
            if (onCrawlCompleteRef.current) {
              setTimeout(onCrawlCompleteRef.current, 500);
            }

            lastCrawlIdRef.current = null;
          }
          break;

        case 'crawl-failed':
          if (data.crawlId) {
            // 타이머 정리
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setCrawlStatus({
              isActive: false,
              crawlId: null,
              progress: 0,
              currentStep: '실패',
              startTime: null,
              elapsedSeconds: 0,
            });

            showError(`❌ 크롤링이 실패했습니다: ${data.data?.errorMessage || '알 수 없는 오류'}`);
            lastCrawlIdRef.current = null;
          }
          break;

        case 'schedule-start':
          if (data.data?.scheduleId && data.data?.scheduleName) {
            setCrawlStatus({
              isActive: true,
              crawlId: data.data.scheduleId,
              progress: 0,
              currentStep: '스케줄 실행 중...',
              startTime: Date.now(),
              elapsedSeconds: 0,
              totalComplexes: data.data.totalComplexes,
              scheduleName: data.data.scheduleName,
            });

            showInfo(
              `📅 스케줄 "${data.data.scheduleName}" 실행 시작 (${data.data.totalComplexes}개 단지)`
            );
            lastCrawlIdRef.current = data.data.scheduleId;
          }
          break;

        case 'schedule-complete':
          if (data.data?.scheduleId && data.data?.scheduleName) {
            // 타이머 정리
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setCrawlStatus({
              isActive: false,
              crawlId: null,
              progress: 100,
              currentStep: '완료',
              startTime: null,
              elapsedSeconds: 0,
            });

            const durationSec = Math.floor((data.data.duration || 0) / 1000);
            showSuccess(
              `✅ 스케줄 "${data.data.scheduleName}" 완료 (${data.data.articlesCount || 0}개 매물, ${durationSec}초)`
            );

            // 완료 콜백 실행 (스케줄 페이지 갱신용)
            if (onCrawlCompleteRef.current) {
              setTimeout(onCrawlCompleteRef.current, 500);
            }

            lastCrawlIdRef.current = null;
          }
          break;

        case 'schedule-failed':
          if (data.data?.scheduleId && data.data?.scheduleName) {
            // 타이머 정리
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setCrawlStatus({
              isActive: false,
              crawlId: null,
              progress: 0,
              currentStep: '실패',
              startTime: null,
              elapsedSeconds: 0,
            });

            showError(
              `❌ 스케줄 "${data.data.scheduleName}" 실패: ${data.data?.errorMessage || '알 수 없는 오류'}`
            );
            lastCrawlIdRef.current = null;
          }
          break;
      }
    };

    // 싱글톤 클라이언트에 리스너 등록
    console.log('[useCrawlEvents] Registering listener');
    sseClient.addListener(handleEvent);

    // Cleanup: 리스너 제거
    return () => {
      console.log('[useCrawlEvents] Unregistering listener');
      sseClient.removeListener(handleEvent);

      // 타이머 정리
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // 빈 의존성 배열: 마운트/언마운트 시에만 실행

  return crawlStatus;
}
