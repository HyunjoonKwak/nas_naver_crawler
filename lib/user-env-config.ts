/**
 * 사용자 환경 변수 헬퍼 함수
 *
 * 사용자별 환경 변수를 조회하고 관리하는 유틸리티
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * 사용자의 환경 변수 값 조회
 *
 * @param userId - 사용자 ID
 * @param key - 환경 변수 키
 * @returns 복호화된 값 또는 null
 */
export async function getUserEnvConfig(
  userId: string,
  key: string
): Promise<string | null> {
  try {
    const config = await prisma.userEnvConfig.findFirst({
      where: {
        userId,
        key,
      },
    });

    if (!config) {
      return null;
    }

    // 암호화된 값 복호화
    return decrypt(config.value);
  } catch (error) {
    console.error(`[getUserEnvConfig] Failed to get ${key} for user ${userId}:`, error);
    return null;
  }
}

/**
 * 사용자의 여러 환경 변수 값 한 번에 조회
 *
 * @param userId - 사용자 ID
 * @param keys - 환경 변수 키 배열
 * @returns 키-값 맵
 */
export async function getUserEnvConfigs(
  userId: string,
  keys: string[]
): Promise<Record<string, string | null>> {
  try {
    const configs = await prisma.userEnvConfig.findMany({
      where: {
        userId,
        key: {
          in: keys,
        },
      },
    });

    const result: Record<string, string | null> = {};

    // 요청한 모든 키에 대해 초기화
    keys.forEach(key => {
      result[key] = null;
    });

    // 실제 값으로 채우기
    configs.forEach(config => {
      result[config.key] = decrypt(config.value);
    });

    return result;
  } catch (error) {
    console.error(`[getUserEnvConfigs] Failed to get configs for user ${userId}:`, error);

    // 에러 발생 시 모든 값을 null로 반환
    const result: Record<string, string | null> = {};
    keys.forEach(key => {
      result[key] = null;
    });
    return result;
  }
}

/**
 * 사용자의 환경 변수 설정 또는 업데이트
 *
 * @param userId - 사용자 ID
 * @param key - 환경 변수 키
 * @param value - 설정할 값 (암호화됨)
 * @param metadata - 추가 메타데이터
 */
export async function setUserEnvConfig(
  userId: string,
  key: string,
  value: string,
  metadata?: {
    displayName?: string;
    description?: string;
    category?: string;
    isSecret?: boolean;
    inputGuide?: string;
    placeholder?: string;
    validation?: string;
    helpUrl?: string;
  }
): Promise<void> {
  try {
    const encryptedValue = encrypt(value);

    await prisma.userEnvConfig.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      update: {
        value: encryptedValue,
        ...metadata,
        updatedAt: new Date(),
      },
      create: {
        userId,
        key,
        value: encryptedValue,
        displayName: metadata?.displayName || key,
        description: metadata?.description,
        category: metadata?.category || 'other',
        isSecret: metadata?.isSecret ?? true,
        inputGuide: metadata?.inputGuide,
        placeholder: metadata?.placeholder,
        validation: metadata?.validation,
        helpUrl: metadata?.helpUrl,
      },
    });
  } catch (error) {
    console.error(`[setUserEnvConfig] Failed to set ${key} for user ${userId}:`, error);
    throw new Error(`환경 변수 저장 실패: ${key}`);
  }
}

/**
 * 사용자의 환경 변수 삭제
 *
 * @param userId - 사용자 ID
 * @param key - 환경 변수 키
 */
export async function deleteUserEnvConfig(
  userId: string,
  key: string
): Promise<void> {
  try {
    await prisma.userEnvConfig.deleteMany({
      where: {
        userId,
        key,
      },
    });
  } catch (error) {
    console.error(`[deleteUserEnvConfig] Failed to delete ${key} for user ${userId}:`, error);
    throw new Error(`환경 변수 삭제 실패: ${key}`);
  }
}

/**
 * Fallback: 사용자 환경 변수가 없으면 시스템 환경 변수 사용
 *
 * @param userId - 사용자 ID
 * @param key - 환경 변수 키
 * @param systemEnvKey - 시스템 환경 변수 키 (process.env)
 * @returns 사용자 설정 또는 시스템 기본값
 */
export async function getUserEnvConfigWithFallback(
  userId: string,
  key: string,
  systemEnvKey?: string
): Promise<string | null> {
  // 1. 사용자 설정 확인
  const userValue = await getUserEnvConfig(userId, key);
  if (userValue) {
    return userValue;
  }

  // 2. 시스템 환경 변수 fallback
  if (systemEnvKey) {
    return process.env[systemEnvKey] || null;
  }

  return null;
}

/**
 * 사용자의 모든 환경 변수 조회 (카테고리별)
 *
 * @param userId - 사용자 ID
 * @param category - 카테고리 (선택)
 * @returns 환경 변수 목록 (복호화된 값 포함)
 */
export async function getAllUserEnvConfigs(
  userId: string,
  category?: string
) {
  try {
    const configs = await prisma.userEnvConfig.findMany({
      where: {
        userId,
        ...(category && { category }),
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
    });

    return configs.map(config => ({
      ...config,
      value: decrypt(config.value),
    }));
  } catch (error) {
    console.error(`[getAllUserEnvConfigs] Failed to get all configs for user ${userId}:`, error);
    return [];
  }
}
