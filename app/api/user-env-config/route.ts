/**
 * 사용자 환경 변수 CRUD API
 *
 * GET: 사용자의 환경 변수 목록 조회
 * POST: 새 환경 변수 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskValue } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user-env-config
 * 사용자의 환경 변수 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const configs = await prisma.userEnvConfig.findMany({
      where: {
        userId: session.user.id,
        ...(category && { category }),
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
    });

    // 민감한 정보는 마스킹
    const maskedConfigs = configs.map(config => ({
      ...config,
      value: config.isSecret ? maskValue(decrypt(config.value)) : decrypt(config.value),
    }));

    return NextResponse.json({
      success: true,
      data: maskedConfigs,
    });
  } catch (error: any) {
    console.error('[GET /api/user-env-config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '환경 변수 조회 실패',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-env-config
 * 새 환경 변수 생성
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      key,
      value,
      displayName,
      description,
      category,
      isSecret,
      inputGuide,
      placeholder,
      validation,
      helpUrl,
    } = body;

    // 필수 필드 검증
    if (!key || !value || !displayName) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요' },
        { status: 400 }
      );
    }

    // 이미 존재하는지 확인
    const existing = await prisma.userEnvConfig.findUnique({
      where: {
        userId_key: {
          userId: session.user.id,
          key,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 환경 변수입니다' },
        { status: 409 }
      );
    }

    // 암호화하여 저장
    const encryptedValue = encrypt(value);

    const config = await prisma.userEnvConfig.create({
      data: {
        userId: session.user.id,
        key,
        value: encryptedValue,
        displayName,
        description,
        category: category || 'other',
        isSecret: isSecret ?? true,
        inputGuide,
        placeholder,
        validation,
        helpUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        value: isSecret ? maskValue(value) : value,
      },
      message: '환경 변수가 생성되었습니다',
    });
  } catch (error: any) {
    console.error('[POST /api/user-env-config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '환경 변수 생성 실패',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-env-config
 * 환경 변수 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, value, displayName, description, isSecret } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 소유권 확인
    const existing = await prisma.userEnvConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '환경 변수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (isSecret !== undefined) updateData.isSecret = isSecret;
    if (value !== undefined) {
      updateData.value = encrypt(value);
    }

    const updated = await prisma.userEnvConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        value: updated.isSecret ? maskValue(decrypt(updated.value)) : decrypt(updated.value),
      },
      message: '환경 변수가 업데이트되었습니다',
    });
  } catch (error: any) {
    console.error('[PUT /api/user-env-config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '환경 변수 업데이트 실패',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-env-config
 * 환경 변수 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 소유권 확인
    const existing = await prisma.userEnvConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '환경 변수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    await prisma.userEnvConfig.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '환경 변수가 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('[DELETE /api/user-env-config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '환경 변수 삭제 실패',
      },
      { status: 500 }
    );
  }
}
