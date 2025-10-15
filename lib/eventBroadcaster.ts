/**
 * Server-Sent Events (SSE) 기반 이벤트 브로드캐스터
 * 크롤링 상태를 모든 연결된 클라이언트에게 실시간으로 전송
 */

type EventType = 'crawl-start' | 'crawl-progress' | 'crawl-complete' | 'crawl-failed';

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
  };
}

class EventBroadcaster {
  private clients: Set<ReadableStreamDefaultController> = new Set();

  /**
   * 새 클라이언트 연결 추가
   */
  addClient(controller: ReadableStreamDefaultController) {
    this.clients.add(controller);
    console.log(`[SSE] Client connected. Total clients: ${this.clients.size}`);
  }

  /**
   * 클라이언트 연결 제거
   */
  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
    console.log(`[SSE] Client disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * 모든 클라이언트에게 이벤트 전송
   */
  broadcast(event: CrawlEvent) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    console.log(`[SSE] Broadcasting event: ${event.type} to ${this.clients.size} clients`);

    // 모든 연결된 클라이언트에게 전송
    this.clients.forEach((controller) => {
      try {
        controller.enqueue(data);
      } catch (error) {
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
   * 연결된 클라이언트 수 조회
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// 싱글톤 인스턴스
export const eventBroadcaster = new EventBroadcaster();
