/**
 * Alert Repository
 *
 * 알림(Alert) 관련 데이터 접근 로직
 */

import { Alert, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class AlertRepository extends BaseRepository<Alert> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'alert';
  }

  /**
   * 활성화된 알림 조회 (webhookUrl 있는 것만)
   */
  async findActiveWithWebhook(userId?: string) {
    const where: Prisma.AlertWhereInput = {
      isActive: true,
      webhookUrl: { not: null },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.alert.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 단지별 활성 알림 조회
   */
  async findActiveByComplexId(complexId: string) {
    return this.prisma.alert.findMany({
      where: {
        isActive: true,
        complexIds: { has: complexId },
      },
      include: { user: true },
    });
  }

  /**
   * 사용자의 모든 알림 조회
   */
  async findByUserId(userId: string, includeInactive = false) {
    const where: Prisma.AlertWhereInput = { userId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 알림 활성화/비활성화 토글
   */
  async toggleActive(alertId: string): Promise<Alert> {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    return this.prisma.alert.update({
      where: { id: alertId },
      data: { isActive: !alert.isActive },
    });
  }

  /**
   * 알림 최소/최대 가격 업데이트
   */
  async updatePriceRange(alertId: string, minPrice?: number, maxPrice?: number) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { minPrice, maxPrice },
    });
  }

  /**
   * Webhook URL 설정
   */
  async setWebhookUrl(alertId: string, webhookUrl: string | null) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { webhookUrl },
    });
  }

  /**
   * 알림 대상 단지 업데이트
   */
  async updateComplexIds(alertId: string, complexIds: string[]) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { complexIds },
    });
  }

  /**
   * 알림 통계 조회
   */
  async getStatsByUser(userId: string) {
    const [total, active, hasWebhook] = await Promise.all([
      this.prisma.alert.count({ where: { userId } }),
      this.prisma.alert.count({ where: { userId, isActive: true } }),
      this.prisma.alert.count({
        where: { userId, webhookUrl: { not: null } },
      }),
    ]);

    return { total, active, hasWebhook };
  }

  /**
   * 거래 유형별 알림 조회
   */
  async findByTradeType(tradeType: string) {
    return this.prisma.alert.findMany({
      where: {
        isActive: true,
        tradeTypes: { has: tradeType },
      },
      include: { user: true },
    });
  }
}

// Singleton export
export const alertRepository = new AlertRepository();
