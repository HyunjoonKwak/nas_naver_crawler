import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // 이름으로 사용자 찾기
    const user = await prisma.user.findFirst({
      where: {
        name: name.trim(),
      },
      select: {
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "해당 이름으로 등록된 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이메일 일부 마스킹 (예: test@example.com -> te**@example.com)
    const email = user.email;
    const [localPart, domain] = email.split("@");
    const maskedLocal =
      localPart.length > 2
        ? localPart.substring(0, 2) + "*".repeat(localPart.length - 2)
        : localPart;
    const maskedEmail = `${maskedLocal}@${domain}`;

    return NextResponse.json({
      success: true,
      email: maskedEmail,
    });
  } catch (error: any) {
    console.error("Find email error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
