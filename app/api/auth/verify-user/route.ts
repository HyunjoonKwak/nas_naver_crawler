import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: "이메일과 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일과 이름으로 사용자 확인
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim(),
        name: name.trim(),
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "입력하신 정보와 일치하는 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "사용자 확인이 완료되었습니다.",
    });
  } catch (error: any) {
    console.error("Verify user error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
