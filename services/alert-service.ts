/**
 * 알림 발송 서비스
 *
 * 책임:
 * - 매물 변경사항에 대한 알림 발송
 * - Discord 웹훅, 이메일, 브라우저 알림 지원
 * - 알림 조건 필터링
 * - 알림 로그 저장
 */

import { createLogger } from '@/lib/logger';
import { complexRepository } from '@/repositories';
import {
  detectArticleChanges,
  filterChangesForAlerts,
  saveNotificationLog,
} from '@/lib/article-tracker';
import {
  sendDiscordNotification,
  createNewArticleEmbed,
  createDeletedArticleEmbed,
  createPriceChangedEmbed,
  createCrawlSummaryEmbed,
} from '@/lib/discord';
import { AlertSendResult } from './types';

const logger = createLogger('ALERT_SERVICE');

/**
 * 단지별 변경사항에 대한 알림을 발송합니다.
 *
 * @param complexNos - 단지 번호 배열
 * @returns 알림 발송 결과
 */
export async function sendAlertsForChanges(
  complexNos: string[]
): Promise<AlertSendResult> {
  logger.info('Starting alert check', {
    complexCount: complexNos.length,
  });

  let totalAlerts = 0;
  let sentAlerts = 0;
  let failedAlerts = 0;
  const errors: string[] = [];

  try {
    // 성능 최적화: 배치로 단지 정보 조회 (N+1 쿼리 방지) - repository 사용
    const complexInfos = await complexRepository.findManyByComplexNos(
      complexNos,
      true // includeArticles
    );

    const complexMap = new Map(complexInfos.map(c => [c.complexNo, c]));

    // 각 단지별로 알림 처리
    for (const complexNo of complexNos) {
      try {
        const result = await processAlertsForComplex(complexNo, complexMap);

        totalAlerts += result.totalAlerts;
        sentAlerts += result.sentAlerts;
        failedAlerts += result.failedAlerts;
        errors.push(...result.errors);
      } catch (error: any) {
        logger.error('Failed to process alerts for complex', {
          complexNo,
          error: error.message,
        });
        errors.push(`Complex ${complexNo}: ${error.message}`);
      }
    }

    logger.info('Alert check completed', {
      totalAlerts,
      sentAlerts,
      failedAlerts,
      errorCount: errors.length,
    });

    return {
      totalAlerts,
      sentAlerts,
      failedAlerts,
      errors,
    };
  } catch (error: any) {
    logger.error('Failed to send alerts', {
      error: error.message,
    });

    return {
      totalAlerts,
      sentAlerts,
      failedAlerts,
      errors: [...errors, error.message],
    };
  }
}

/**
 * 단일 단지에 대한 알림을 처리합니다.
 */
async function processAlertsForComplex(
  complexNo: string,
  complexMap: Map<string, any>
): Promise<AlertSendResult> {
  let totalAlerts = 0;
  let sentAlerts = 0;
  let failedAlerts = 0;
  const errors: string[] = [];

  // 1. 단지 정보 조회
  const complexInfo = complexMap.get(complexNo);
  if (!complexInfo) {
    logger.warn('Complex not found', { complexNo });
    return { totalAlerts, sentAlerts, failedAlerts, errors };
  }

  const currentArticles = complexInfo.articles;

  // 2. 변경사항 감지
  const changes = await detectArticleChanges(complexNo, currentArticles);

  logger.debug('Changes detected', {
    complexNo,
    complexName: complexInfo.complexName,
    newArticles: changes.newArticles.length,
    deletedArticles: changes.deletedArticles.length,
    priceChangedArticles: changes.priceChangedArticles.length,
  });

  // 변경사항이 없으면 스킵
  if (
    changes.newArticles.length === 0 &&
    changes.deletedArticles.length === 0 &&
    changes.priceChangedArticles.length === 0
  ) {
    logger.debug('No changes for complex', {
      complexNo,
      complexName: complexInfo.complexName,
    });
    return { totalAlerts, sentAlerts, failedAlerts, errors };
  }

  // 3. 알림 조건에 맞는 변경사항 필터링
  const alertTargets = await filterChangesForAlerts(complexNo, changes);

  if (alertTargets.length === 0) {
    logger.debug('No active alerts for complex', {
      complexNo,
      complexName: complexInfo.complexName,
    });
    return { totalAlerts, sentAlerts, failedAlerts, errors };
  }

  totalAlerts = alertTargets.length;
  logger.info('Sending alerts', {
    complexNo,
    complexName: complexInfo.complexName,
    alertCount: alertTargets.length,
  });

  // 4. 각 알림에 대해 발송
  for (const target of alertTargets) {
    try {
      const result = await sendAlertNotification(
        target,
        complexInfo,
        currentArticles
      );

      if (result.success) {
        sentAlerts++;
      } else {
        failedAlerts++;
        errors.push(result.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error('Failed to send alert', {
        alertName: target.alert.name,
        error: error.message,
      });

      failedAlerts++;
      errors.push(`Alert ${target.alert.name}: ${error.message}`);

      await saveNotificationLog(
        target.alertId,
        'webhook',
        'failed',
        error.message || 'Unknown error'
      );
    }
  }

  return { totalAlerts, sentAlerts, failedAlerts, errors };
}

/**
 * 개별 알림을 발송합니다.
 */
async function sendAlertNotification(
  target: any,
  complexInfo: any,
  currentArticles: any[]
): Promise<{ success: boolean; error?: string }> {
  const { alert, newArticles, deletedArticles, priceChangedArticles, alertId } =
    target;

  // 웹훅 URL 확인
  if (!alert.webhookUrl) {
    logger.warn('No webhook URL for alert', { alertName: alert.name });
    return { success: false, error: 'No webhook URL' };
  }

  try {
    const embeds: any[] = [];

    // 신규 매물 임베드
    for (const article of newArticles) {
      embeds.push(
        createNewArticleEmbed(
          article,
          complexInfo.complexName,
          complexInfo.complexNo
        )
      );
    }

    // 삭제된 매물 임베드
    for (const article of deletedArticles) {
      embeds.push(
        createDeletedArticleEmbed(
          article,
          complexInfo.complexName,
          complexInfo.complexNo
        )
      );
    }

    // 가격 변동 임베드
    for (const { old: oldArticle, new: newArticle } of priceChangedArticles) {
      embeds.push(
        createPriceChangedEmbed(
          oldArticle,
          newArticle,
          complexInfo.complexName,
          complexInfo.complexNo
        )
      );
    }

    // 요약 임베드
    embeds.push(
      createCrawlSummaryEmbed({
        complexName: complexInfo.complexName,
        complexNo: complexInfo.complexNo,
        newCount: newArticles.length,
        deletedCount: deletedArticles.length,
        priceChangedCount: priceChangedArticles.length,
        totalArticles: currentArticles.length,
        duration: 0,
      })
    );

    // Discord로 전송 (한 번에 최대 10개 embed)
    for (let i = 0; i < embeds.length; i += 10) {
      const batch = embeds.slice(i, i + 10);

      const result = await sendDiscordNotification(alert.webhookUrl, {
        username: '네이버 부동산 크롤러',
        content:
          i === 0
            ? `🔔 **${alert.name}** 알림\n${complexInfo.complexName}에 변경사항이 있습니다!`
            : undefined,
        embeds: batch,
      });

      // 알림 로그 저장
      await saveNotificationLog(
        alertId,
        'webhook',
        result.success ? 'sent' : 'failed',
        result.success
          ? `Sent ${batch.length} notifications`
          : result.error || 'Unknown error'
      );

      if (!result.success) {
        logger.error('Failed to send Discord notification', {
          alertName: alert.name,
          error: result.error,
        });
        return { success: false, error: result.error };
      }

      logger.debug('Sent Discord notification batch', {
        alertName: alert.name,
        batchSize: batch.length,
      });

      // Discord API 속도 제한 방지
      if (i + 10 < embeds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info('Alert sent successfully', {
      alertName: alert.name,
      embedCount: embeds.length,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('Failed to send alert notification', {
      alertName: alert.name,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
}
