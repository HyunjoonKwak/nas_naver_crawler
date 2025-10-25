/**
 * Server-Sent Events (SSE) 기반 이벤트 브로드캐스터
 * 크롤링 상태를 모든 연결된 클라이언트에게 실시간으로 전송
 */

type EventType =
  | 'crawl-start'
  | 'crawl-progress'
  | 'crawl-complete'
  | 'crawl-failed'
  | 'schedule-start'
  | 'schedule-complete'
  | 'schedule-failed';

interface CrawlEvent {
  type: EventType;
  crawlId: string;
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

interface ClientInfo {
  controller: ReadableStreamDefaultController;
  connectedAt: number;
}

class EventBroadcaster {
  private clients: Map<ReadableStreamDefaultController, ClientInfo> = new Map();
  private readonly MAX_CONNECTION_TIME = 600000; // 10분 (밀리초)

  /**
   * 새 클라이언트 연결 추가
   */
  addClient(controller: ReadableStreamDefaultController) {
    this.clients.set(controller, {
      controller,
      connectedAt: Date.now(),
    });
    console.log(`[SSE] Client connected. Total clients: ${this.clients.size}`);

    // 오래된 연결 정리
    this.cleanupStaleConnections();
  }

  /**
   * 클라이언트 연결 제거
   */
  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
    console.log(`[SSE] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * 오래된 연결 자동 정리 (10분 이상 유지된 연결)
   */
  private cleanupStaleConnections() {
    const now = Date.now();
    const staleClients: ReadableStreamDefaultController[] = [];

    this.clients.forEach((info, controller) => {
      const connectionAge = now - info.connectedAt;
      if (connectionAge > this.MAX_CONNECTION_TIME) {
        staleClients.push(controller);
      }
    });

    staleClients.forEach((controller) => {
      const info = this.clients.get(controller)!;
      const ageSeconds = Math.round((now - info.connectedAt) / 1000);
      console.log(`[SSE] Removing stale connection (age: ${ageSeconds}s)`);
      try {
        controller.close();
      } catch (error: any) {
        // 이미 닫힌 경우 무시
      }
      this.clients.delete(controller);
    });

    if (staleClients.length > 0) {
      console.log(`[SSE] Cleaned up ${staleClients.length} stale connections. Remaining: ${this.clients.size}`);
    }
  }

  /**
   * 모든 클라이언트에게 이벤트 전송
   */
  broadcast(event: CrawlEvent) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    console.log(`[SSE] Broadcasting event: ${event.type} to ${this.clients.size} clients`);

    // 오래된 연결 정리
    this.cleanupStaleConnections();

    // 모든 연결된 클라이언트에게 전송
    this.clients.forEach((info, controller) => {
      try {
        controller.enqueue(data);
      } catch (error: any) {
        console.error('[SSE] Failed to send to client:', error);
        this.clients.delete(controller);
      }
    });
  }

  /**
   * 크롤링 시작 알림
   */
  notifyCrawlStart(crawlId: string, totalComplexes: number) {
    this.broadcast({
      type: 'crawl-start',
      crawlId,
      timestamp: new Date().toISOString(),
      data: {
        totalComplexes,
      },
    });
  }

  /**
   * 크롤링 진행 상황 알림
   */
  notifyCrawlProgress(
    crawlId: string,
    progress: number,
    currentStep: string,
    processedComplexes: number,
    totalComplexes: number
  ) {
    this.broadcast({
      type: 'crawl-progress',
      crawlId,
      timestamp: new Date().toISOString(),
      data: {
        progress,
        currentStep,
        processedComplexes,
        totalComplexes,
      },
    });
  }

  /**
   * 크롤링 완료 알림
   */
  notifyCrawlComplete(crawlId: string, articlesCount: number) {
    this.broadcast({
      type: 'crawl-complete',
      crawlId,
      timestamp: new Date().toISOString(),
      data: {
        articlesCount,
      },
    });
  }

  /**
   * 크롤링 실패 알림
   */
  notifyCrawlFailed(crawlId: string, errorMessage: string) {
    this.broadcast({
      type: 'crawl-failed',
      crawlId,
      timestamp: new Date().toISOString(),
      data: {
        errorMessage,
      },
    });
  }

  /**
   * 스케줄 크롤링 시작 알림
   */
  notifyScheduleStart(scheduleId: string, scheduleName: string, totalComplexes: number) {
    this.broadcast({
      type: 'schedule-start',
      crawlId: scheduleId, // 스케줄 ID를 crawlId로 사용
      timestamp: new Date().toISOString(),
      data: {
        scheduleId,
        scheduleName,
        totalComplexes,
      },
    });
  }

  /**
   * 스케줄 크롤링 완료 알림
   */
  notifyScheduleComplete(
    scheduleId: string,
    scheduleName: string,
    articlesCount: number,
    duration: number
  ) {
    this.broadcast({
      type: 'schedule-complete',
      crawlId: scheduleId,
      timestamp: new Date().toISOString(),
      data: {
        scheduleId,
        scheduleName,
        articlesCount,
        duration,
      },
    });
  }

  /**
   * 스케줄 크롤링 실패 알림
   */
  notifyScheduleFailed(scheduleId: string, scheduleName: string, errorMessage: string) {
    this.broadcast({
      type: 'schedule-failed',
      crawlId: scheduleId,
      timestamp: new Date().toISOString(),
      data: {
        scheduleId,
        scheduleName,
        errorMessage,
      },
    });
  }

  /**
   * 연결된 클라이언트 수 조회
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// 싱글톤 인스턴스 (global에 저장하여 HMR 시에도 유지)
declare global {
  var eventBroadcaster: EventBroadcaster | undefined;
}

export const eventBroadcaster = globalThis.eventBroadcaster ?? new EventBroadcaster();

// 개발 모드에서 HMR(Hot Module Replacement) 시 인스턴스 유지
if (process.env.NODE_ENV !== 'production') {
  globalThis.eventBroadcaster = eventBroadcaster;
}
