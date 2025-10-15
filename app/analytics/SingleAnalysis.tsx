/**
 * 단일 단지 심층 분석 컴포넌트
 */

import React from 'react';
import { PriceLineChart, TradePieChart, AreaScatterChart } from '@/components/charts';

interface SingleAnalysisProps {
  analyticsData: any;
}

export const SingleAnalysis: React.FC<SingleAnalysisProps> = ({ analyticsData }) => {
  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">단지를 선택해주세요</p>
      </div>
    );
  }

  const { complex, statistics, charts } = analyticsData;

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

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="총 매물 수"
          value={statistics.totalArticles}
          suffix="건"
          icon="📊"
        />
        <StatCard
          title="평균 가격"
          value={(statistics.avgPrice / 10000).toFixed(2)}
          suffix="억"
          icon="💰"
        />
        <StatCard
          title="중간값 가격"
          value={(statistics.medianPrice / 10000).toFixed(2)}
          suffix="억"
          icon="📈"
        />
        <StatCard
          title="최저가"
          value={(statistics.minPrice / 10000).toFixed(2)}
          suffix="억"
          icon="⬇️"
        />
        <StatCard
          title="최고가"
          value={(statistics.maxPrice / 10000).toFixed(2)}
          suffix="억"
          icon="⬆️"
        />
        <StatCard
          title="평당 평균가"
          value={(statistics.avgPricePerPyeong / 10000).toFixed(2)}
          suffix="억/평"
          icon="📐"
        />
      </div>

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
        <AreaScatterChart data={charts.areaVsPrice} />
      </div>

      {/* 가격 분포 히스토그램 */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          가격대별 매물 분포
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {charts.priceHistogram.map((item: any) => (
            <div
              key={item.range}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center"
            >
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {item.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {item.range}
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
