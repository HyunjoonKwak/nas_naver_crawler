/**
 * 브라우저 Push 알림 유틸리티
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 알림을 지원하지 않습니다.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * 브라우저 알림 전송
 */
export function sendBrowserNotification(options: NotificationOptions): Notification | null {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 알림을 지원하지 않습니다.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('알림 권한이 없습니다.');
    return null;
  }

  const { title, ...notificationOptions } = options;

  const notification = new Notification(title, {
    ...notificationOptions,
    icon: notificationOptions.icon || '/icon-192x192.png',
    badge: notificationOptions.badge || '/icon-192x192.png',
  });

  // 클릭 이벤트 처리
  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();

    // 커스텀 데이터가 있으면 처리
    if (options.data?.url) {
      window.location.href = options.data.url;
    }

    notification.close();
  };

  return notification;
}

/**
 * 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 알림이 지원되는지 확인
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * 포커스 여부 확인 (포커스 중이면 알림 생략 가능)
 */
export function isDocumentFocused(): boolean {
  return document.hasFocus();
}

/**
 * 조건부 알림 전송 (포커스되지 않은 경우에만)
 */
export function sendNotificationIfUnfocused(options: NotificationOptions): Notification | null {
  if (isDocumentFocused()) {
    console.log('페이지가 포커스되어 있어 알림을 생략합니다.');
    return null;
  }

  return sendBrowserNotification(options);
}

/**
 * 알림 그룹 관리 (같은 tag의 알림 업데이트)
 */
export function sendGroupedNotification(
  options: NotificationOptions & { tag: string }
): Notification | null {
  // tag를 사용하여 이전 알림을 대체
  return sendBrowserNotification(options);
}

/**
 * 매물 알림 전송 (특화)
 */
export interface ArticleNotificationData {
  complexNo: string;
  complexName: string;
  articleCount: number;
  tradeType: string;
  price: string;
}

export function sendArticleNotification(data: ArticleNotificationData): Notification | null {
  return sendNotificationIfUnfocused({
    title: `새 매물 등록 - ${data.complexName}`,
    body: `${data.tradeType} ${data.price} | 총 ${data.articleCount}개 매물`,
    icon: '/icon-192x192.png',
    tag: `complex-${data.complexNo}`,
    data: {
      url: `/complex/${data.complexNo}`,
      type: 'new-article',
      complexNo: data.complexNo,
    },
    requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
  });
}

/**
 * 가격 변동 알림 전송
 */
export interface PriceChangeNotificationData {
  complexNo: string;
  complexName: string;
  oldPrice: string;
  newPrice: string;
  priceChange: number; // 변동률 (%)
}

export function sendPriceChangeNotification(data: PriceChangeNotificationData): Notification | null {
  const direction = data.priceChange > 0 ? '상승' : '하락';
  const emoji = data.priceChange > 0 ? '📈' : '📉';

  return sendNotificationIfUnfocused({
    title: `${emoji} 가격 ${direction} - ${data.complexName}`,
    body: `${data.oldPrice} → ${data.newPrice} (${Math.abs(data.priceChange).toFixed(1)}% ${direction})`,
    icon: '/icon-192x192.png',
    tag: `price-${data.complexNo}`,
    data: {
      url: `/complex/${data.complexNo}`,
      type: 'price-change',
      complexNo: data.complexNo,
    },
    requireInteraction: true,
  });
}

/**
 * 크롤링 완료 알림
 */
export interface CrawlCompleteNotificationData {
  totalComplexes: number;
  totalArticles: number;
  duration: number; // ms
}

export function sendCrawlCompleteNotification(data: CrawlCompleteNotificationData): Notification | null {
  const durationSeconds = Math.floor(data.duration / 1000);

  return sendBrowserNotification({
    title: '✅ 크롤링 완료',
    body: `${data.totalComplexes}개 단지, ${data.totalArticles}개 매물 수집 (${durationSeconds}초 소요)`,
    icon: '/icon-192x192.png',
    tag: 'crawl-complete',
    data: {
      url: '/system',
      type: 'crawl-complete',
    },
    silent: false,
  });
}
