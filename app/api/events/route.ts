/**
 * Server-Sent Events (SSE) 엔드포인트
 * 클라이언트가 이 엔드포인트에 연결하면 실시간 이벤트를 수신
 */

import { NextRequest } from 'next/server';
import { eventBroadcaster } from '@/lib/eventBroadcaster';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Edge runtime 대신 Node.js runtime 사용
export const maxDuration = 300; // 5분

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  // SSE 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      const startTime = Date.now();
      console.log('[SSE] Stream started at', new Date().toISOString());

      // 클라이언트 연결 추가
      eventBroadcaster.addClient(controller);

      // 연결 확인 메시지
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)
        );
        console.log('[SSE] Sent connected message');
      } catch (error) {
        console.error('[SSE] Failed to send connected message:', error);
      }

      // 초기 heartbeat (즉시)
      try {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
        console.log('[SSE] Sent initial heartbeat');
      } catch (error) {
        console.error('[SSE] Failed to send initial heartbeat:', error);
      }

      // 연결 유지를 위한 heartbeat (5초마다)
      let heartbeatCount = 0;
      heartbeatInterval = setInterval(() => {
        try {
          heartbeatCount++;
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[SSE] Heartbeat #${heartbeatCount} sent (connection alive for ${elapsed}s)`);
        } catch (error) {
          console.error('[SSE] Heartbeat failed:', error);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          eventBroadcaster.removeClient(controller);
        }
      }, 5000);

      // 클라이언트 연결 종료 시 cleanup
      request.signal.addEventListener('abort', () => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[SSE] Stream aborted (connection lasted ${elapsed}s)`);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        eventBroadcaster.removeClient(controller);
        try {
          controller.close();
        } catch (error) {
          // 이미 닫힌 경우 무시
        }
      });
    },
    cancel() {
      console.log('[SSE] Stream cancelled');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    },
  });

  // SSE 응답 헤더
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx 버퍼링 비활성화
      'Transfer-Encoding': 'chunked', // 명시적 chunked encoding
    },
  });
}
