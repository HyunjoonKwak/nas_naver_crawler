/**
 * 가격 추이 라인 차트
 * 시간별 평균 가격 추이를 거래유형별로 표시
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PriceLineChartProps {
  data: Array<{
    date: string;
    [tradeType: string]: string | number;
  }>;
  className?: string;
}

export const PriceLineChart: React.FC<PriceLineChartProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">데이터가 없습니다</p>
      </div>
    );
  }

  // 데이터에서 평형 추출 (date 제외)
  const keys = Object.keys(data[0]).filter((key) => key !== 'date');

  // 평형별 색상 팔레트 (구별하기 쉬운 색상)
  const colorPalette = [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
    '#6366f1', // indigo-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ];

  // 각 평형에 색상 할당
  const colors: { [key: string]: string } = {};
  keys.forEach((key, index) => {
    colors[key] = colorPalette[index % colorPalette.length];
  });

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
            tickFormatter={(value) => `${(value / 10000).toFixed(1)}억`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            formatter={(value: any) => [`${(value / 10000).toFixed(2)}억`, '']}
          />
          <Legend />
          {keys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[key] || '#6b7280'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
