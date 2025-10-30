"use client";

import React, { useEffect, useState } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';

interface RentPriceItem {
  dealDate: string;
  dong: string;
  jibun: string;
  apartmentName: string;
  exclusiveArea: number;
  deposit: number; // 보증금 (원 단위)
  monthlyRent: number; // 월세 (원 단위)
  depositFormatted: string; // 보증금 (억/만원)
  monthlyRentFormatted: string; // 월세 (만원)
  floor: number;
  buildYear: number;
  tradeType: string; // '전세' or '월세'
  dealMethod: string; // '직거래' or '중개거래'
  contractType: string; // '신규' or '갱신'
  dealYear: number;
  dealMonth: number;
  dealDay: number;
}

interface ComplexInfo {
  complexNo: string;
  complexName: string;
  realPriceAptName: string | null;
  beopjungdong: string | null;
  lawdCd: string;
}

interface RentPriceData {
  complex: ComplexInfo;
  months: string[];
  items: RentPriceItem[];
  totalCount: number;
}

interface RentPriceAnalysisProps {
  complexNo: string;
}

export default function RentPriceAnalysis({ complexNo }: RentPriceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RentPriceData | null>(null);
  const [months, setMonths] = useState(6);
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | '전세' | '월세'>('all');
  const [chartAreaFilters, setChartAreaFilters] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'date' | 'deposit' | 'area'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchRentPriceData();
  }, [complexNo, months]);

  const fetchRentPriceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rent-price/complex?complexNo=${complexNo}&months=${months}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '전월세 실거래가 조회 실패');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '전월세 실거래가 조회 실패');
      }

      setData(result.data);

      // 초기 차트 필터 설정 (모든 평형 선택)
      if (result.data.items.length > 0) {
        const areas = new Set(
          result.data.items.map((item: RentPriceItem) => Math.floor(item.exclusiveArea / 3.3058).toString())
        );
        setChartAreaFilters(areas);
      }
    } catch (err: any) {
      console.error('전월세 실거래가 조회 에러:', err);
      setError(err.message || '전월세 실거래가 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 평형별 그룹화
  const getAreaGroups = (): Map<string, RentPriceItem[]> => {
    if (!data) return new Map();

    const groups = new Map<string, RentPriceItem[]>();

    data.items.forEach(item => {
      const pyeong = Math.floor(item.exclusiveArea / 3.3058);
      const key = `${pyeong}평`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return groups;
  };

  // 차트 데이터 생성 (평형별)
  const generateChartData = () => {
    if (!data) return [];

    const areaGroups = getAreaGroups();
    const monthMap = new Map<string, any>();

    // 월별 데이터 초기화
    data.months.forEach(month => {
      const [year, monthNum] = [month.substring(0, 4), month.substring(4, 6)];
      monthMap.set(month, { month: `${year}-${monthNum}`, count: 0 });
    });

    // 평형별 데이터 집계 (거래유형 필터 적용)
    areaGroups.forEach((items, areaKey) => {
      items.forEach(item => {
        // 거래유형 필터
        if (tradeTypeFilter !== 'all' && item.tradeType !== tradeTypeFilter) {
          return;
        }

        const yearMonth = `${item.dealYear}${String(item.dealMonth).padStart(2, '0')}`;
        if (monthMap.has(yearMonth)) {
          const monthData = monthMap.get(yearMonth);

          // 보증금 기준으로 차트 작성 (전세/월세 모두 보증금 존재)
          if (!monthData[`${areaKey}_data`]) {
            monthData[`${areaKey}_data`] = [];
          }
          monthData[`${areaKey}_data`].push(item.deposit);
          monthData.count++;
        }
      });
    });

    // 평형별 평균 계산
    monthMap.forEach((monthData, month) => {
      areaGroups.forEach((_, areaKey) => {
        const deposits = monthData[`${areaKey}_data`];
        if (deposits && deposits.length > 0) {
          monthData[`${areaKey}_avg`] = Math.round(deposits.reduce((sum: number, val: number) => sum + val, 0) / deposits.length);
        }
        delete monthData[`${areaKey}_data`]; // 임시 데이터 삭제
      });
    });

    const chartData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // 추세선 계산
    const trendlines = new Map<string, { slope: number; intercept: number }>();

    areaGroups.forEach((items, areaKey) => {
      const dataPoints = chartData
        .map((point, index) => ({
          x: index,
          y: point[`${areaKey}_avg`]
        }))
        .filter(p => p.y !== undefined);

      if (dataPoints.length >= 2) {
        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        dataPoints.forEach(point => {
          sumX += point.x;
          sumY += point.y;
          sumXY += point.x * point.y;
          sumXX += point.x * point.x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        trendlines.set(areaKey, { slope, intercept });
      }
    });

    // 추세선 값 추가
    chartData.forEach((point, index) => {
      trendlines.forEach((trendline, areaKey) => {
        point[`${areaKey}_trend`] = trendline.slope * index + trendline.intercept;
      });
    });

    return chartData;
  };

  // 필터링된 데이터
  const getFilteredItems = (): RentPriceItem[] => {
    if (!data) return [];

    return data.items.filter(item => {
      // 거래유형 필터
      if (tradeTypeFilter !== 'all' && item.tradeType !== tradeTypeFilter) {
        return false;
      }
      return true;
    });
  };

  // 정렬된 데이터
  const getSortedItems = (): RentPriceItem[] => {
    const filtered = getFilteredItems();

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        comparison = new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime();
      } else if (sortField === 'deposit') {
        comparison = a.deposit - b.deposit;
      } else if (sortField === 'area') {
        comparison = a.exclusiveArea - b.exclusiveArea;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // 페이지네이션
  const paginatedItems = getSortedItems().slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(getSortedItems().length / itemsPerPage);

  // 차트 색상
  const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const chartData = generateChartData();
  const areaGroups = getAreaGroups();
  const selectedAreas = new Set(
    Array.from(areaGroups.keys()).filter(key => chartAreaFilters.has(key.replace('평', '')))
  );

  // Y축 도메인 계산 (선택된 평형만)
  const selectedPrices: number[] = [];
  chartData.forEach(point => {
    selectedAreas.forEach(areaKey => {
      if (point[`${areaKey}_avg`] !== undefined) {
        selectedPrices.push(point[`${areaKey}_avg`]);
      }
    });
  });

  const yAxisDomain = selectedPrices.length > 0
    ? [
        () => Math.floor(Math.min(...selectedPrices) * 0.85),
        () => Math.ceil(Math.max(...selectedPrices) * 1.15)
      ]
    : [0, 'auto'];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-gray-500">전월세 실거래가 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-600">{error}</p>
        {error.includes('법정동 코드') && (
          <p className="text-sm text-red-500 mt-2">
            단지 상세 페이지를 한번 열어보시면 자동으로 법정동 코드가 설정됩니다.
          </p>
        )}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">최근 {months}개월 간 전월세 실거래가 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">조회 기간:</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value={3}>3개월</option>
            <option value={6}>6개월</option>
            <option value={12}>12개월</option>
            <option value={24}>24개월</option>
            <option value={36}>36개월</option>
          </select>

          <label className="text-sm font-medium text-gray-700 ml-4">거래유형:</label>
          <select
            value={tradeTypeFilter}
            onChange={(e) => setTradeTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">전체</option>
            <option value="전세">전세만</option>
            <option value="월세">월세만</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          총 {data.totalCount}건
        </div>
      </div>

      {/* 평형별 필터 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">평형별 선택 (차트 필터):</div>
        <div className="flex flex-wrap gap-2">
          {Array.from(areaGroups.keys()).map((areaKey, index) => {
            const pyeongNum = areaKey.replace('평', '');
            const isSelected = chartAreaFilters.has(pyeongNum);
            const color = CHART_COLORS[index % CHART_COLORS.length];

            return (
              <label
                key={areaKey}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-2' : 'bg-gray-50 border'
                }`}
                style={{
                  borderColor: isSelected ? color : '#e5e7eb'
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const newFilters = new Set(chartAreaFilters);
                    if (e.target.checked) {
                      newFilters.add(pyeongNum);
                    } else {
                      newFilters.delete(pyeongNum);
                    }
                    setChartAreaFilters(newFilters);
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium">{areaKey}</span>
                <span className="text-xs text-gray-500">({areaGroups.get(areaKey)!.length}건)</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 차트 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">전월세 보증금 추이 (평형별)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => `${Math.round(value / 10000)}억`}
              style={{ fontSize: '12px' }}
              domain={yAxisDomain}
            />
            <Tooltip
              formatter={(value: any) => {
                const eok = Math.floor(value / 100000000);
                const man = Math.floor((value % 100000000) / 10000);
                return eok > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${man.toLocaleString()}만원`;
              }}
            />
            <Legend />
            {Array.from(areaGroups.keys()).map((areaKey, index) => {
              const pyeongNum = areaKey.replace('평', '');
              if (!chartAreaFilters.has(pyeongNum)) return null;

              const color = CHART_COLORS[index % CHART_COLORS.length];
              return (
                <React.Fragment key={areaKey}>
                  <Area
                    type="monotone"
                    dataKey={`${areaKey}_avg`}
                    fill={color}
                    fillOpacity={0.1}
                    stroke="none"
                    name={`${areaKey} 평균`}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${areaKey}_avg`}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={`${areaKey} 평균`}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${areaKey}_trend`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                    name={`${areaKey} 추세`}
                    strokeOpacity={0.6}
                  />
                </React.Fragment>
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 거래 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">전월세 거래 목록</h3>
          <div className="flex items-center gap-2 text-sm">
            <label>페이지당:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                      setSortDirection('desc');
                    }
                  }}
                >
                  계약일자 {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거래유형
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'area') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('area');
                      setSortDirection('desc');
                    }
                  }}
                >
                  면적 {sortField === 'area' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (sortField === 'deposit') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('deposit');
                      setSortDirection('desc');
                    }
                  }}
                >
                  보증금 {sortField === 'deposit' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  월세
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  층
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  계약구분
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.dealDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.tradeType === '전세' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.tradeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {Math.floor(item.exclusiveArea / 3.3058)}평 ({item.exclusiveArea.toFixed(2)}㎡)
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {item.depositFormatted}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.monthlyRentFormatted || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.floor}층
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className="text-xs text-gray-500">{item.contractType}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
