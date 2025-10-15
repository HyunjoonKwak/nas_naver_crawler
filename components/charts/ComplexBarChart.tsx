/**
 * 단지별 비교 바 차트
 * 여러 단지의 통계를 나란히 비교
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ComplexBarChartProps {
  data: Array<{
    complexName: string;
    avgPrice?: number;
    totalArticles?: number;
    avgPricePerPyeong?: number;
    [key: string]: any;
  }>;
  dataKey: string;
  barColor?: string;
  yAxisLabel?: string;
  className?: string;
}

export const ComplexBarChart: React.FC<ComplexBarChartProps> = ({
  data,
  dataKey,
  barColor = '#3b82f6',
  yAxisLabel,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">데이터가 없습니다</p>
      </div>
    );
  }

  const formatYAxis = (value: number) => {
    if (dataKey.includes('Price') || dataKey.includes('price')) {
      return `${(value / 10000).toFixed(1)}억`;
    }
    return value.toString();
  };

  const formatTooltip = (value: any) => {
    if (dataKey.includes('Price') || dataKey.includes('price')) {
      return [`${(value / 10000).toFixed(2)}억`, ''];
    }
    return [value, ''];
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            dataKey="complexName"
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            className="text-xs"
            stroke="currentColor"
            style={{ fill: 'currentColor' }}
            tickFormatter={formatYAxis}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={formatTooltip}
          />
          <Legend />
          <Bar dataKey={dataKey} fill={barColor} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
