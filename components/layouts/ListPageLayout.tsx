import { ReactNode } from 'react';
import { PageLayout } from './PageLayout';
import { LoadingSpinner, EmptyState } from '@/components';

interface ListPageLayoutProps {
  /**
   * 페이지 제목
   */
  title: string;
  /**
   * 페이지 설명 (선택)
   */
  description?: string;
  /**
   * 로딩 상태
   */
  loading?: boolean;
  /**
   * 로딩 메시지
   */
  loadingMessage?: string;
  /**
   * 데이터 없음 상태
   */
  isEmpty?: boolean;
  /**
   * 빈 상태 아이콘
   */
  emptyIcon?: string;
  /**
   * 빈 상태 제목
   */
  emptyTitle?: string;
  /**
   * 빈 상태 설명
   */
  emptyDescription?: string;
  /**
   * 빈 상태 액션 버튼
   */
  emptyAction?: ReactNode;
  /**
   * 상단 액션 영역 (예: 검색, 필터, 추가 버튼)
   */
  actions?: ReactNode;
  /**
   * 필터/탭 영역
   */
  filters?: ReactNode;
  /**
   * 리스트 콘텐츠
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
   * 통계 카드 영역 (선택)
   */
  stats?: ReactNode;
}

/**
 * 리스트 페이지용 레이아웃 컴포넌트
 *
 * 목록을 표시하는 페이지에서 사용됩니다.
 * - 자동 로딩 상태 처리
 * - 자동 빈 상태 처리
 * - 액션/필터 영역 구조화
 * - 통계 카드 영역 지원
 *
 * 사용 예:
 * - 단지 관리 페이지
 * - 커뮤니티 게시판
 * - 알림 설정 페이지
 */
export const ListPageLayout = ({
  title,
  description,
  loading = false,
  loadingMessage,
  isEmpty = false,
  emptyIcon = '📭',
  emptyTitle = '데이터가 없습니다',
  emptyDescription,
  emptyAction,
  actions,
  filters,
  children,
  background = 'default',
  requireAuth = true,
  stats,
}: ListPageLayoutProps) => {
  return (
    <PageLayout
      title={title}
      description={description}
      background={background}
      requireAuth={requireAuth}
    >
      {/* 통계 카드 영역 */}
      {stats && <div className="mb-6">{stats}</div>}

      {/* 액션 영역 (검색, 필터, 추가 버튼 등) */}
      {actions && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {actions}
        </div>
      )}

      {/* 필터/탭 영역 */}
      {filters && <div className="mb-6">{filters}</div>}

      {/* 리스트 콘텐츠 */}
      {loading ? (
        <LoadingSpinner text={loadingMessage} />
      ) : isEmpty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        children
      )}
    </PageLayout>
  );
};
