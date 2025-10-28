import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt, decrypt, maskValue } from '@/lib/encryption';

/**
 * GET /api/env-config
 * 환경 변수 목록 조회 (관리자 전용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // 환경 변수 조회
    const configs = await prisma.envConfig.findMany({
      where: {
        ...(category && { category }),
        isActive: true,
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
    });

    // 값 마스킹 (민감 정보)
    const maskedConfigs = configs.map(config => ({
      ...config,
      value: config.isSecret ? maskValue(decrypt(config.value)) : decrypt(config.value),
      _originalValue: undefined, // 원본 값 숨김
    }));

    return NextResponse.json({
      success: true,
      data: maskedConfigs,
    });
  } catch (error: any) {
    console.error('[EnvConfig GET Error]:', error);
    return NextResponse.json(
      { success: false, error: '환경 변수 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/env-config
 * 환경 변수 생성 (관리자 전용)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, value, displayName, description, category, isSecret } = body;

    // 필수 필드 검증
    if (!key || !value || !displayName || !category) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 중복 확인
    const existing = await prisma.envConfig.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 키입니다' },
        { status: 409 }
      );
    }

    // 값 암호화
    const encryptedValue = encrypt(value);

    // 환경 변수 생성
    const config = await prisma.envConfig.create({
      data: {
        key,
        value: encryptedValue,
        displayName,
        description: description || null,
        category,
        isSecret: isSecret !== undefined ? isSecret : true,
        updatedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        value: isSecret ? maskValue(value) : value,
      },
      message: '환경 변수가 생성되었습니다',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[EnvConfig POST Error]:', error);
    return NextResponse.json(
      { success: false, error: '환경 변수 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/env-config
 * 환경 변수 수정 (관리자 전용)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, value, displayName, description, isSecret, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 기존 설정 확인
    const existing = await prisma.envConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '환경 변수를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 업데이트 데이터 준비
    const updateData: any = {
      updatedBy: session.user.id,
    };

    if (value !== undefined) {
      updateData.value = encrypt(value);
    }
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (isSecret !== undefined) updateData.isSecret = isSecret;
    if (isActive !== undefined) updateData.isActive = isActive;

    // 환경 변수 업데이트
    const config = await prisma.envConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        value: config.isSecret ? maskValue(decrypt(config.value)) : decrypt(config.value),
      },
      message: '환경 변수가 업데이트되었습니다',
    });
  } catch (error: any) {
    console.error('[EnvConfig PUT Error]:', error);
    return NextResponse.json(
      { success: false, error: '환경 변수 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/env-config
 * 환경 변수 삭제 (관리자 전용)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
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

    // 환경 변수 삭제
    await prisma.envConfig.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '환경 변수가 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('[EnvConfig DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: '환경 변수 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
