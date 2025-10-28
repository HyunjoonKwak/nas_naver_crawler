import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import { MobileNavigation } from '@/components/MobileNavigation';
import { AuthGuard } from '@/components/AuthGuard';
import { PageBackground } from '@/lib/design-system';

interface PageLayoutProps {
  children: ReactNode;
  /**
   * 페이지 제목 (선택)
   */
  title?: string;
  /**
   * 페이지 설명 (선택)
   */
  description?: string;
  /**
   * 배경 스타일 (기본값: default gradient)
   */
  background?: keyof typeof PageBackground;
  /**
   * AuthGuard 사용 여부 (기본값: true)
   */
  requireAuth?: boolean;
  /**
   * 헤더 영역 커스텀 컨텐츠 (제목 대신 사용)
   */
  headerContent?: ReactNode;
  /**
   * 최대 너비 제한 (기본값: 7xl)
   */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl';
  /**
   * 패딩 제거 여부 (기본값: false)
   */
  noPadding?: boolean;
}

/**
 * 기본 페이지 레이아웃 컴포넌트
 *
 * 모든 페이지에서 공통으로 사용되는 레이아웃 구조를 제공합니다.
 * - Navigation 자동 포함
 * - MobileNavigation 자동 포함
 * - AuthGuard 선택적 적용
 * - 일관된 여백 및 배경 스타일
 */
export const PageLayout = ({
  children,
  title,
  description,
  background = 'default',
  requireAuth = true,
  headerContent,
  maxWidth = '7xl',
  noPadding = false,
}: PageLayoutProps) => {
  const maxWidthClasses = {
    full: 'max-w-full',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
  };

  const content = (
    <>
      <Navigation />
      <div className={PageBackground[background]}>
        <div className={`${maxWidthClasses[maxWidth]} mx-auto ${noPadding ? '' : 'px-4 sm:px-6 lg:px-8 py-6'}`}>
          {/* 헤더 영역 */}
          {(title || description || headerContent) && (
            <div className="mb-6">
              {headerContent ? (
                headerContent
              ) : (
                <>
                  {title && (
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      {description}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 메인 콘텐츠 */}
          {children}
        </div>
      </div>
      <MobileNavigation />
    </>
  );

  // AuthGuard 적용 여부에 따라 반환
  if (requireAuth) {
    return <AuthGuard>{content}</AuthGuard>;
  }

  return content;
};
