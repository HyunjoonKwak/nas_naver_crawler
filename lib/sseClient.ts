/**
 * SSE 클라이언트 싱글톤
 * 전역에서 단일 EventSource 인스턴스만 유지
 */

type EventCallback = (event: any) => void;

class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<EventCallback> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  connect() {
    // 이미 연결 중이거나 연결되어 있으면 스킵
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED)) {
      console.log('[SSE Client] Already connected or connecting, skipping');
      return;
    }

    this.isConnecting = true;
    console.log('[SSE Client] Creating new EventSource connection');

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        console.log('[SSE Client] Connection opened');
        this.isConnecting = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE Client] Broadcasting event to', this.listeners.size, 'listeners');

          // 모든 리스너에게 이벤트 전달
          this.listeners.forEach((callback) => {
            try {
              callback(data);
            } catch (error: any) {
              console.error('[SSE Client] Listener callback error:', error);
            }
          });
        } catch (error: any) {
          console.error('[SSE Client] Failed to parse event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('[SSE Client] Connection error:', error);
        this.isConnecting = false;

        // CLOSED 상태일 때만 재연결
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('[SSE Client] Connection closed, reconnecting in 3 seconds...');
          this.eventSource = null;

          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 3000);
        } else {
          console.log(`[SSE Client] Connection error (state: ${this.eventSource?.readyState}), waiting for auto-reconnect...`);
        }
      };
    } catch (error: any) {
      console.error('[SSE Client] Failed to create EventSource:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    console.log('[SSE Client] Disconnecting');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnecting = false;
  }

  addListener(callback: EventCallback) {
    console.log('[SSE Client] Adding listener, total:', this.listeners.size + 1);
    this.listeners.add(callback);

    // 첫 리스너가 추가될 때 연결
    if (this.listeners.size === 1) {
      this.connect();
    }
  }

  removeListener(callback: EventCallback) {
    this.listeners.delete(callback);
    console.log('[SSE Client] Removed listener, remaining:', this.listeners.size);

    // 모든 리스너가 제거되면 연결 종료
    if (this.listeners.size === 0) {
      console.log('[SSE Client] No more listeners, disconnecting');
      this.disconnect();
    }
  }

  getConnectionState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

// 전역 싱글톤 인스턴스
export const sseClient = new SSEClient();
