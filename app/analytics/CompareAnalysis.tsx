/**
 * 다중 단지 비교 분석 컴포넌트
 */

import React from 'react';
import { ComplexBarChart } from '@/components/charts';

interface CompareAnalysisProps {
  analyticsData: any;
}

export const CompareAnalysis: React.FC<CompareAnalysisProps> = ({ analyticsData }) => {
  if (!analyticsData || !analyticsData.comparisons) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">비교할 단지를 선택해주세요 (2개 이상)</p>
      </div>
    );
  }

  const { comparisons } = analyticsData;

  // 순위 계산 함수
  const getRank = (value: number, allValues: number[], reverse = false) => {
    const sorted = [...allValues].sort((a, b) => reverse ? a - b : b - a);
    return sorted.indexOf(value) + 1;
  };

  const allAvgPrices = comparisons.map((c: any) => c.avgPrice);
  const allArticles = comparisons.map((c: any) => c.totalArticles);
  const allPricePerPyeong = comparisons.map((c: any) => c.avgPricePerPyeong);

  return (
    <div className="space-y-6">
      {/* 비교 테이블 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평균 가격
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  매물 수
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평당 가격
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  최저가
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  최고가
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {comparisons.map((comp: any, index: number) => {
                const avgPriceRank = getRank(comp.avgPrice, allAvgPrices, true);
                const articlesRank = getRank(comp.totalArticles, allArticles);
                const pricePerPyeongRank = getRank(comp.avgPricePerPyeong, allPricePerPyeong, true);

                return (
                  <tr key={comp.complexNo} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {comp.complexName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-900 dark:text-white">
                          {(comp.avgPrice / 10000).toFixed(2)}억
                        </span>
                        <RankBadge rank={avgPriceRank} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-900 dark:text-white">
                          {comp.totalArticles}건
                        </span>
                        <RankBadge rank={articlesRank} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-900 dark:text-white">
                          {(comp.avgPricePerPyeong / 10000).toFixed(2)}억/평
                        </span>
                        <RankBadge rank={pricePerPyeongRank} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                      {(comp.minPrice / 10000).toFixed(2)}억
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                      {(comp.maxPrice / 10000).toFixed(2)}억
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 비교 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 평균 가격 비교 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            평균 가격 비교
          </h3>
          <ComplexBarChart
            data={comparisons}
            dataKey="avgPrice"
            barColor="#3b82f6"
            yAxisLabel="가격"
          />
        </div>

        {/* 매물 수 비교 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            매물 수 비교
          </h3>
          <ComplexBarChart
            data={comparisons}
            dataKey="totalArticles"
            barColor="#10b981"
            yAxisLabel="매물 수"
          />
        </div>
      </div>

      {/* 평당 가격 비교 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          평당 가격 비교
        </h3>
        <ComplexBarChart
          data={comparisons}
          dataKey="avgPricePerPyeong"
          barColor="#f59e0b"
          yAxisLabel="평당 가격"
        />
      </div>

      {/* 거래유형별 매물 수 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          거래유형별 매물 수
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  단지명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  매매
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  전세
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  월세
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  총계
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {comparisons.map((comp: any) => (
                <tr key={comp.complexNo} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {comp.complexName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 dark:text-blue-400">
                    {comp.tradeTypeCounts['매매'] || 0}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                    {comp.tradeTypeCounts['전세'] || 0}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600 dark:text-amber-400">
                    {comp.tradeTypeCounts['월세'] || 0}건
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900 dark:text-white">
                    {comp.totalArticles}건
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * 순위 배지 컴포넌트
 */
interface RankBadgeProps {
  rank: number;
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank }) => {
  const colors: { [key: number]: string } = {
    1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    2: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    3: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  const colorClass = colors[rank] || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {rank}위
    </span>
  );
};
