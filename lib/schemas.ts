/**
 * Zod 스키마 정의
 * API 입력 검증을 위한 공통 스키마
 */

import { z } from 'zod';

// ============================================
// 인증 관련 스키마
// ============================================

export const registerSchema = z.object({
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다.')
    .min(5, '이메일은 최소 5자 이상이어야 합니다.')
    .max(100, '이메일은 최대 100자까지 입력 가능합니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다.')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/,
      '비밀번호는 영문, 숫자, 특수문자(@$!%*#?&)를 포함해야 합니다.'
    ),
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다.')
    .max(50, '이름은 최대 50자까지 입력 가능합니다.'),
});

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  newPassword: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다.'),
});

// ============================================
// 게시글 관련 스키마
// ============================================

export const postCategoryEnum = z.enum(['FREE', 'QNA', 'NOTICE']);

export const createPostSchema = z.object({
  title: z
    .string()
    .min(2, '제목은 최소 2자 이상이어야 합니다.')
    .max(200, '제목은 최대 200자까지 입력 가능합니다.')
    .trim(),
  content: z
    .string()
    .min(10, '내용은 최소 10자 이상이어야 합니다.')
    .max(50000, '내용은 최대 50,000자까지 입력 가능합니다.')
    .trim(),
  category: postCategoryEnum,
  images: z
    .array(
      z.object({
        url: z.string().url('올바른 이미지 URL이 아닙니다.'),
        filename: z.string(),
        size: z.number().max(10 * 1024 * 1024, '이미지 크기는 10MB 이하여야 합니다.'),
      })
    )
    .max(10, '최대 10개의 이미지까지 업로드 가능합니다.')
    .optional(),
});

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(2, '제목은 최소 2자 이상이어야 합니다.')
    .max(200, '제목은 최대 200자까지 입력 가능합니다.')
    .trim()
    .optional(),
  content: z
    .string()
    .min(10, '내용은 최소 10자 이상이어야 합니다.')
    .max(50000, '내용은 최대 50,000자까지 입력 가능합니다.')
    .trim()
    .optional(),
  isPinned: z.boolean().optional(),
});

// ============================================
// 댓글 관련 스키마
// ============================================

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요.')
    .max(5000, '댓글은 최대 5,000자까지 입력 가능합니다.')
    .trim(),
  parentId: z.string().cuid().optional(), // 대댓글의 경우 부모 댓글 ID
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, '댓글 내용을 입력해주세요.')
    .max(5000, '댓글은 최대 5,000자까지 입력 가능합니다.')
    .trim(),
});

// ============================================
// 신고 관련 스키마
// ============================================

export const reportReasonEnum = z.enum([
  'SPAM',
  'ABUSE',
  'INAPPROPRIATE',
  'COPYRIGHT',
  'FRAUD',
  'ETC',
]);

export const createReportSchema = z.object({
  reason: reportReasonEnum,
  description: z
    .string()
    .max(1000, '신고 사유는 최대 1,000자까지 입력 가능합니다.')
    .optional(),
});

// ============================================
// 크롤링 관련 스키마
// ============================================

export const crawlRequestSchema = z.object({
  complexNos: z
    .array(z.string().regex(/^\d+$/, '단지 번호는 숫자여야 합니다.'))
    .min(1, '최소 1개의 단지를 선택해주세요.')
    .max(50, '한 번에 최대 50개의 단지까지 크롤링 가능합니다.'),
});

// ============================================
// 알림(Alert) 관련 스키마
// ============================================

export const createAlertSchema = z.object({
  name: z
    .string()
    .min(2, '알림 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '알림 이름은 최대 100자까지 입력 가능합니다.')
    .trim(),
  complexIds: z
    .array(z.string())
    .min(1, '최소 1개의 단지를 선택해주세요.')
    .max(100, '최대 100개의 단지까지 선택 가능합니다.'),
  tradeTypes: z
    .array(z.enum(['A1', 'B1', 'B2', 'B3']))
    .optional()
    .default([]),
  minPrice: z.number().int().nonnegative().optional().nullable(),
  maxPrice: z.number().int().nonnegative().optional().nullable(),
  minArea: z.number().nonnegative().optional().nullable(),
  maxArea: z.number().nonnegative().optional().nullable(),
  notifyEmail: z.boolean().optional().default(false),
  notifyBrowser: z.boolean().optional().default(true),
  notifyWebhook: z.boolean().optional().default(false),
  webhookUrl: z
    .string()
    .url('올바른 웹훅 URL 형식이 아닙니다.')
    .optional()
    .nullable(),
}).refine(
  (data) => !data.notifyWebhook || data.webhookUrl,
  {
    message: '웹훅 알림을 사용하려면 웹훅 URL이 필요합니다.',
    path: ['webhookUrl'],
  }
).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  {
    message: '최소 가격은 최대 가격보다 작거나 같아야 합니다.',
    path: ['maxPrice'],
  }
).refine(
  (data) => !data.minArea || !data.maxArea || data.minArea <= data.maxArea,
  {
    message: '최소 면적은 최대 면적보다 작거나 같아야 합니다.',
    path: ['maxArea'],
  }
);

export const updateAlertSchema = z.object({
  name: z
    .string()
    .min(2, '알림 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '알림 이름은 최대 100자까지 입력 가능합니다.')
    .trim()
    .optional(),
  complexIds: z
    .array(z.string())
    .min(1, '최소 1개의 단지를 선택해주세요.')
    .max(100, '최대 100개의 단지까지 선택 가능합니다.')
    .optional(),
  tradeTypes: z
    .array(z.enum(['A1', 'B1', 'B2', 'B3']))
    .optional(),
  minPrice: z.number().int().nonnegative().optional().nullable(),
  maxPrice: z.number().int().nonnegative().optional().nullable(),
  minArea: z.number().nonnegative().optional().nullable(),
  maxArea: z.number().nonnegative().optional().nullable(),
  notifyEmail: z.boolean().optional(),
  notifyBrowser: z.boolean().optional(),
  notifyWebhook: z.boolean().optional(),
  webhookUrl: z
    .string()
    .url('올바른 웹훅 URL 형식이 아닙니다.')
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => !data.notifyWebhook || data.webhookUrl,
  {
    message: '웹훅 알림을 사용하려면 웹훅 URL이 필요합니다.',
    path: ['webhookUrl'],
  }
).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  {
    message: '최소 가격은 최대 가격보다 작거나 같아야 합니다.',
    path: ['maxPrice'],
  }
).refine(
  (data) => !data.minArea || !data.maxArea || data.minArea <= data.maxArea,
  {
    message: '최소 면적은 최대 면적보다 작거나 같아야 합니다.',
    path: ['maxArea'],
  }
);

// ============================================
// 스케줄(Schedule) 관련 스키마
// ============================================

export const createScheduleSchema = z.object({
  name: z
    .string()
    .min(2, '스케줄 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '스케줄 이름은 최대 100자까지 입력 가능합니다.')
    .trim(),
  cronExpr: z
    .string()
    .min(9, '올바른 Cron 표현식이 아닙니다.')
    .max(100, 'Cron 표현식이 너무 깁니다.'),
  complexNos: z
    .array(z.string().regex(/^\d+$/, '단지 번호는 숫자여야 합니다.'))
    .optional()
    .default([]),
  useBookmarkedComplexes: z.boolean().optional().default(true),
}).refine(
  (data) => data.useBookmarkedComplexes || data.complexNos.length > 0,
  {
    message: '고정 모드를 사용할 때는 최소 1개의 단지를 선택해주세요.',
    path: ['complexNos'],
  }
);

export const updateScheduleSchema = z.object({
  name: z
    .string()
    .min(2, '스케줄 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '스케줄 이름은 최대 100자까지 입력 가능합니다.')
    .trim()
    .optional(),
  cronExpr: z
    .string()
    .min(9, '올바른 Cron 표현식이 아닙니다.')
    .max(100, 'Cron 표현식이 너무 깁니다.')
    .optional(),
  complexNos: z
    .array(z.string().regex(/^\d+$/, '단지 번호는 숫자여야 합니다.'))
    .optional(),
  useBookmarkedComplexes: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    // 업데이트 시에는 useBookmarkedComplexes가 false로 변경되면서 complexNos가 비어있으면 안됨
    if (data.useBookmarkedComplexes === false && data.complexNos && data.complexNos.length === 0) {
      return false;
    }
    return true;
  },
  {
    message: '고정 모드를 사용할 때는 최소 1개의 단지를 선택해주세요.',
    path: ['complexNos'],
  }
);

// ============================================
// 즐겨찾기(Favorite) 관련 스키마
// ============================================

export const createFavoriteSchema = z.object({
  complexNo: z.string().regex(/^\d+$/, '단지 번호는 숫자여야 합니다.'),
  complexName: z.string().min(1, '단지 이름이 필요합니다.').optional(),
});

export const reorderFavoritesSchema = z.object({
  favorites: z
    .array(
      z.object({
        complexNo: z.string(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(1, '최소 1개의 즐겨찾기가 필요합니다.'),
});

// ============================================
// 그룹(Group) 관련 스키마
// ============================================

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(2, '그룹 이름은 최소 2자 이상이어야 합니다.')
    .max(100, '그룹 이름은 최대 100자까지 입력 가능합니다.')
    .trim(),
  description: z
    .string()
    .max(500, '설명은 최대 500자까지 입력 가능합니다.')
    .optional()
    .nullable(),
  complexIds: z
    .array(z.string())
    .max(500, '최대 500개의 단지까지 추가 가능합니다.')
    .optional()
    .default([]),
  isAutomatic: z.boolean().optional().default(false),
  autoRules: z
    .object({
      location: z.string().optional(),
      minHouseholds: z.number().int().nonnegative().optional(),
      maxHouseholds: z.number().int().nonnegative().optional(),
      hasArticles: z.boolean().optional(),
    })
    .optional()
    .nullable(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const addComplexToGroupSchema = z.object({
  complexId: z.string().min(1, '단지 ID가 필요합니다.'),
});

// ============================================
// 사용자 관리 스키마
// ============================================

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
  newPassword: z
    .string()
    .min(8, '새 비밀번호는 최소 8자 이상이어야 합니다.')
    .max(100, '새 비밀번호는 최대 100자까지 입력 가능합니다.')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/,
      '비밀번호는 영문, 숫자, 특수문자(@$!%*#?&)를 포함해야 합니다.'
    ),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'FAMILY', 'GUEST']),
});

export const verifyUserSchema = z.object({
  userId: z.string().cuid(),
  approved: z.boolean(),
});

// ============================================
// 페이지네이션 스키마
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['recent', 'popular', 'likes']).default('recent'),
  category: postCategoryEnum.optional(),
  search: z.string().max(100).optional(),
});

// ============================================
// 타입 추론 헬퍼
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type CrawlRequestInput = z.infer<typeof crawlRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteSchema>;
export type ReorderFavoritesInput = z.infer<typeof reorderFavoritesSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddComplexToGroupInput = z.infer<typeof addComplexToGroupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
