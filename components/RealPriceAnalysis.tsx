"use client";

import React, { useEffect, useState } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';

// 통합 거래 아이템 (매매 + 전월세)
interface UnifiedTradeItem {
  dealDate: string;
  dong: string;
  jibun: string;
  apartmentName: string;
  exclusiveArea: number;
  floor: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;

  // 거래 유형별 데이터
  tradeType: '매매' | '전세' | '월세';

  // 매매 전용 필드
  dealPrice?: number; // 매매가 (원)
  dealPriceFormatted?: string;
  cancelDealType?: string;

  // 전월세 전용 필드
  deposit?: number; // 보증금 (원)
  monthlyRent?: number; // 월세 (원)
  depositFormatted?: string;
  monthlyRentFormatted?: string;
  contractType?: string; // 신규/갱신
  dealMethod?: string; // 직거래/중개거래
}

interface ComplexInfo {
  complexNo: string;
  complexName: string;
  realPriceAptName: string | null;
  beopjungdong: string | null;
  lawdCd: string;
}

interface RealPriceAnalysisProps {
  complexNo: string;
}

export default function RealPriceAnalysis({ complexNo }: RealPriceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeItems, setTradeItems] = useState<UnifiedTradeItem[]>([]);
  const [complexInfo, setComplexInfo] = useState<ComplexInfo | null>(null);
  const [months, setMonths] = useState(6);

  // 필터 상태
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'all' | '매매' | '전세' | '월세'>('all');
  const [chartAreaFilters, setChartAreaFilters] = useState<Set<string>>(new Set());

  // 테이블 상태
  const [sortField, setSortField] = useState<'date' | 'price' | 'area'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCancelledDeals, setShowCancelledDeals] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [complexNo, months]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 매매 + 전월세 데이터 동시 조회
      const [saleRes, rentRes] = await Promise.all([
        fetch(`/api/real-price/complex?complexNo=${complexNo}&months=${months}`),
        fetch(`/api/rent-price/complex?complexNo=${complexNo}&months=${months}`)
      ]);

      const [saleData, rentData] = await Promise.all([
        saleRes.json(),
        rentRes.json()
      ]);

      // 데이터 통합
      const unified: UnifiedTradeItem[] = [];

      // 매매 데이터 변환
      if (saleData.success && saleData.data.items) {
        saleData.data.items.forEach((item: any) => {
          unified.push({
            dealDate: item.dealDate,
            dong: item.dong,
            jibun: item.jibun,
            apartmentName: item.apartmentName,
            exclusiveArea: item.exclusiveArea,
            floor: item.floor,
            buildYear: item.buildYear,
            dealYear: item.dealYear,
            dealMonth: item.dealMonth,
            dealDay: item.dealDay,
            tradeType: '매매',
            dealPrice: item.dealPrice,
            dealPriceFormatted: item.dealPriceFormatted,
            cancelDealType: item.cancelDealType,
          });
        });

        setComplexInfo(saleData.data.complex);
      }

      // 전월세 데이터 변환
      if (rentData.success && rentData.data.items) {
        rentData.data.items.forEach((item: any) => {
          unified.push({
            dealDate: item.dealDate,
            dong: item.dong,
            jibun: item.jibun,
            apartmentName: item.apartmentName,
            exclusiveArea: item.exclusiveArea,
            floor: item.floor,
            buildYear: item.buildYear,
            dealYear: item.dealYear,
            dealMonth: item.dealMonth,
            dealDay: item.dealDay,
            tradeType: item.tradeType, // '전세' or '월세'
            deposit: item.deposit,
            monthlyRent: item.monthlyRent,
            depositFormatted: item.depositFormatted,
            monthlyRentFormatted: item.monthlyRentFormatted,
            contractType: item.contractType,
            dealMethod: item.dealMethod,
          });
        });

        if (!complexInfo) {
          setComplexInfo(rentData.data.complex);
        }
      }

      // 날짜순 정렬
      unified.sort((a, b) => new Date(b.dealDate).getTime() - new Date(a.dealDate).getTime());
      setTradeItems(unified);

      // 초기 차트 필터 설정 (모든 평형 선택)
      if (unified.length > 0) {
        const areas = new Set(
          unified.map(item => Math.floor(item.exclusiveArea / 3.3058).toString())
        );
        setChartAreaFilters(areas);
      }

      // 에러 처리
      if (!saleData.success && !rentData.success) {
        setError('실거래가 데이터를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 평형별 그룹화
  const getAreaGroups = (): Map<string, UnifiedTradeItem[]> => {
    const groups = new Map<string, UnifiedTradeItem[]>();

    tradeItems.forEach(item => {
      // 거래유형 필터 적용
      if (tradeTypeFilter !== 'all' && item.tradeType !== tradeTypeFilter) {
        return;
      }

      const pyeong = Math.floor(item.exclusiveArea / 3.3058);
      const key = `${pyeong}평`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    return groups;
  };

  // 차트 데이터 생성 (매매 데이터만 사용)
  const generateChartData = () => {
    // 차트용 매매 데이터만 그룹화 (필터 무시)
    const saleOnlyGroups = new Map<string, UnifiedTradeItem[]>();
    tradeItems.forEach(item => {
      // 매매 거래만 차트에 포함
      if (item.tradeType !== '매매') {
        return;
      }

      const pyeong = Math.floor(item.exclusiveArea / 3.3058);
      const key = `${pyeong}평`;

      if (!saleOnlyGroups.has(key)) {
        saleOnlyGroups.set(key, []);
      }
      saleOnlyGroups.get(key)!.push(item);
    });

    const monthMap = new Map<string, any>();

    // 최근 N개월 초기화
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const key = `${year}${month}`;
      monthMap.set(key, { month: `${year}-${month}`, count: 0 });
    }

    // 평형별 데이터 집계 (매매 데이터만)
    saleOnlyGroups.forEach((items, areaKey) => {
      items.forEach(item => {

        const yearMonth = `${item.dealYear}${String(item.dealMonth).padStart(2, '0')}`;
        if (monthMap.has(yearMonth)) {
          const monthData = monthMap.get(yearMonth);

          // 매매가 데이터 수집
          const price = item.dealPrice;
          if (price) {
            if (!monthData[`${areaKey}_data`]) {
              monthData[`${areaKey}_data`] = [];
            }
            monthData[`${areaKey}_data`].push(price);
            monthData.count++;
          }
        }
      });
    });

    // 평형별 평균 계산
    monthMap.forEach((monthData, month) => {
      saleOnlyGroups.forEach((_, areaKey) => {
        const prices = monthData[`${areaKey}_data`];
        if (prices && prices.length > 0) {
          monthData[`${areaKey}_avg`] = Math.round(prices.reduce((sum: number, val: number) => sum + val, 0) / prices.length);
        }
        delete monthData[`${areaKey}_data`];
      });
    });

    const chartData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // 추세선 계산
    const trendlines = new Map<string, { slope: number; intercept: number }>();
    saleOnlyGroups.forEach((items, areaKey) => {
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

  // 필터링된 아이템
  const getFilteredItems = (): UnifiedTradeItem[] => {
    return tradeItems.filter(item => {
      // 거래유형 필터
      if (tradeTypeFilter !== 'all' && item.tradeType !== tradeTypeFilter) {
        return false;
      }
      // 취소 거래 필터 (매매만 해당)
      if (!showCancelledDeals && item.cancelDealType) {
        return false;
      }
      return true;
    });
  };

  // 정렬된 아이템
  const getSortedItems = (): UnifiedTradeItem[] => {
    const filtered = getFilteredItems();

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        comparison = new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime();
      } else if (sortField === 'price') {
        const priceA = a.tradeType === '매매' ? (a.dealPrice || 0) : (a.deposit || 0);
        const priceB = b.tradeType === '매매' ? (b.dealPrice || 0) : (b.deposit || 0);
        comparison = priceA - priceB;
      } else if (sortField === 'area') {
        comparison = a.exclusiveArea - b.exclusiveArea;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const paginatedItems = getSortedItems().slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(getSortedItems().length / itemsPerPage);

  // Y축 가격 포맷팅 (가독성 좋은 단위로 표시)
  const formatYAxisPrice = (value: number): string => {
    const eok = Math.floor(value / 100000000); // 억
    const man = Math.floor((value % 100000000) / 10000); // 만

    if (eok > 0 && man > 0) {
      // 5000만원 단위로 반올림
      if (man >= 5000) {
        return `${eok + 0.5}억`;
      } else if (man >= 2500) {
        return `${eok}.5억`;
      } else {
        return `${eok}억`;
      }
    } else if (eok > 0) {
      return `${eok}억`;
    } else if (man >= 1000) {
      // 1000만원 이상: 1000만원 단위
      return `${Math.round(man / 1000)}천만`;
    } else if (man >= 100) {
      // 100만원 이상: 100만원 단위
      return `${Math.round(man / 100)}백만`;
    } else {
      return `${man}만`;
    }
  };

  const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const chartData = generateChartData();
  const areaGroups = getAreaGroups();

  const selectedAreas = new Set(
    Array.from(areaGroups.keys()).filter(key => chartAreaFilters.has(key.replace('평', '')))
  );

  // Y축 도메인 및 ticks 계산 (가독성 좋은 숫자로)
  const selectedPrices: number[] = [];
  chartData.forEach(point => {
    selectedAreas.forEach(areaKey => {
      if (point[`${areaKey}_avg`] !== undefined) {
        selectedPrices.push(point[`${areaKey}_avg`]);
      }
    });
  });

  // 가독성 좋은 tick 간격 계산
  const calculateNiceTicks = (min: number, max: number): number[] => {
    const range = max - min;

    // 적절한 tick 간격 결정
    let tickInterval: number;
    if (range >= 1000000000) {
      // 10억 이상: 1억 또는 5억 단위
      tickInterval = range > 5000000000 ? 500000000 : 100000000;
    } else if (range >= 500000000) {
      // 5억 ~ 10억: 5000만원 단위
      tickInterval = 50000000;
    } else if (range >= 100000000) {
      // 1억 ~ 5억: 1000만원 단위
      tickInterval = 10000000;
    } else if (range >= 50000000) {
      // 5000만 ~ 1억: 500만원 단위
      tickInterval = 5000000;
    } else {
      // 5000만 미만: 1000만원 또는 500만원 단위
      tickInterval = range > 20000000 ? 5000000 : 1000000;
    }

    // tick 시작값 (간격으로 내림)
    const tickStart = Math.floor(min / tickInterval) * tickInterval;
    // tick 끝값 (간격으로 올림)
    const tickEnd = Math.ceil(max / tickInterval) * tickInterval;

    const ticks: number[] = [];
    for (let tick = tickStart; tick <= tickEnd; tick += tickInterval) {
      ticks.push(tick);
    }

    return ticks;
  };

  let yAxisDomain: [number, number] = [0, 100000000]; // 기본값: 0 ~ 1억
  let yAxisTicks: number[] = [0, 50000000, 100000000];

  if (selectedPrices.length > 0) {
    const minPrice = Math.min(...selectedPrices);
    const maxPrice = Math.max(...selectedPrices);

    // 여유 공간 추가 (위아래 10%)
    const padding = (maxPrice - minPrice) * 0.1;
    const domainMin = minPrice - padding;
    const domainMax = maxPrice + padding;

    yAxisDomain = [domainMin, domainMax];
    yAxisTicks = calculateNiceTicks(domainMin, domainMax);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-gray-500 dark:text-gray-400">실거래가 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (tradeItems.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">최근 {months}개월 간 실거래가 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 컨트롤 패널 */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">조회 기간:</label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={3}>3개월</option>
            <option value={6}>6개월</option>
            <option value={12}>12개월</option>
            <option value={24}>24개월</option>
            <option value={36}>36개월</option>
          </select>

          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-4">거래유형:</label>
          <select
            value={tradeTypeFilter}
            onChange={(e) => {
              setTradeTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">전체</option>
            <option value="매매">매매</option>
            <option value="전세">전세</option>
            <option value="월세">월세</option>
          </select>

          {tradeTypeFilter === 'all' || tradeTypeFilter === '매매' ? (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ml-4">
              <input
                type="checkbox"
                checked={showCancelledDeals}
                onChange={(e) => setShowCancelledDeals(e.target.checked)}
                className="rounded"
              />
              <span>취소 거래 표시</span>
            </label>
          ) : null}
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          총 {tradeItems.length}건
        </div>
      </div>

      {/* 평형별 필터 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">평형별 선택 (차트 필터):</div>
        <div className="flex flex-wrap gap-2">
          {Array.from(areaGroups.keys()).map((areaKey, index) => {
            const pyeongNum = areaKey.replace('평', '');
            const isSelected = chartAreaFilters.has(pyeongNum);
            const color = CHART_COLORS[index % CHART_COLORS.length];

            return (
              <label
                key={areaKey}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-2' : 'bg-gray-50 dark:bg-gray-700 border'
                }`}
                style={{
                  borderColor: isSelected ? color : undefined
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{areaKey}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({areaGroups.get(areaKey)!.length}건)</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 차트 */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          매매 실거래가 추이 (평형별)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={formatYAxisPrice}
              style={{ fontSize: '12px' }}
              domain={yAxisDomain}
              ticks={yAxisTicks}
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">거래 목록</h3>
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <label>페이지당:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  거래유형
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
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
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    if (sortField === 'price') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('price');
                      setSortDirection('desc');
                    }
                  }}
                >
                  가격 {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  층
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  비고
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedItems.map((item, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${item.cancelDealType ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.dealDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.tradeType === '매매' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' :
                      item.tradeType === '전세' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {item.tradeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {Math.floor(item.exclusiveArea / 3.3058)}평 ({item.exclusiveArea.toFixed(2)}㎡)
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.tradeType === '매매' ? (
                      <span>{item.dealPriceFormatted}</span>
                    ) : (
                      <div>
                        <div>보증금: {item.depositFormatted}</div>
                        {item.monthlyRent && item.monthlyRent > 0 && item.monthlyRentFormatted && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">월세: {item.monthlyRentFormatted}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {item.floor}층
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {item.cancelDealType && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">{item.cancelDealType}</span>
                    )}
                    {item.contractType && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.contractType}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              이전
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
