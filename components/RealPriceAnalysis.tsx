"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RealPriceTransaction {
  transactionDate: string;
  dong: string;
  ho: string;
  area: number;
  areaType: string;
  floor: number;
  price: number;
  pricePerArea: number;
  tradeType: string;
  buildYear?: number;
}

interface AreaStats {
  areaType: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  transactionCount: number;
}

interface ChartData {
  month: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}

interface RealPriceAnalysisProps {
  complexNo: string;
}

export default function RealPriceAnalysis({ complexNo }: RealPriceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<RealPriceTransaction[]>([]);
  const [areaStats, setAreaStats] = useState<AreaStats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState('6m');
  const [apiStatus, setApiStatus] = useState('');

  useEffect(() => {
    fetchRealPriceData();
  }, [complexNo, period]);

  const fetchRealPriceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/real-price?complexNo=${complexNo}&period=${period}`);
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data.transactions);
        setAreaStats(result.data.areaStats);
        setChartData(result.data.chartData);
        setApiStatus(result.apiStatus || '');
      }
    } catch (error: any) {
      console.error('Failed to fetch real price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    const eok = Math.floor(price / 100000000);
    const man = Math.floor((price % 100000000) / 10000);
    if (eok > 0 && man > 0) return `${eok}억 ${man}만원`;
    if (eok > 0) return `${eok}억원`;
    return `${man}만원`;
  };

  const formatChartPrice = (price: number) => {
    return (price / 100000000).toFixed(1) + '억';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API 상태 알림 */}
      {apiStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
            <p className="text-sm text-blue-800 dark:text-blue-300">{apiStatus}</p>
          </div>
        </div>
      )}

      {/* 평형별 실거래가 통계 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📊 평형별 실거래가 통계 (최근 {period === '1m' ? '1개월' : period === '3m' ? '3개월' : period === '6m' ? '6개월' : '1년'})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areaStats.map((stat) => (
            <div
              key={stat.areaType}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {stat.areaType}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">평균가</span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatPrice(stat.avgPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">최고가</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(stat.maxPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">최저가</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(stat.minPrice)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">거래건수</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {stat.transactionCount}건
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 실거래가 추이 차트 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            📈 실거래가 추이 (최근 6개월)
          </h3>
          <div className="flex gap-2">
            {['1m', '3m', '6m', '1y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {p === '1m' ? '1개월' : p === '3m' ? '3개월' : p === '6m' ? '6개월' : '1년'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={formatChartPrice}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip
              formatter={(value: any) => formatPrice(value)}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                if (value === 'avgPrice') return '평균가';
                if (value === 'maxPrice') return '최고가';
                if (value === 'minPrice') return '최저가';
                return value;
              }}
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="maxPrice"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#ef4444', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="minPrice"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#10b981', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 최근 실거래 내역 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            📋 최근 실거래 내역
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  거래일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  거래가
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  층
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.slice(0, 10).map((transaction, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.transactionDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.areaType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formatPrice(transaction.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {transaction.floor}층
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length > 10 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              총 {transactions.length}건 중 최근 10건 표시
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
