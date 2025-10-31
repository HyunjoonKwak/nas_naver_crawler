import { prisma } from "@/lib/prisma";
import { ApiResponseHelper } from "@/lib/api-response";
import { ApiError, ErrorType } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

const logger = createLogger('AUTH_VERIFY_USER');

export const POST = ApiResponseHelper.handler(async (request: Request) => {
  const { email, name } = await request.json();

  if (!email || !name) {
    throw new ApiError(ErrorType.VALIDATION, "이메일과 이름을 입력해주세요.", 400);
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
    throw new ApiError(ErrorType.NOT_FOUND, "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.", 404);
  }

  logger.info('User verified', { userId: user.id });

  return ApiResponseHelper.success({
    success: true,
  }, "사용자 확인이 완료되었습니다.");
});
