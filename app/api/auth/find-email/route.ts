import { prisma } from "@/lib/prisma";
import { ApiResponseHelper } from "@/lib/api-response";
import { ApiError, ErrorType } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

const logger = createLogger('AUTH_FIND_EMAIL');

export const POST = ApiResponseHelper.handler(async (request: Request) => {
  const { name } = await request.json();

  if (!name || !name.trim()) {
    throw new ApiError(ErrorType.VALIDATION, "이름을 입력해주세요.", 400);
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
    throw new ApiError(ErrorType.NOT_FOUND, "해당 이름으로 등록된 계정을 찾을 수 없습니다.", 404);
  }

  // 이메일 일부 마스킹 (예: test@example.com -> te**@example.com)
  const email = user.email;
  const [localPart, domain] = email.split("@");
  const maskedLocal =
    localPart.length > 2
      ? localPart.substring(0, 2) + "*".repeat(localPart.length - 2)
      : localPart;
  const maskedEmail = `${maskedLocal}@${domain}`;

  logger.info('Email found and masked', { name: name.trim() });

  return ApiResponseHelper.success({
    success: true,
    email: maskedEmail,
  }, '이메일을 찾았습니다.');
});
