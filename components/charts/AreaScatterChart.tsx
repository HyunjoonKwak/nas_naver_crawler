/**
 * 면적별 가격 산점도 차트
 * 면적(㎡)과 가격의 상관관계를 시각화
 */

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AreaScatterChartProps {
  data: Array<{
    area: number;
    price: number;
    tradeType: string;
    priceLabel: string;
  }>;
  dataRange?: {
    minArea: number;
    maxArea: number;
    minPrice: number;
    maxPrice: number;
  };
  className?: string;
}

const COLORS: { [key: string]: string } = {
  매매: '#3b82f6', // blue-500
  전세: '#10b981', // green-500
  월세: '#f59e0b', // amber-500
};

export const AreaScatterChart: React.FC<AreaScatterChartProps> = ({ data, dataRange, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">데이터가 없습니다</p>
      </div>
    );
  }

  // 거래유형별로 데이터 그룹화
  const groupedData: { [key: string]: any[] } = {};
  data.forEach((item) => {
    if (!groupedData[item.tradeType]) {
      groupedData[item.tradeType] = [];
    }
    groupedData[item.tradeType].push(item);
  });

  // 축 범위 계산 (dataRange가 있으면 사용, 없으면 자동)
  const xDomain = dataRange ? [
    Math.floor(dataRange.minArea * 0.9), // 10% 여유
    Math.ceil(dataRange.maxArea * 1.1)
  ] : undefined;

  const yDomain = dataRange ? [
    Math.floor(dataRange.minPrice * 0.9), // 10% 여유
    Math.ceil(dataRange.maxPrice * 1.1)
  ] : undefined;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            type="number"
            dataKey="area"
            name="면적"
            unit="㎡"
            domain={xDomain}
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
            label={{ value: '면적 (㎡)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="price"
            name="가격"
            domain={yDomain}
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
            tickFormatter={(value) => `${(value / 10000).toFixed(1)}억`}
            label={{ value: '가격', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value: any, name: string, props: any) => {
              if (name === '면적') return [`${value}㎡`, '면적'];
              if (name === '가격') return [props.payload.priceLabel, '가격'];
              return [value, name];
            }}
          />
          <Legend />
          {Object.entries(groupedData).map(([tradeType, items]) => (
            <Scatter
              key={tradeType}
              name={tradeType}
              data={items}
              fill={COLORS[tradeType] || '#6b7280'}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
