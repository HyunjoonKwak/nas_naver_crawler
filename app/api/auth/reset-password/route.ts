import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitPresets } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

const logger = createLogger('AUTH-RESET-PASSWORD');

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting: 10분당 3회
    const rateLimitResponse = rateLimit(request, rateLimitPresets.passwordReset);
    if (rateLimitResponse) return rateLimitResponse;

    const { email, name, newPassword } = await request.json();

    if (!email || !name || !newPassword) {
      return NextResponse.json(
        { success: false, error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 사용자 확인
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim(),
        name: name.trim(),
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "입력하신 정보와 일치하는 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    logger.info('Password reset successful', {
      userId: user.id,
      email: user.email
    });

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 재설정되었습니다.",
    });
  } catch (error) {
    logger.error("Reset password error", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
