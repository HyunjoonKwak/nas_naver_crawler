/**
 * Complex Repository
 *
 * 단지(Complex) 관련 데이터 접근 로직
 */

import { Complex, Prisma } from '@prisma/client';
import { BaseRepository } from './base-repository';
import { prisma } from '@/lib/prisma';

export class ComplexRepository extends BaseRepository<Complex> {
  constructor() {
    super(prisma);
  }

  getModelName() {
    return 'complex';
  }

  /**
   * 단지 번호로 조회 (매물 포함 옵션)
   */
  async findByComplexNo(complexNo: string, includeArticles = false) {
    return this.prisma.complex.findFirst({
      where: { complexNo },
      include: includeArticles ? { articles: true } : undefined,
    });
  }

  /**
   * 여러 단지 번호로 일괄 조회
   */
  async findManyByComplexNos(complexNos: string[], includeArticles = false) {
    return this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      include: includeArticles ? { articles: true } : undefined,
    });
  }

  /**
   * 단지 번호 → ID 매핑 생성
   */
  async getComplexNoToIdMap(complexNos: string[]): Promise<Map<string, string>> {
    const complexes = await this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      select: { id: true, complexNo: true },
    });

    return new Map(complexes.map((c) => [c.complexNo, c.id]));
  }

  /**
   * 단지 일괄 생성/업데이트 (upsert)
   */
  async upsertMany(complexData: Prisma.ComplexCreateInput[]) {
    const results = await Promise.all(
      complexData.map((data) =>
        this.prisma.complex.upsert({
          where: { complexNo: data.complexNo },
          update: data,
          create: data,
        })
      )
    );
    return results;
  }

  /**
   * 사용자의 즐겨찾기 단지 조회
   */
  async findFavoritesByUserId(userId: string) {
    return this.prisma.complex.findMany({
      where: {
        favorites: {
          some: { userId },
        },
      },
      include: {
        articles: true,
        favorites: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 지역 기반 검색 (법정동)
   */
  async findByRegion(beopjungdong: string) {
    return this.prisma.complex.findMany({
      where: {
        beopjungdong: {
          contains: beopjungdong,
        },
      },
      include: {
        articles: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * 기존 지오코딩 데이터 조회 (merge용)
   */
  async getExistingGeoData(complexNos: string[]) {
    return this.prisma.complex.findMany({
      where: { complexNo: { in: complexNos } },
      select: {
        complexNo: true,
        latitude: true,
        longitude: true,
        beopjungdong: true,
        roadAddress: true,
        jibunAddress: true,
      },
    });
  }

  /**
   * 단지 번호 존재 여부 체크
   */
  async existsByComplexNo(complexNo: string): Promise<boolean> {
    const count = await this.prisma.complex.count({
      where: { complexNo },
    });
    return count > 0;
  }

  /**
   * 단지 검색 (이름, 주소)
   */
  async search(keyword: string, limit = 20) {
    return this.prisma.complex.findMany({
      where: {
        OR: [
          { complexName: { contains: keyword } },
          { roadAddress: { contains: keyword } },
          { jibunAddress: { contains: keyword } },
          { beopjungdong: { contains: keyword } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}

// Singleton export
export const complexRepository = new ComplexRepository();
