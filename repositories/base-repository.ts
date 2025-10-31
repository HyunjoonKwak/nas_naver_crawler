/**
 * Base Repository
 *
 * 모든 repository가 상속받을 기본 CRUD 메서드 제공
 */

import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}

  /**
   * Prisma model 이름 반환 (하위 클래스에서 구현)
   */
  abstract getModelName(): string;

  /**
   * ID로 단일 레코드 조회
   */
  async findById(id: string): Promise<T | null> {
    const model = this.getModel();
    return model.findUnique({ where: { id } }) as Promise<T | null>;
  }

  /**
   * 조건에 맞는 여러 레코드 조회
   */
  async findMany(where?: any, options?: any): Promise<T[]> {
    const model = this.getModel();
    return model.findMany({ where, ...options }) as Promise<T[]>;
  }

  /**
   * 단일 레코드 조회
   */
  async findFirst(where: any, options?: any): Promise<T | null> {
    const model = this.getModel();
    return model.findFirst({ where, ...options }) as Promise<T | null>;
  }

  /**
   * 레코드 생성
   */
  async create(data: any): Promise<T> {
    const model = this.getModel();
    return model.create({ data }) as Promise<T>;
  }

  /**
   * 레코드 업데이트
   */
  async update(id: string, data: any): Promise<T> {
    const model = this.getModel();
    return model.update({ where: { id }, data }) as Promise<T>;
  }

  /**
   * 레코드 삭제
   */
  async delete(id: string): Promise<T> {
    const model = this.getModel();
    return model.delete({ where: { id } }) as Promise<T>;
  }

  /**
   * 레코드 개수 조회
   */
  async count(where?: any): Promise<number> {
    const model = this.getModel();
    return model.count({ where }) as Promise<number>;
  }

  /**
   * Prisma model 인스턴스 반환
   */
  protected getModel(): any {
    return (this.prisma as any)[this.getModelName()];
  }
}
