import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FavoriteStats {
  total: number;
  A1: number; // 매매
  B1: number; // 전세
  B2: number; // 월세
}

interface SortableFavoriteCardProps {
  fav: {
    complexNo: string;
    complexName?: string;
    lastCrawledAt?: string;
    stats?: FavoriteStats;
  };
  formatDate: (dateString: string) => string;
  isDragging?: boolean;
}

export function SortableFavoriteCard({ fav, formatDate, isDragging }: SortableFavoriteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: fav.complexNo });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-move bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="드래그하여 순서 변경"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </div>

      <Link
        href={`/complex/${fav.complexNo}`}
        className="block bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all hover:-translate-y-1"
      >
        {/* 단지명 */}
        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1 pl-8">
          {fav.complexName || `단지 ${fav.complexNo}`}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 pl-8">
          📌 {fav.complexNo}
        </p>

        {/* 매물 통계 */}
        {fav.stats ? (
          <div className="space-y-3">
            {/* 전체 매물 수 */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                전체 매물
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {fav.stats.total}
              </span>
            </div>

            {/* 거래유형별 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">매매</div>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {fav.stats.A1}
                </div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">전세</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {fav.stats.B1}
                </div>
              </div>
              <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">월세</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {fav.stats.B2}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400 dark:text-gray-600 text-sm">
            크롤링 데이터 없음
          </div>
        )}

        {/* 최근 수집 시간 */}
        {fav.lastCrawledAt && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            최근 수집: {formatDate(fav.lastCrawledAt)}
          </div>
        )}
      </Link>
    </div>
  );
}
