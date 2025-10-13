/**
 * Discord Webhook 알림 유틸리티
 * 신규 매물, 삭제된 매물, 가격 변동 등을 Discord로 전송
 */

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: {
    text: string;
  };
  timestamp?: string;
  url?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Discord 색상 코드
 */
export const DiscordColors = {
  SUCCESS: 0x00ff00, // 녹색 - 신규 매물
  DANGER: 0xff0000, // 빨강 - 삭제된 매물
  WARNING: 0xffa500, // 주황 - 가격 변동
  INFO: 0x0099ff, // 파랑 - 정보
  PURPLE: 0x9b59b6, // 보라 - 크롤링 완료
};

/**
 * Discord 웹훅으로 메시지 전송
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send Discord notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 가격 포맷팅 (만원 단위)
 */
export function formatPrice(price: number | string): string {
  if (!price) return '-';
  const priceNum = typeof price === 'string' ? parseInt(price) : price;

  const uk = Math.floor(priceNum / 10000);
  const man = priceNum % 10000;

  if (uk === 0) return `${man}만`;
  if (man === 0) return `${uk}억`;
  return `${uk}억 ${man}만`;
}

/**
 * 면적 포맷팅 (㎡ → 평)
 */
export function formatArea(area: number): string {
  if (!area) return '-';
  const pyeong = (area / 3.3058).toFixed(1);
  return `${area}㎡ (${pyeong}평)`;
}

/**
 * 신규 매물 알림 생성
 */
export function createNewArticleEmbed(
  article: any,
  complexName: string,
  complexNo: string
): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    {
      name: '🏘️ 단지',
      value: complexName,
      inline: true,
    },
    {
      name: '📊 거래유형',
      value: article.tradeTypeName || '-',
      inline: true,
    },
    {
      name: '💰 가격',
      value:
        article.tradeTypeName === '월세'
          ? `보증 ${formatPrice(article.dealOrWarrantPrc)}\n월 ${formatPrice(article.rentPrc)}`
          : formatPrice(article.dealOrWarrantPrc),
      inline: true,
    },
    {
      name: '📐 면적',
      value: formatArea(article.area1),
      inline: true,
    },
    {
      name: '🏢 동/호',
      value: article.buildingName || '-',
      inline: true,
    },
    {
      name: '📍 층',
      value: article.floorInfo || '-',
      inline: true,
    },
  ];

  if (article.direction) {
    fields.push({
      name: '🧭 방향',
      value: article.direction,
      inline: true,
    });
  }

  if (article.realtorName) {
    fields.push({
      name: '🏢 중개소',
      value: article.realtorName,
      inline: true,
    });
  }

  if (article.articleFeatureDesc) {
    fields.push({
      name: '📝 특징',
      value: article.articleFeatureDesc.length > 100
        ? article.articleFeatureDesc.substring(0, 100) + '...'
        : article.articleFeatureDesc,
      inline: false,
    });
  }

  return {
    title: '🆕 신규 매물 발견!',
    color: DiscordColors.SUCCESS,
    fields,
    footer: {
      text: `매물번호: ${article.articleNo}`,
    },
    timestamp: new Date().toISOString(),
    url: `https://new.land.naver.com/complexes/${complexNo}`,
  };
}

/**
 * 삭제된 매물 알림 생성
 */
export function createDeletedArticleEmbed(
  article: any,
  complexName: string,
  complexNo: string
): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    {
      name: '🏘️ 단지',
      value: complexName,
      inline: true,
    },
    {
      name: '📊 거래유형',
      value: article.tradeTypeName || '-',
      inline: true,
    },
    {
      name: '💰 가격',
      value:
        article.tradeTypeName === '월세'
          ? `보증 ${formatPrice(article.dealOrWarrantPrc)}\n월 ${formatPrice(article.rentPrc)}`
          : formatPrice(article.dealOrWarrantPrc),
      inline: true,
    },
    {
      name: '📐 면적',
      value: formatArea(article.area1),
      inline: true,
    },
    {
      name: '🏢 동/호',
      value: article.buildingName || '-',
      inline: true,
    },
    {
      name: '📍 층',
      value: article.floorInfo || '-',
      inline: true,
    },
  ];

  return {
    title: '🗑️ 매물 삭제됨 (거래 완료 가능성)',
    color: DiscordColors.DANGER,
    fields,
    footer: {
      text: `매물번호: ${article.articleNo}`,
    },
    timestamp: new Date().toISOString(),
    url: `https://new.land.naver.com/complexes/${complexNo}`,
  };
}

/**
 * 가격 변동 알림 생성
 */
export function createPriceChangedEmbed(
  oldArticle: any,
  newArticle: any,
  complexName: string,
  complexNo: string
): DiscordEmbed {
  const oldPrice = parseInt(oldArticle.dealOrWarrantPrc);
  const newPrice = parseInt(newArticle.dealOrWarrantPrc);
  const diff = newPrice - oldPrice;
  const diffPercent = ((diff / oldPrice) * 100).toFixed(2);

  const priceChange =
    diff > 0
      ? `⬆️ ${formatPrice(Math.abs(diff))} 상승 (+${diffPercent}%)`
      : `⬇️ ${formatPrice(Math.abs(diff))} 하락 (${diffPercent}%)`;

  const fields: DiscordEmbedField[] = [
    {
      name: '🏘️ 단지',
      value: complexName,
      inline: true,
    },
    {
      name: '📊 거래유형',
      value: newArticle.tradeTypeName || '-',
      inline: true,
    },
    {
      name: '💰 이전 가격',
      value: formatPrice(oldPrice),
      inline: true,
    },
    {
      name: '💰 현재 가격',
      value: formatPrice(newPrice),
      inline: true,
    },
    {
      name: '📈 변동',
      value: priceChange,
      inline: true,
    },
    {
      name: '📐 면적',
      value: formatArea(newArticle.area1),
      inline: true,
    },
    {
      name: '🏢 동/호',
      value: newArticle.buildingName || '-',
      inline: true,
    },
    {
      name: '📍 층',
      value: newArticle.floorInfo || '-',
      inline: true,
    },
  ];

  return {
    title: '💹 가격 변동 감지!',
    color: diff < 0 ? DiscordColors.SUCCESS : DiscordColors.WARNING,
    fields,
    footer: {
      text: `매물번호: ${newArticle.articleNo}`,
    },
    timestamp: new Date().toISOString(),
    url: `https://new.land.naver.com/complexes/${complexNo}`,
  };
}

/**
 * 크롤링 완료 요약 알림 생성
 */
export function createCrawlSummaryEmbed(summary: {
  complexName: string;
  complexNo: string;
  newCount: number;
  deletedCount: number;
  priceChangedCount: number;
  totalArticles: number;
  duration: number;
}): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    {
      name: '🏘️ 단지',
      value: summary.complexName,
      inline: false,
    },
    {
      name: '🆕 신규 매물',
      value: `${summary.newCount}건`,
      inline: true,
    },
    {
      name: '🗑️ 삭제된 매물',
      value: `${summary.deletedCount}건`,
      inline: true,
    },
    {
      name: '💹 가격 변동',
      value: `${summary.priceChangedCount}건`,
      inline: true,
    },
    {
      name: '📊 전체 매물',
      value: `${summary.totalArticles}건`,
      inline: true,
    },
    {
      name: '⏱️ 소요 시간',
      value: `${(summary.duration / 1000).toFixed(1)}초`,
      inline: true,
    },
  ];

  const hasChanges = summary.newCount > 0 || summary.deletedCount > 0 || summary.priceChangedCount > 0;

  return {
    title: hasChanges ? '✅ 크롤링 완료 - 변경사항 있음' : '✅ 크롤링 완료 - 변경사항 없음',
    color: hasChanges ? DiscordColors.PURPLE : DiscordColors.INFO,
    fields,
    footer: {
      text: `단지번호: ${summary.complexNo}`,
    },
    timestamp: new Date().toISOString(),
    url: `https://new.land.naver.com/complexes/${summary.complexNo}`,
  };
}

/**
 * 여러 알림을 배치로 전송 (Discord 속도 제한 고려)
 */
export async function sendBatchNotifications(
  webhookUrl: string,
  embeds: DiscordEmbed[],
  delayMs: number = 1000
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Discord는 한 번에 최대 10개의 embed를 지원
  for (let i = 0; i < embeds.length; i += 10) {
    const batch = embeds.slice(i, i + 10);

    const result = await sendDiscordNotification(webhookUrl, {
      username: '네이버 부동산 크롤러',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/1584/1584808.png',
      embeds: batch,
    });

    if (result.success) {
      success += batch.length;
    } else {
      failed += batch.length;
      console.error('Batch notification failed:', result.error);
    }

    // 속도 제한 방지를 위한 딜레이
    if (i + 10 < embeds.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { success, failed };
}
