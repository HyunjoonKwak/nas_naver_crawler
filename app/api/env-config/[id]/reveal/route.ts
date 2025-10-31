import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

/**
 * GET /api/env-config/[id]/reveal
 * 환경 변수의 실제 값 조회 (관리자 전용, 비밀번호 재확인 필요)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 환경 변수 조회
    const config = await prisma.systemEnvConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { success: false, error: '환경 변수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 값 복호화
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
    console.error('[EnvConfig Reveal Error]:', error);
    return NextResponse.json(
      { success: false, error: '값 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
