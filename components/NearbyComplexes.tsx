import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, TrendingUp } from 'lucide-react';

interface NearbyComplex {
  id: string;
  complexNo: string;
  complexName: string;
  beopjungdong?: string;
  articleCount: number;
  priceStats?: {
    avgPrice: string;
  } | null;
}

interface NearbyComplexesProps {
  currentComplexId: string;
  beopjungdong?: string;
  lawdCd?: string;
}

/**
 * 같은 지역 다른 아파트 추천 위젯
 *
 * 현재 단지와 같은 법정동에 있는 다른 즐겨찾기 단지를 표시합니다.
 */
export const NearbyComplexes = ({ currentComplexId, beopjungdong, lawdCd }: NearbyComplexesProps) => {
  const [complexes, setComplexes] = useState<NearbyComplex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!beopjungdong && !lawdCd) {
      setLoading(false);
      return;
    }

    fetchNearbyComplexes();
  }, [currentComplexId, beopjungdong, lawdCd]);

  const fetchNearbyComplexes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/complexes');
      const data = await response.json();

      if (data.complexes) {
        // 같은 법정동의 다른 단지 필터링
        const nearby = data.complexes
          .filter((c: NearbyComplex) =>
            c.id !== currentComplexId &&
            c.complexNo !== currentComplexId &&
            (beopjungdong ? c.beopjungdong === beopjungdong : true)
          )
          .slice(0, 5); // 최대 5개

        setComplexes(nearby);
      }
    } catch (error) {
      console.error('Failed to fetch nearby complexes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (complexes.length === 0) {
    return null; // 같은 지역 다른 단지가 없으면 표시하지 않음
  }

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        같은 지역 다른 아파트
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          ({beopjungdong || '같은 법정동'})
        </span>
      </h3>

      <div className="space-y-3">
        {complexes.map((complex) => (
          <Link
            key={complex.id}
            href={`/complex/${complex.complexNo}`}
            className="block bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                  {complex.complexName}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  {complex.articleCount > 0 && (
                    <span>매물 {complex.articleCount}건</span>
                  )}
                  {complex.priceStats?.avgPrice && (
                    <>
                      <span>•</span>
                      <span>평균 {complex.priceStats.avgPrice}</span>
                    </>
                  )}
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 같은 지역 관심 단지를 비교해보세요
        </p>
      </div>
    </div>
  );
};
