/**
 * 사용자 환경 변수 실제 값 조회 API
 *
 * GET: 마스킹되지 않은 실제 값 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/user-env-config/[id]/reveal
 * 환경 변수의 실제 값 조회 (마스킹 해제)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { id } = params;

    const config = await prisma.userEnvConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: '환경 변수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 소유권 확인
    if (config.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    const decryptedValue = decrypt(config.value);

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        key: config.key,
        value: decryptedValue,
        displayName: config.displayName,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/user-env-config/[id]/reveal] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '값 조회 실패',
      },
      { status: 500 }
    );
  }
}
