import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageLayout } from './PageLayout';
import { LoadingSpinner } from '@/components';
import { Card } from '@/lib/design-system';

interface DetailPageLayoutProps {
  /**
   * 페이지 제목
   */
  title: string;
  /**
   * 부제목 또는 설명
   */
  subtitle?: string;
  /**
   * 뒤로가기 링크
   */
  backLink?: string;
  /**
   * 뒤로가기 텍스트
   */
  backText?: string;
  /**
   * 로딩 상태
   */
  loading?: boolean;
  /**
   * 로딩 메시지
   */
  loadingMessage?: string;
  /**
   * 상단 액션 버튼 영역 (예: 수정, 삭제)
   */
  actions?: ReactNode;
  /**
   * 탭 영역 (선택)
   */
  tabs?: ReactNode;
  /**
   * 사이드바 콘텐츠 (2열 레이아웃 시 사용)
   */
  sidebar?: ReactNode;
  /**
   * 메인 콘텐츠
   */
  children: ReactNode;
  /**
   * 배경 스타일
   */
  background?: 'default' | 'solid' | 'white';
  /**
   * 인증 필요 여부
   */
  requireAuth?: boolean;
  /**
   * 카드로 감쌀지 여부 (기본값: false)
   */
  withCard?: boolean;
  /**
   * 최대 너비 (기본값: 7xl)
   */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl';
}

/**
 * 상세 페이지용 레이아웃 컴포넌트
 *
 * 단일 항목의 상세 정보를 표시하는 페이지에서 사용됩니다.
 * - 뒤로가기 버튼 자동 추가
 * - 로딩 상태 처리
 * - 액션 버튼 영역
 * - 탭 지원
 * - 사이드바 2열 레이아웃 지원
 *
 * 사용 예:
 * - 단지 상세 페이지
 * - 커뮤니티 게시글 상세
 * - 사용자 프로필 페이지
 */
export const DetailPageLayout = ({
  title,
  subtitle,
  backLink,
  backText = '목록으로',
  loading = false,
  loadingMessage,
  actions,
  tabs,
  sidebar,
  children,
  background = 'default',
  requireAuth = true,
  withCard = false,
  maxWidth = '7xl',
}: DetailPageLayoutProps) => {
  const headerContent = (
    <div className="space-y-4">
      {/* 뒤로가기 버튼 */}
      {backLink && (
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">{backText}</span>
        </Link>
      )}

      {/* 제목 및 액션 영역 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* 탭 영역 */}
      {tabs && <div className="border-b border-gray-200 dark:border-gray-700">{tabs}</div>}
    </div>
  );

  const mainContent = loading ? (
    <LoadingSpinner text={loadingMessage} />
  ) : sidebar ? (
    // 2열 레이아웃 (메인 + 사이드바)
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {withCard ? (
          <div className={Card.base}>
            <div className="p-6">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-20 space-y-6">{sidebar}</div>
      </div>
    </div>
  ) : (
    // 1열 레이아웃
    withCard ? (
      <div className={Card.base}>
        <div className="p-6">{children}</div>
      </div>
    ) : (
      children
    )
  );

  return (
    <PageLayout
      headerContent={headerContent}
      background={background}
      requireAuth={requireAuth}
      maxWidth={maxWidth}
    >
      {mainContent}
    </PageLayout>
  );
};
