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
