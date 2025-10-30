"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';

interface RealPriceItem {
  dealDate: string;
  dong: string;
  jibun: string;
  apartmentName: string;
  exclusiveArea: number;
  supplyPyeong: number | null; // 공급평형 (매물정보 기준)
  dealAmount: string; // 문자열 (원 단위)
  dealPrice: number; // 숫자 (원 단위)
  dealPriceFormatted: string; // 포맷된 문자열
  floor: number;
  buildYear: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  cancelDealType?: string;
}

interface AreaMapping {
  exclusivePyeong: number; // 전용면적 평형
  supplyPyeong: number; // 공급면적 평형
  supplyArea: number; // 공급면적 ㎡
}

interface ComplexInfo {
  complexNo: string;
  complexName: string;
  realPriceAptName: string | null; // 수동 매핑 아파트명
  beopjungdong: string | null;
  lawdCd: string;
}

interface RealPriceData {
  complex: ComplexInfo;
  areaMapping: AreaMapping[]; // 면적 매핑 정보
  months: string[];
  items: RealPriceItem[];
  totalCount: number;
}

interface AreaStats {
  areaType: string;
  exclusiveArea: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  transactionCount: number;
  items: RealPriceItem[];
}

interface ChartData {
  month: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  count: number;
}

interface PyeongChartData {
  month: string;
  [pyeong: string]: string | number; // 동적 평형별 가격 필드
}

interface RealPriceAnalysisProps {
  complexNo: string;
}

export default function RealPriceAnalysis({ complexNo }: RealPriceAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RealPriceData | null>(null);
  const [areaStats, setAreaStats] = useState<AreaStats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [pyeongChartData, setPyeongChartData] = useState<PyeongChartData[]>([]);
  const [months, setMonths] = useState(6);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [chartViewMode, setChartViewMode] = useState<'overall' | 'byPyeong'>('byPyeong'); // 차트 보기 모드
  const [chartAreaFilters, setChartAreaFilters] = useState<Set<string>>(new Set()); // 차트 평형 필터
  const [sortField, setSortField] = useState<'date' | 'price' | 'area'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showCancelledDeals, setShowCancelledDeals] = useState(true); // 취소 거래 표시 여부
  const [isCrawling, setIsCrawling] = useState(false); // 크롤링 진행 상태

  useEffect(() => {
    fetchRealPriceData();
  }, [complexNo, months]);

  const fetchRealPriceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/real-price/complex?complexNo=${complexNo}&months=${months}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        processData(result.data);
      } else {
        setError(result.error || result.message || '실거래가 데이터를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to fetch real price data:', error);
      setError('실거래가 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    try {
      setIsCrawling(true);

      const response = await fetch('/api/crawler/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complexNos: [complexNo],
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('크롤링이 시작되었습니다. 완료 후 자동으로 법정동 정보가 수집됩니다.');
        // 크롤링이 완료될 때까지 대기 후 다시 시도
        setTimeout(() => {
          fetchRealPriceData();
        }, 10000); // 10초 후 자동으로 다시 시도
      } else {
        alert(`크롤링 실패: ${result.error || result.message}`);
      }
    } catch (error: any) {
      console.error('Failed to start crawling:', error);
      alert('크롤링 시작 중 오류가 발생했습니다.');
    } finally {
      setIsCrawling(false);
    }
  };

  const processData = (rawData: RealPriceData) => {
    if (!rawData.items || rawData.items.length === 0) {
      setAreaStats([]);
      setChartData([]);
      return;
    }

    // 평형별 통계 계산 (공급평형 기준으로 그룹핑)
    const areaGroups: { [key: string]: RealPriceItem[] } = {};
    rawData.items.forEach(item => {
      // 공급평형이 있으면 공급평형으로, 없으면 전용평형으로 그룹핑
      const exclusivePyeong = Math.floor(item.exclusiveArea / 3.3058);
      const groupKey = item.supplyPyeong !== null ? `${item.supplyPyeong}` : `${exclusivePyeong}`;

      if (!areaGroups[groupKey]) {
        areaGroups[groupKey] = [];
      }
      areaGroups[groupKey].push(item);
    });

    const statsArray: AreaStats[] = Object.entries(areaGroups).map(([pyeong, items]) => {
      // dealPrice는 이미 원(won) 단위 숫자
      const prices = items.map(item => item.dealPrice);
      const avgArea = items.reduce((sum, item) => sum + item.exclusiveArea, 0) / items.length;
      const avgExclusivePyeong = Math.round(avgArea / 3.3058);

      // 공급평형이 있는지 확인
      const hasSupplyPyeong = items[0].supplyPyeong !== null;
      const displayPyeong = hasSupplyPyeong ? items[0].supplyPyeong : parseInt(pyeong);

      return {
        areaType: hasSupplyPyeong
          ? `${displayPyeong}평형 (전용 ${avgExclusivePyeong}평)`
          : `${pyeong}평형`,
        exclusiveArea: avgArea,
        avgPrice: Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length),
        maxPrice: Math.max(...prices),
        minPrice: Math.min(...prices),
        transactionCount: items.length,
        items,
      };
    }).sort((a, b) => {
      const aNum = parseInt(a.areaType);
      const bNum = parseInt(b.areaType);
      return aNum - bNum;
    });

    setAreaStats(statsArray);

    // 월별 + 평형별 차트 데이터 계산
    const monthlyPyeongGroups: { [monthKey: string]: { [pyeong: string]: number[] } } = {};

    rawData.items.forEach(item => {
      const monthKey = `${item.dealYear}.${String(item.dealMonth).padStart(2, '0')}`;
      const exclusivePyeong = Math.floor(item.exclusiveArea / 3.3058);
      const pyeongKey = item.supplyPyeong !== null ? `${item.supplyPyeong}` : `${exclusivePyeong}`;

      if (!monthlyPyeongGroups[monthKey]) {
        monthlyPyeongGroups[monthKey] = {};
      }
      if (!monthlyPyeongGroups[monthKey][pyeongKey]) {
        monthlyPyeongGroups[monthKey][pyeongKey] = [];
      }
      monthlyPyeongGroups[monthKey][pyeongKey].push(item.dealPrice);
    });

    // 월별 전체 평균 (실제 거래가 있는 월만 포함)
    const chartArray: ChartData[] = Object.entries(monthlyPyeongGroups)
      .filter(([month, pyeongGroups]) => {
        // 해당 월에 거래가 있는지 확인
        const allPrices = Object.values(pyeongGroups).flat();
        return allPrices.length > 0;
      })
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, pyeongGroups]) => {
        const allPrices = Object.values(pyeongGroups).flat();
        return {
          month,
          avgPrice: Math.floor(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
          maxPrice: Math.max(...allPrices),
          minPrice: Math.min(...allPrices),
          count: allPrices.length,
        };
      });

    // 평형별 월별 차트 데이터 (평형별로 분리된 라인, 거래 없는 월은 undefined)
    const pyeongChartArray: PyeongChartData[] = Object.entries(monthlyPyeongGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, pyeongGroups]) => {
        const monthData: PyeongChartData = { month };

        Object.entries(pyeongGroups).forEach(([pyeong, prices]) => {
          if (prices.length > 0) {
            const avgPrice = Math.floor(prices.reduce((a, b) => a + b, 0) / prices.length);
            monthData[`${pyeong}평`] = avgPrice;
          }
          // prices.length === 0 인 경우 undefined로 남겨둠 (선이 끊어짐)
        });

        return monthData;
      });

    setChartData(chartArray);
    setPyeongChartData(pyeongChartArray);
  };

  const formatPrice = (price: number) => {
    const eok = Math.floor(price / 100000000);
    const man = Math.floor((price % 100000000) / 10000);
    if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
    if (eok > 0) return `${eok}억원`;
    return `${man.toLocaleString()}만원`;
  };

  const formatChartPrice = (price: number) => {
    return (price / 100000000).toFixed(1) + '억';
  };

  // 필터링된 거래 내역
  const getFilteredTransactions = () => {
    if (!data) return [];

    let filtered = data.items;

    // 취소 거래 필터
    if (!showCancelledDeals) {
      filtered = filtered.filter(item => !item.cancelDealType || item.cancelDealType === '');
    }

    // 평형 필터 (공급평형 기준)
    if (selectedArea !== 'all') {
      const targetPyeong = parseInt(selectedArea);
      filtered = filtered.filter(item => {
        // 공급평형이 있으면 공급평형으로, 없으면 전용평형으로 비교
        const pyeong = item.supplyPyeong !== null
          ? item.supplyPyeong
          : Math.floor(item.exclusiveArea / 3.3058);
        return pyeong === targetPyeong;
      });
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case 'date':
          const dateA = new Date(a.dealYear, a.dealMonth - 1, a.dealDay);
          const dateB = new Date(b.dealYear, b.dealMonth - 1, b.dealDay);
          compareResult = dateA.getTime() - dateB.getTime();
          break;
        case 'price':
          // dealPrice는 원 단위 숫자
          compareResult = a.dealPrice - b.dealPrice;
          break;
        case 'area':
          compareResult = a.exclusiveArea - b.exclusiveArea;
          break;
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  };

  const handleSort = (field: 'date' | 'price' | 'area') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
  };

  const handleAreaFilterChange = (area: string) => {
    setSelectedArea(area);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  const handleDownloadCSV = () => {
    if (!data) return;

    const transactions = getFilteredTransactions();

    // CSV 헤더
    const headers = ['거래일자', '평형', '전용면적(㎡)', '거래가격', '층', '동', '지번', '건축년도', '상태'];

    // CSV 데이터
    const rows = transactions.map(transaction => {
      const exclusivePyeong = Math.round(transaction.exclusiveArea / 3.3058 * 10) / 10;
      const exclusivePyeongInt = Math.floor(exclusivePyeong);
      const isCancelled = transaction.cancelDealType && transaction.cancelDealType !== '';

      // 평형 표시: 공급평형이 있으면 함께 표시
      const pyeongDisplay = transaction.supplyPyeong !== null
        ? `${transaction.supplyPyeong}평형 (전용 ${exclusivePyeongInt}평)`
        : `전용 ${exclusivePyeongInt}평`;

      return [
        `${transaction.dealYear}.${String(transaction.dealMonth).padStart(2, '0')}.${String(transaction.dealDay).padStart(2, '0')}`,
        pyeongDisplay,
        transaction.exclusiveArea.toFixed(1),
        transaction.dealPriceFormatted,
        `${transaction.floor}층`,
        transaction.dong,
        transaction.jibun,
        `${transaction.buildYear}년`,
        isCancelled ? '거래취소' : '정상'
      ];
    });

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `실거래가_${data.complex.complexName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">실거래가 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isBeopjungdongError = error.includes('beopjungdong') || error.includes('법정동');

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-6xl mb-4">{isBeopjungdongError ? '📍' : '⚠️'}</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {isBeopjungdongError ? '법정동 정보가 필요합니다' : '실거래가 데이터 조회 실패'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>

          {isBeopjungdongError && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6 text-left">
              <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                <span>💡</span>
                <span>해결 방법</span>
              </h4>
              <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex gap-3">
                  <span className="font-bold">1.</span>
                  <div>
                    <strong>단지 목록으로 돌아가기</strong>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      단지 목록에서 해당 단지를 찾아 <strong>"크롤링"</strong> 버튼을 클릭하세요.
                      크롤링 시 자동으로 법정동 정보가 수집됩니다.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold">2.</span>
                  <div>
                    <strong>또는 매물 수집 후 다시 시도</strong>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      상단의 <strong>"🔄 매물 새로고침"</strong> 버튼을 클릭하여 매물 수집 후
                      실거래가 분석 탭을 다시 열어보세요.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {isBeopjungdongError && (
              <button
                onClick={handleCrawl}
                disabled={isCrawling}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-semibold shadow-lg disabled:cursor-not-allowed"
              >
                {isCrawling ? '🔄 크롤링 중...' : '🚀 지금 크롤링하기'}
              </button>
            )}
            <button
              onClick={fetchRealPriceData}
              disabled={isCrawling}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors font-semibold shadow-lg disabled:cursor-not-allowed"
            >
              🔄 다시 시도
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors font-semibold"
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <div className="text-7xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            실거래가 데이터 없음
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            최근 {months}개월간 실거래 내역이 없습니다.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            다른 기간을 선택하거나 법정동 정보를 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* 기간 선택 헤더 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              📊 실거래가 분석
            </h3>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.complex.complexName} · {data.complex.beopjungdong || '법정동 정보 없음'}
              </p>
              {data.complex.realPriceAptName && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                  🔧 수동 매핑: {data.complex.realPriceAptName}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 실거래가는 전용면적 기준입니다. 매물정보의 공급면적과 다를 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[3, 6, 9, 12, 24, 36].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  months === m
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                }`}
              >
                {m >= 12 ? `${m / 12}년` : `${m}개월`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 평형별 실거래가 통계 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📏</span>
          <span>평형별 실거래가 통계</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            (최근 {months}개월)
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {areaStats.map((stat) => (
            <div
              key={stat.areaType}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleAreaFilterChange(stat.areaType.replace('평형', ''))}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {stat.areaType}
                </h4>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.exclusiveArea.toFixed(1)}㎡
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">평균가</span>
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                    {formatPrice(stat.avgPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">최고가</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {formatPrice(stat.maxPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">최저가</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {formatPrice(stat.minPrice)}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">거래건수</span>
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📈</span>
            <span>월별 실거래가 추이</span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setChartViewMode('byPyeong')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartViewMode === 'byPyeong'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              평형별 분석
            </button>
            <button
              onClick={() => setChartViewMode('overall')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                chartViewMode === 'overall'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              전체 평균
            </button>
          </div>
        </div>
        {chartViewMode === 'overall' ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6b7280', fontSize: 11, angle: -45 }}
                stroke="#9ca3af"
                height={80}
                interval="preserveStartEnd"
                textAnchor="end"
              />
              <YAxis
                tickFormatter={formatChartPrice}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.9),
                  (dataMax: number) => Math.ceil(dataMax * 1.1)
                ]}
              />
              <Tooltip
                formatter={(value: any) => formatPrice(value)}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                labelFormatter={(label) => `${label} (${chartData.find(d => d.month === label)?.count || 0}건)`}
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
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
                name="avgPrice"
              />
              <Line
                type="monotone"
                dataKey="maxPrice"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#ef4444', r: 4 }}
                name="maxPrice"
              />
              <Line
                type="monotone"
                dataKey="minPrice"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10b981', r: 4 }}
                name="minPrice"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          (() => {
            // 평형별 그룹핑 (공급평형 기준)
            const areaGroups = new Map<string, RealPriceItem[]>();
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

            if (!data) return null;

            data.items.forEach(item => {
              const exclusivePyeong = Math.floor(item.exclusiveArea / 3.3058);
              const groupKey = item.supplyPyeong !== null ? `${item.supplyPyeong}평` : `${exclusivePyeong}평`;

              if (!areaGroups.has(groupKey)) {
                areaGroups.set(groupKey, []);
              }
              areaGroups.get(groupKey)!.push(item);
            });

            // 차트 필터 초기화 (처음 로드 시)
            if (chartAreaFilters.size === 0) {
              setChartAreaFilters(new Set(Array.from(areaGroups.keys())));
            }

            const selectedAreas = chartAreaFilters.size > 0 ? chartAreaFilters : new Set(Array.from(areaGroups.keys()));

            const toggleArea = (areaKey: string) => {
              setChartAreaFilters(prev => {
                const newSet = new Set(prev);
                if (newSet.has(areaKey)) {
                  newSet.delete(areaKey);
                } else {
                  newSet.add(areaKey);
                }
                return newSet;
              });
            };

            // 선형 회귀 함수 (추세선 계산)
            const calculateTrendline = (dataPoints: { x: number; y: number }[]) => {
              const n = dataPoints.length;
              if (n === 0) return null;

              let sumX = 0;
              let sumY = 0;
              let sumXY = 0;
              let sumXX = 0;

              dataPoints.forEach(point => {
                sumX += point.x;
                sumY += point.y;
                sumXY += point.x * point.y;
                sumXX += point.x * point.x;
              });

              const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
              const intercept = (sumY - slope * sumX) / n;

              return { slope, intercept };
            };

            // 날짜별로 데이터 정리
            const allDates = [...new Set(data.items.map(item => item.dealDate))].sort();
            const chartData: any[] = [];

            allDates.forEach((date, dateIndex) => {
              const dataPoint: any = { date };

              Array.from(areaGroups.entries()).forEach(([areaKey, items]) => {
                const itemsOnDate = items.filter(item => item.dealDate === date);

                if (itemsOnDate.length > 0) {
                  const prices = itemsOnDate.map(item => item.dealPrice);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

                  dataPoint[`${areaKey}_min`] = min;
                  dataPoint[`${areaKey}_max`] = max;
                  dataPoint[`${areaKey}_range`] = max - min;
                  dataPoint[`${areaKey}_avg`] = avg;
                  dataPoint[`${areaKey}_points`] = prices;
                }
              });

              chartData.push(dataPoint);
            });

            // 평형별 추세선 계산
            const trendlines = new Map<string, { slope: number; intercept: number }>();
            Array.from(areaGroups.entries()).forEach(([areaKey, items]) => {
              const dataPoints: { x: number; y: number }[] = [];

              chartData.forEach((point, index) => {
                if (point[`${areaKey}_avg`] !== undefined) {
                  dataPoints.push({
                    x: index,
                    y: point[`${areaKey}_avg`]
                  });
                }
              });

              const trendline = calculateTrendline(dataPoints);
              if (trendline) {
                trendlines.set(areaKey, trendline);
              }
            });

            // 차트 데이터에 추세선 값 추가
            chartData.forEach((point, index) => {
              Array.from(trendlines.entries()).forEach(([areaKey, trendline]) => {
                point[`${areaKey}_trend`] = trendline.slope * index + trendline.intercept;
              });
            });

            // Y축 범위 계산: 선택된 평형만의 가격 범위 (여유 15% 추가)
            const selectedPrices: number[] = [];
            Array.from(areaGroups.entries())
              .filter(([areaKey]) => selectedAreas.has(areaKey))
              .forEach(([areaKey, items]) => {
                items.forEach(item => {
                  selectedPrices.push(item.dealPrice);
                });
              });

            // domain을 함수로 정의하여 recharts의 자동 계산 우회
            const yAxisDomain: [(dataMin: number) => number, (dataMax: number) => number] = [
              (dataMin: number) => {
                if (selectedPrices.length === 0) return dataMin;
                const minPrice = Math.min(...selectedPrices);
                const maxPrice = Math.max(...selectedPrices);
                const priceRange = maxPrice - minPrice;
                const priceMargin = Math.max(priceRange * 0.15, 5000000); // 최소 500만원 여유
                return Math.floor(minPrice - priceMargin);
              },
              (dataMax: number) => {
                if (selectedPrices.length === 0) return dataMax;
                const minPrice = Math.min(...selectedPrices);
                const maxPrice = Math.max(...selectedPrices);
                const priceRange = maxPrice - minPrice;
                const priceMargin = Math.max(priceRange * 0.15, 5000000); // 최소 500만원 여유
                return Math.ceil(maxPrice + priceMargin);
              }
            ];

            return (
              <>
                {/* 평형 선택 체크박스 */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      표시할 평형 선택:
                    </span>
                    <button
                      onClick={() => setChartAreaFilters(new Set(Array.from(areaGroups.keys())))}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={() => setChartAreaFilters(new Set())}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      전체 해제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(areaGroups.entries()).map(([areaKey, items], index) => {
                      const color = colors[index % colors.length];
                      const isSelected = selectedAreas.has(areaKey);

                      return (
                        <label
                          key={areaKey}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-white dark:bg-gray-800 border-2 shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-800 border-2 border-transparent'
                          }`}
                          style={{
                            borderColor: isSelected ? color : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArea(areaKey)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: color }}
                          />
                          <span
                            className="text-sm font-medium"
                            style={{ color: isSelected ? color : undefined }}
                          >
                            {areaKey} ({items.length}건)
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    stroke="#9ca3af"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickFormatter={formatChartPrice}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    stroke="#9ca3af"
                    label={{ value: '가격', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    domain={yAxisDomain}
                    allowDataOverflow={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(200, 200, 200, 0.2)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;

                      const data = payload[0].payload;

                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold text-sm mb-2">{data.date}</p>
                          {Array.from(areaGroups.keys())
                            .filter(areaKey => selectedAreas.has(areaKey))
                            .map((areaKey, index) => {
                              const points = data[`${areaKey}_points`];
                              if (!points || points.length === 0) return null;

                              return (
                                <div
                                  key={areaKey}
                                  className="text-xs mb-1"
                                  style={{ color: colors[Array.from(areaGroups.keys()).indexOf(areaKey) % colors.length] }}
                                >
                                  <strong>{areaKey}</strong>: {points.length}건
                                  <br />
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {formatPrice(Math.min(...points))} ~ {formatPrice(Math.max(...points))}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(value) => value}
                  />

                  {/* 각 평형별로 영역(Area) + 선(Line) 그리기 */}
                  {Array.from(areaGroups.entries())
                    .filter(([areaKey]) => selectedAreas.has(areaKey))
                    .map(([areaKey, items], index) => {
                      const originalIndex = Array.from(areaGroups.keys()).indexOf(areaKey);
                      const color = colors[originalIndex % colors.length];

                      return (
                        <React.Fragment key={areaKey}>
                        {/* 최소~최대 범위 영역 */}
                        <Area
                          type="monotone"
                          dataKey={`${areaKey}_min`}
                          stackId={areaKey}
                          stroke="none"
                          fill="transparent"
                          name={`${areaKey} 최소`}
                        />
                        <Area
                          type="monotone"
                          dataKey={`${areaKey}_range`}
                          stackId={areaKey}
                          stroke="none"
                          fill={color}
                          fillOpacity={0.15}
                          name={`${areaKey} 범위`}
                        />

                        {/* 최대값 점선 */}
                        <Line
                          type="monotone"
                          dataKey={`${areaKey}_max`}
                          stroke={color}
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name={`${areaKey} 최대`}
                        />

                        {/* 최소값 점선 */}
                        <Line
                          type="monotone"
                          dataKey={`${areaKey}_min`}
                          stroke={color}
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          dot={false}
                          name={`${areaKey} 최소`}
                        />

                        {/* 평균 실선 */}
                        <Line
                          type="monotone"
                          dataKey={`${areaKey}_avg`}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'white' }}
                          activeDot={{ r: 6 }}
                          name={`${areaKey} 평균`}
                        />

                        {/* 추세선 */}
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
              </>
            );
          })()
        )}

        {chartViewMode === 'byPyeong' && (
          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              💡 <strong>차트 사용법:</strong><br />
              • 각 평형별로 색상이 다릅니다<br />
              • <span className="font-semibold">굵은 실선</span>: 평균 가격 | <span className="font-semibold">가는 점선</span>: 최대/최소 | <span className="font-semibold">영역</span>: 가격 범위 | <span className="font-semibold">중간 점선</span>: 추세선<br />
              • <strong>추세선</strong>은 선형 회귀를 통해 전체적인 가격 상승/하락 추세를 보여줍니다<br />
              • <strong>체크박스로 원하는 평형만 선택</strong>하여 차트와 데이터를 필터링할 수 있습니다<br />
              • 평형별 실거래가 통계에서 카드를 클릭하면 해당 평형만 필터링됩니다<br />
              • 거래일별로 최저가~최고가 범위와 평균 가격을 확인할 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 실거래 내역 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📋</span>
              <span>실거래 상세 내역</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredTransactions.length}건의 거래
            </p>
          </div>
          {/* 필터 컨트롤 */}
          <div className="flex items-center gap-4">
            {/* CSV 다운로드 버튼 */}
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <span>📥</span>
              <span>CSV 다운로드</span>
            </button>

            {/* 취소 거래 필터 */}
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCancelledDeals}
                onChange={(e) => {
                  setShowCancelledDeals(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span>취소 거래 포함</span>
            </label>

            {/* 평형 필터 */}
            <select
              value={selectedArea}
              onChange={(e) => handleAreaFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="all">전체 평형</option>
              {areaStats.map(stat => (
                <option key={stat.areaType} value={stat.areaType.replace('평형', '')}>
                  {stat.areaType} ({stat.transactionCount}건)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  거래일 {getSortIcon('date')}
                </th>
                <th
                  onClick={() => handleSort('area')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  평형/면적 {getSortIcon('area')}
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  거래가 {getSortIcon('price')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  층
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  동/지번
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  건축년도
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {currentTransactions.map((transaction, index) => {
                // 전용면적 계산
                const exclusivePyeong = Math.round(transaction.exclusiveArea / 3.3058 * 10) / 10;
                const exclusivePyeongInt = Math.floor(exclusivePyeong);
                const isCancelled = transaction.cancelDealType && transaction.cancelDealType !== '';

                // 공급평형이 있으면 표시
                const hasSupplyPyeong = transaction.supplyPyeong !== null;
                const displayPyeong = hasSupplyPyeong ? transaction.supplyPyeong : exclusivePyeongInt;

                return (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isCancelled ? 'bg-red-50 dark:bg-red-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {transaction.dealYear}.{String(transaction.dealMonth).padStart(2, '0')}.{String(transaction.dealDay).padStart(2, '0')}
                        {isCancelled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            취소
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {hasSupplyPyeong ? (
                        <>
                          <div>{displayPyeong}평형 (전용 {exclusivePyeongInt}평)</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            전용 {transaction.exclusiveArea.toFixed(1)}㎡
                          </div>
                        </>
                      ) : (
                        <>
                          <div>전용 {exclusivePyeongInt}평</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.exclusiveArea.toFixed(1)}㎡ ({exclusivePyeong}평)
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {transaction.dealPriceFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.floor}층
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{transaction.dong}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{transaction.jibun}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {transaction.buildYear}년
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {filteredTransactions.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* 페이지 정보 */}
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  총 {filteredTransactions.length}건 중 {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)}건 표시
                </p>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={10}>10개씩</option>
                  <option value={20}>20개씩</option>
                  <option value={50}>50개씩</option>
                  <option value={100}>100개씩</option>
                </select>
              </div>

              {/* 페이지 버튼 */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    처음
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    이전
                  </button>

                  {/* 페이지 번호 */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white font-semibold'
                              : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    다음
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    마지막
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {filteredTransactions.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">선택한 조건에 맞는 거래 내역이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
