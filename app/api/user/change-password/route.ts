import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitPresets } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

const logger = createLogger('USER-CHANGE-PASSWORD');

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "인증되지 않은 요청입니다." },
        { status: 401 }
      );
    }

    // Rate Limiting: 10분당 5회
    const rateLimitResponse = rateLimit(request, rateLimitPresets.passwordReset);
    if (rateLimitResponse) return rateLimitResponse;

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "현재 비밀번호와 새 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "새 비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    logger.info('Password changed successfully', {
      userId: user.id,
      email: user.email
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error: any) {
    logger.error("Change password error", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
