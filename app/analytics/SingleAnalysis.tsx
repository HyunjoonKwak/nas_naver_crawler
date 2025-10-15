/**
 * 단일 단지 심층 분석 컴포넌트
 */

import React from 'react';
import { PriceLineChart, TradePieChart, AreaScatterChart } from '@/components/charts';

interface SingleAnalysisProps {
  analyticsData: any;
  tradeTypes?: string[];
}

export const SingleAnalysis: React.FC<SingleAnalysisProps> = ({ analyticsData, tradeTypes = [] }) => {
  if (!analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">📊</div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">단지를 선택해주세요</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          단지를 선택하고 "분석 시작" 버튼을 클릭하세요
        </p>
      </div>
    );
  }

  const { complex, statistics, statisticsByArea, charts } = analyticsData;

  // 필터 적용: tradeTypes가 비어있으면 전체 표시, 있으면 선택된 거래유형만
  const filteredStatisticsByArea = statisticsByArea && statisticsByArea.length > 0
    ? (tradeTypes.length > 0
        ? statisticsByArea.filter((stat: any) => tradeTypes.includes(stat.tradeType))
        : statisticsByArea)
    : [];

  return (
    <div className="space-y-6">
      {/* 단지 정보 헤더 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {complex.complexName}
        </h2>
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>단지번호: {complex.complexNo}</span>
          {complex.totalHousehold && <span>세대수: {complex.totalHousehold}세대</span>}
          {complex.totalDong && <span>동수: {complex.totalDong}동</span>}
        </div>
      </div>

      {/* 전체 통계 요약 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-md p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          📊 전체 통계 요약
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 매물</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalArticles}건</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">평균 가격</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(statistics.avgPrice / 10000).toFixed(2)}억</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">중간값</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{(statistics.medianPrice / 10000).toFixed(2)}억</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">최저가</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{(statistics.minPrice / 10000).toFixed(2)}억</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">최고가</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{(statistics.maxPrice / 10000).toFixed(2)}억</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">평당 평균</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(statistics.avgPricePerPyeong / 10000).toFixed(2)}억</div>
          </div>
        </div>
      </div>

      {/* 평형별 + 거래유형별 상세 통계 */}
      {filteredStatisticsByArea && filteredStatisticsByArea.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            📐 평형별 • 거래유형별 상세 통계
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">평형</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">거래유형</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">면적(㎡)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">매물수</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">평균가</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">중간값</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">최저가</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">최고가</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">평당가</th>
                </tr>
              </thead>
              <tbody>
                {filteredStatisticsByArea.map((areaStats: any, index: number) => {
                  // 거래유형별 색상
                  const tradeTypeColors: { [key: string]: string } = {
                    '매매': 'text-blue-600 dark:text-blue-400',
                    '전세': 'text-green-600 dark:text-green-400',
                    '월세': 'text-orange-600 dark:text-orange-400',
                  };
                  const tradeTypeColor = tradeTypeColors[areaStats.tradeType] || 'text-gray-600 dark:text-gray-400';

                  return (
                    <tr
                      key={`${areaStats.pyeong}-${areaStats.tradeType}`}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{areaStats.pyeong}평</td>
                      <td className={`py-3 px-4 font-semibold ${tradeTypeColor}`}>{areaStats.tradeType}</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-600 dark:text-gray-400">{areaStats.area.toFixed(1)}㎡</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-900 dark:text-white">{areaStats.count}건</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">{(areaStats.avgPrice / 10000).toFixed(2)}억</td>
                      <td className="py-3 px-4 text-right text-sm text-gray-700 dark:text-gray-300">{(areaStats.medianPrice / 10000).toFixed(2)}억</td>
                      <td className="py-3 px-4 text-right text-sm text-green-600 dark:text-green-400">{(areaStats.minPrice / 10000).toFixed(2)}억</td>
                      <td className="py-3 px-4 text-right text-sm text-orange-600 dark:text-orange-400">{(areaStats.maxPrice / 10000).toFixed(2)}억</td>
                      <td className="py-3 px-4 text-right text-sm text-purple-600 dark:text-purple-400">{(areaStats.avgPricePerPyeong / 10000).toFixed(3)}억</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 가격 추이 차트 (2/3 너비) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            가격 추이
          </h3>
          <PriceLineChart data={charts.priceTrend} />
        </div>

        {/* 거래유형 분포 (1/3 너비) */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            거래유형 분포
          </h3>
          <TradePieChart data={charts.tradeTypeDistribution} />
        </div>
      </div>

      {/* 면적별 가격 산점도 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          면적별 가격 분포
        </h3>
        <AreaScatterChart
          data={charts.areaVsPrice}
          dataRange={charts.areaVsPriceRange}
        />
      </div>

      {/* 가격대별 매물 분포 - 평형별로 구분 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          평형별 가격대 분포
        </h3>
        <div className="space-y-6">
          {charts.priceHistogram.map((areaGroup: any) => (
            <div key={areaGroup.pyeong}>
              <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {areaGroup.pyeong}
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
                {areaGroup.data.map((item: any) => (
                  <div
                    key={`${areaGroup.pyeong}-${item.range}`}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800"
                  >
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {item.count}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {item.range}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 통계 카드 컴포넌트
 */
interface StatCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, suffix = '', icon }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
        {suffix && <span className="text-lg font-normal text-gray-600 dark:text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
};
