"use client";

import { useState, useEffect } from 'react';

interface PriceData {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
}

interface PriceChartProps {
  complexNo: string;
  tradeType?: 'A1' | 'B1' | 'B2' | 'all';
  period?: 7 | 14 | 30 | 90;
}

export function PriceChart({
  complexNo,
  tradeType = 'all',
  period = 30
}: PriceChartProps) {
  const [data, setData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceData();
  }, [complexNo, tradeType, period]);

  const fetchPriceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/price-trend?complexNo=${complexNo}&tradeType=${tradeType}&period=${period}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000) {
      return `${(price / 10000).toFixed(1)}억`;
    }
    return `${price.toLocaleString()}만`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Calculate chart dimensions
  const maxPrice = Math.max(...data.map(d => d.maxPrice), 0);
  const minPrice = Math.min(...data.map(d => d.minPrice), Infinity);
  const priceRange = maxPrice - minPrice || 1;

  const getY = (price: number, height: number) => {
    return height - ((price - minPrice) / priceRange) * height;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          가격 추이
        </h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">데이터가 충분하지 않습니다</p>
        </div>
      </div>
    );
  }

  const chartHeight = 240;
  const chartWidth = 600;
  const padding = 40;

  // Create SVG path for average price line
  const avgPath = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
      const y = getY(d.avgPrice, chartHeight - padding * 2) + padding;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create area fill path
  const areaPath = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
      const yMax = getY(d.maxPrice, chartHeight - padding * 2) + padding;
      const yMin = getY(d.minPrice, chartHeight - padding * 2) + padding;
      if (i === 0) return `M ${x} ${yMin} L ${x} ${yMax}`;
      return `L ${x} ${yMax}`;
    })
    .join(' ') + ' ' + data
    .reverse()
    .map((d, i) => {
      const idx = data.length - 1 - i;
      const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
      const yMin = getY(d.minPrice, chartHeight - padding * 2) + padding;
      return `L ${x} ${yMin}`;
    })
    .join(' ') + ' Z';

  data.reverse(); // Restore original order

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          가격 추이
        </h3>
        <div className="flex gap-2">
          <select
            value={tradeType}
            onChange={(e) => fetchPriceData()}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="A1">매매</option>
            <option value="B1">전세</option>
            <option value="B2">월세</option>
          </select>
          <select
            value={period}
            onChange={(e) => fetchPriceData()}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">7일</option>
            <option value="14">14일</option>
            <option value="30">30일</option>
            <option value="90">90일</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ minWidth: '400px' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding + ratio * (chartHeight - padding * 2);
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* Area fill (min-max range) */}
          <path
            d={areaPath}
            fill="currentColor"
            className="text-blue-200 dark:text-blue-900/50"
            opacity="0.3"
          />

          {/* Average price line */}
          <path
            d={avgPath}
            fill="none"
            stroke="currentColor"
            className="text-blue-600 dark:text-blue-400"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - padding * 2);
            const y = getY(d.avgPrice, chartHeight - padding * 2) + padding;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="currentColor"
                className="text-blue-600 dark:text-blue-400"
              />
            );
          })}

          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i, arr) => {
            const idx = data.indexOf(d);
            const x = padding + (idx / (data.length - 1 || 1)) * (chartWidth - padding * 2);
            return (
              <text
                key={idx}
                x={x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
              >
                {formatDate(d.date)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
          <span>평균 가격</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900/50 rounded-full"></div>
          <span>가격 범위 (최저-최고)</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">평균</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPrice(data.reduce((sum, d) => sum + d.avgPrice, 0) / data.length)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">최저</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPrice(minPrice)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">최고</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPrice(maxPrice)}
          </p>
        </div>
      </div>
    </div>
  );
}
