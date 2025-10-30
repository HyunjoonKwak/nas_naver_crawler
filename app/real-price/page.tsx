"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import { Search, Loader2, TrendingUp, Home, Calendar, MapPin, ChevronDown, ChevronUp, Building2, X, Download } from "lucide-react";
import { formatPrice } from "@/lib/price-format";
import DongCodeSelector from "@/components/DongCodeSelector";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Area, ComposedChart } from 'recharts';

interface RealPriceItem {
  aptName: string;
  aptDong: string;
  dealPrice: number; // 매매가 (원) - 매매만
  dealPriceFormatted: string;
  dealDate: string;
  address: string;
  dong: string;
  jibun: string;
  area: number;
  areaPyeong: number;
  floor: number;
  buildYear: number;
  tradeType: string; // 거래유형 (매매/전세/월세)
  dealMethod: string; // 거래방법 (직거래/중개거래)
  pricePerPyeong: number;
  rgstDate: string;

  // 전월세 전용 필드
  deposit?: number; // 보증금 (원)
  monthlyRent?: number; // 월세 (원)
  depositFormatted?: string;
  monthlyRentFormatted?: string;
  contractType?: string; // 신규/갱신
}

export default function RealPricePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [lawdCd, setLawdCd] = useState(""); // DongCodeSelector로부터 받음
  const [selectedArea, setSelectedArea] = useState(""); // 선택된 지역명
  const [selectedDong, setSelectedDong] = useState(""); // 선택된 읍면동명
  const [period, setPeriod] = useState("3m"); // 기본값: 최근 3개월
  const [aptName, setAptName] = useState("");
  const [minArea, setMinArea] = useState(""); // 최소 면적 (평)
  const [maxArea, setMaxArea] = useState(""); // 최대 면적 (평)
  const [searchResults, setSearchResults] = useState<RealPriceItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedApts, setExpandedApts] = useState<Set<string>>(new Set());
  const [autoSearchTriggered, setAutoSearchTriggered] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{
    lawdCd: string;
    areaName: string;
    dongName?: string;
    timestamp: number;
  }>>([]);

  // 필터 및 정렬 상태
  const [sortBy, setSortBy] = useState<'count' | 'avgPrice' | 'latestDate' | 'aptName'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [tradeTypes, setTradeTypes] = useState<string[]>(['매매', '전세', '월세']); // 기본값: 전체
  const [minFloor, setMinFloor] = useState("");
  const [maxFloor, setMaxFloor] = useState("");
  const [minBuildYear, setMinBuildYear] = useState("");
  const [maxBuildYear, setMaxBuildYear] = useState("");

  // 아파트별 매물 목록 정렬 상태 (key: aptName, value: {sortBy, sortOrder})
  const [itemSorts, setItemSorts] = useState<Record<string, {sortBy: 'dealDate' | 'area' | 'dong' | 'floor', sortOrder: 'asc' | 'desc'}>>({});

  // 아파트별 차트 면적 필터 상태 (key: aptName, value: Set<면적키>)
  const [chartAreaFilters, setChartAreaFilters] = useState<Record<string, Set<string>>>({});

  // 비교 기능
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // 검색 결과 통계 계산
  const resultStats = useMemo(() => {
    if (searchResults.length === 0) return null;

    const prices = searchResults.map(item => item.dealPrice);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPricePerPyeong = searchResults.reduce((sum, item) => sum + item.pricePerPyeong, 0) / searchResults.length;
    const avgBuildYear = Math.round(searchResults.reduce((sum, item) => sum + item.buildYear, 0) / searchResults.length);

    return {
      totalCount: searchResults.length,
      avgPrice,
      maxPrice,
      minPrice,
      avgPricePerPyeong,
      avgBuildYear,
    };
  }, [searchResults]);

  // 아파트별로 그룹핑 및 필터링
  const groupedResults = useMemo(() => {
    // 1. 먼저 개별 거래 필터링
    let filteredItems = searchResults;

    // 가격 필터링
    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) * 10000 : 0; // 만원 → 원
      const max = maxPrice ? parseFloat(maxPrice) * 10000 : Infinity;
      filteredItems = filteredItems.filter(item =>
        item.dealPrice >= min && item.dealPrice <= max
      );
    }

    // 거래 유형 필터링 (tradeType 사용)
    if (tradeTypes.length > 0) {
      filteredItems = filteredItems.filter(item =>
        tradeTypes.includes(item.tradeType)
      );
    }

    // 층수 필터링
    if (minFloor || maxFloor) {
      const min = minFloor ? parseInt(minFloor) : -Infinity;
      const max = maxFloor ? parseInt(maxFloor) : Infinity;
      filteredItems = filteredItems.filter(item =>
        item.floor >= min && item.floor <= max
      );
    }

    // 건축년도 필터링
    if (minBuildYear || maxBuildYear) {
      const min = minBuildYear ? parseInt(minBuildYear) : 0;
      const max = maxBuildYear ? parseInt(maxBuildYear) : 9999;
      filteredItems = filteredItems.filter(item =>
        item.buildYear >= min && item.buildYear <= max
      );
    }

    // 2. 아파트별로 그룹핑
    const groups = new Map<string, RealPriceItem[]>();
    filteredItems.forEach(item => {
      if (!groups.has(item.aptName)) {
        groups.set(item.aptName, []);
      }
      groups.get(item.aptName)!.push(item);
    });

    // 3. 그룹을 배열로 변환
    let results = Array.from(groups.entries())
      .map(([aptName, items]) => ({
        aptName,
        items,
        count: items.length,
        avgPrice: items.reduce((sum, item) => sum + item.dealPrice, 0) / items.length,
        latestDate: items[0].dealDate,
      }));

    // 4. 정렬
    results.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'count':
          compareValue = a.count - b.count;
          break;
        case 'avgPrice':
          compareValue = a.avgPrice - b.avgPrice;
          break;
        case 'latestDate':
          compareValue = a.latestDate.localeCompare(b.latestDate);
          break;
        case 'aptName':
          compareValue = a.aptName.localeCompare(b.aptName);
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return results;
  }, [searchResults, sortBy, sortOrder, minPrice, maxPrice, tradeTypes, minFloor, maxFloor, minBuildYear, maxBuildYear]);

  // 검색 기록 로드
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem('realPriceSearchHistory');
        if (saved) {
          const history = JSON.parse(saved);
          setSearchHistory(history.slice(0, 5)); // 최근 5개만
        }
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    };
    loadHistory();
  }, []);

  // 검색 기록 저장
  const saveToHistory = (lawdCd: string, areaName: string, dongName?: string) => {
    try {
      const newEntry = {
        lawdCd,
        areaName,
        dongName,
        timestamp: Date.now(),
      };

      // 중복 제거 (같은 lawdCd + dongName 조합이 있으면 제거)
      const updatedHistory = [
        newEntry,
        ...searchHistory.filter(item =>
          !(item.lawdCd === lawdCd && (item.dongName || '') === (dongName || ''))
        )
      ].slice(0, 5); // 최대 5개

      setSearchHistory(updatedHistory);
      localStorage.setItem('realPriceSearchHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // 검색 기록에서 재검색
  const searchFromHistory = (item: { lawdCd: string; areaName: string; dongName?: string }) => {
    // 직접 매개변수로 전달하여 즉시 검색
    handleSearch({
      lawdCd: item.lawdCd,
      areaName: item.areaName,
      dongName: item.dongName || ''
    });
  };

  // 검색 기록에서 특정 항목 제거
  const removeFromHistory = (index: number) => {
    try {
      const updatedHistory = searchHistory.filter((_, i) => i !== index);
      setSearchHistory(updatedHistory);
      localStorage.setItem('realPriceSearchHistory', JSON.stringify(updatedHistory));
      showSuccess('검색 기록이 제거되었습니다');
    } catch (error) {
      console.error('Failed to remove search history:', error);
      showError('검색 기록 제거 중 오류가 발생했습니다');
    }
  };

  // 아파트 확장/축소 토글
  const toggleApartment = (aptName: string) => {
    setExpandedApts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(aptName)) {
        newSet.delete(aptName);
      } else {
        newSet.add(aptName);
      }
      return newSet;
    });
  };

  // 아파트별 매물 정렬 변경
  const setItemSort = (aptName: string, sortBy: 'dealDate' | 'area' | 'dong' | 'floor') => {
    setItemSorts(prev => {
      const current = prev[aptName];
      const newSortOrder = current?.sortBy === sortBy && current?.sortOrder === 'desc' ? 'asc' : 'desc';
      return {
        ...prev,
        [aptName]: { sortBy, sortOrder: newSortOrder }
      };
    });
  };

  // 아파트별 매물 정렬 적용
  const getSortedItems = (aptName: string, items: RealPriceItem[]) => {
    const sort = itemSorts[aptName];
    if (!sort) return items;

    return [...items].sort((a, b) => {
      let compareValue = 0;

      switch (sort.sortBy) {
        case 'dealDate':
          compareValue = a.dealDate.localeCompare(b.dealDate);
          break;
        case 'area':
          compareValue = a.area - b.area;
          break;
        case 'dong':
          compareValue = (a.aptDong || '').localeCompare(b.aptDong || '');
          break;
        case 'floor':
          compareValue = a.floor - b.floor;
          break;
      }

      return sort.sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  // 비교 선택 토글
  const toggleComparison = (aptName: string) => {
    setSelectedForComparison(prev => {
      const newSet = new Set(prev);
      if (newSet.has(aptName)) {
        newSet.delete(aptName);
      } else {
        if (newSet.size >= 3) {
          showError('최대 3개까지 선택할 수 있습니다');
          return prev;
        }
        newSet.add(aptName);
      }
      return newSet;
    });
  };

  // 비교 초기화
  const resetComparison = () => {
    setSelectedForComparison(new Set());
    setShowComparisonModal(false);
  };

  // 기간에 따른 조회 월 목록 생성
  const getMonthsToSearch = () => {
    const now = new Date();
    const months: string[] = [];

    let monthCount = 3; // 기본값
    switch (period) {
      case "3m": monthCount = 3; break;
      case "6m": monthCount = 6; break;
      case "12m": monthCount = 12; break;
      case "2y": monthCount = 24; break;
      case "3y": monthCount = 36; break;
    }

    for (let i = 0; i < monthCount; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      months.push(`${year}${month}`);
    }

    return months;
  };

  // 검색 실행
  const handleSearch = async (searchParams?: { lawdCd?: string; areaName?: string; dongName?: string }) => {
    // 매개변수로 받은 값이 있으면 사용, 없으면 state 사용
    const searchLawdCd = searchParams?.lawdCd || lawdCd;
    const searchArea = searchParams?.areaName || selectedArea;
    const searchDong = searchParams?.dongName || selectedDong;

    if (!searchLawdCd) {
      showError("지역을 선택해주세요");
      return;
    }

    // State 업데이트 (매개변수로 받은 값이 있으면)
    if (searchParams?.lawdCd) {
      setLawdCd(searchParams.lawdCd);
      setSelectedArea(searchParams.areaName || '');
      setSelectedDong(searchParams.dongName || '');
    }

    const loadingToast = showLoading("실거래가 조회 중...");
    setIsLoading(true);

    try {
      const monthsToSearch = getMonthsToSearch();
      const allResults: RealPriceItem[] = [];

      // 각 월별로 매매 + 전월세 API 동시 호출
      for (const dealYmd of monthsToSearch) {
        const params = new URLSearchParams({
          lawdCd: searchLawdCd,
          dealYmd,
          ...(aptName && { aptName }),
        });

        // 매매 + 전월세 동시 조회
        const [saleResponse, rentResponse] = await Promise.all([
          fetch(`/api/real-price/search?${params.toString()}`),
          fetch(`/api/rent-price/search?${params.toString()}`)
        ]);

        const [saleData, rentData] = await Promise.all([
          saleResponse.json(),
          rentResponse.json()
        ]);

        // 매매 데이터 추가
        if (saleResponse.ok && saleData.data.items && saleData.data.items.length > 0) {
          allResults.push(...saleData.data.items);
        } else if (!saleResponse.ok) {
          console.error(`${dealYmd} 매매 조회 실패:`, saleData.error);
        }

        // 전월세 데이터 추가
        if (rentResponse.ok && rentData.data.items && rentData.data.items.length > 0) {
          allResults.push(...rentData.data.items);
        } else if (!rentResponse.ok) {
          console.error(`${dealYmd} 전월세 조회 실패:`, rentData.error);
        }
      }

      dismissToast(loadingToast);

      // 거래일 기준 내림차순 정렬
      allResults.sort((a, b) => b.dealDate.localeCompare(a.dealDate));

      // 필터링: 읍면동, 면적
      let filteredResults = allResults;

      // 읍면동 필터링
      if (searchDong) {
        filteredResults = filteredResults.filter(item => {
          return item.dong && item.dong.includes(searchDong);
        });
      }

      // 면적 필터링 (평 기준)
      if (minArea || maxArea) {
        const min = minArea ? parseFloat(minArea) : 0;
        const max = maxArea ? parseFloat(maxArea) : Infinity;

        filteredResults = filteredResults.filter(item => {
          return item.areaPyeong >= min && item.areaPyeong <= max;
        });
      }

      setSearchResults(filteredResults);
      setTotalCount(filteredResults.length);

      if (filteredResults.length > 0) {
        const message = searchDong
          ? `${searchDong} 지역에서 ${filteredResults.length}건의 실거래가를 찾았습니다`
          : `${filteredResults.length}건의 실거래가를 찾았습니다`;
        showSuccess(message);

        // 검색 기록에 저장
        saveToHistory(searchLawdCd, searchArea, searchDong);
      } else {
        showError("검색 결과가 없습니다");
      }
    } catch (error: unknown) {
      dismissToast(loadingToast);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 엔터 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 캐시 새로고침 함수
  const handleRefreshCache = async () => {
    if (!lawdCd) {
      showError("지역을 먼저 선택해주세요");
      return;
    }

    const loadingToast = showLoading("캐시 삭제 중...");

    try {
      // 현재 검색 기간의 모든 월에 대해 캐시 무효화
      const monthsToInvalidate = getMonthsToSearch();

      for (const dealYmd of monthsToInvalidate) {
        const response = await fetch('/api/real-price/invalidate-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lawdCd, dealYmd }),
        });

        if (!response.ok) {
          console.error(`${dealYmd} 캐시 삭제 실패`);
        }
      }

      dismissToast(loadingToast);
      showSuccess(`${monthsToInvalidate.length}개월 캐시가 삭제되었습니다. 다시 검색하면 최신 데이터를 가져옵니다.`);

      // 캐시 삭제 후 자동으로 재검색
      handleSearch();
    } catch (error) {
      dismissToast(loadingToast);
      showError("캐시 삭제 중 오류가 발생했습니다");
      console.error(error);
    }
  };

  // CSV 다운로드 함수
  const handleDownloadCSV = () => {
    try {
      // 헤더 행
      const headers = [
        '아파트명',
        '거래유형',
        '거래방법',
        '거래가격',
        '평당가격',
        '거래일',
        '전용면적(㎡)',
        '전용면적(평)',
        '층',
        '건축년도',
        '동',
        '주소',
        '등록일'
      ];

      // 데이터 행 (필터링된 결과 사용)
      const rows = groupedResults.flatMap(group =>
        group.items.map(item => [
          item.aptName,
          item.tradeType,
          item.dealMethod,
          item.dealPriceFormatted,
          `${(item.pricePerPyeong / 10000).toFixed(0)}만원`,
          item.dealDate,
          item.area.toFixed(2),
          item.areaPyeong.toFixed(1),
          item.floor.toString(),
          item.buildYear.toString(),
          item.aptDong || '-',
          item.dong,
          `${item.address} ${item.jibun}`,
          item.rgstDate
        ])
      );

      // CSV 문자열 생성
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // BOM 추가 (한글 깨짐 방지)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // 파일명: "실거래가_{지역명}_{날짜}.csv"
      const today = new Date().toISOString().split('T')[0];
      const areaName = selectedDong || selectedArea || '전체';
      link.setAttribute('download', `실거래가_${areaName}_${today}.csv`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess(`${rows.length}건의 데이터를 다운로드했습니다`);
    } catch (error) {
      console.error('CSV 다운로드 오류:', error);
      showError('CSV 다운로드 중 오류가 발생했습니다');
    }
  };

  // URL 파라미터로부터 자동 검색
  useEffect(() => {
    const urlLawdCd = searchParams.get('lawdCd');
    const autoSearch = searchParams.get('autoSearch');

    if (urlLawdCd && autoSearch === 'true' && !autoSearchTriggered) {
      setAutoSearchTriggered(true);

      // 직접 매개변수로 전달하여 즉시 검색
      handleSearch({ lawdCd: urlLawdCd });
    }
  }, [searchParams, autoSearchTriggered]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* 네비게이션 */}
        <Navigation />
        <MobileNavigation />

        {/* 메인 컨테이너 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb items={[{ label: '실거래가 검색' }]} />
          </div>

          {/* 헤더 */}
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                아파트 실거래가 검색
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                국토교통부 실거래가 데이터를 기반으로 아파트 거래 정보를 조회합니다
              </p>
            </div>
          </div>

          {/* 최근 검색 기록 */}
          {searchHistory.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg shadow-md border border-purple-200 dark:border-purple-800 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                최근 검색
              </h3>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-sm border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
                  >
                    <button
                      onClick={() => searchFromHistory(item)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="font-medium">{item.areaName}</span>
                      {item.dongName && <span className="text-xs">· {item.dongName}</span>}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(index);
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors opacity-0 group-hover:opacity-100"
                      title="삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 검색 폼 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            {/* 법정동 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                지역 선택
              </label>
              <DongCodeSelector
                onSelect={(code, name, dongName) => {
                  setLawdCd(code);
                  setSelectedArea(name);
                  setSelectedDong(dongName || "");
                }}
              />
              {selectedArea && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  선택된 지역: <strong>{selectedArea}</strong> (코드: {lawdCd})
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 조회 기간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  조회 기간
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-gray-900 dark:text-white"
                >
                  <option value="3m" className="text-gray-900 dark:text-white">최근 3개월</option>
                  <option value="6m" className="text-gray-900 dark:text-white">최근 6개월</option>
                  <option value="12m" className="text-gray-900 dark:text-white">최근 12개월</option>
                  <option value="2y" className="text-gray-900 dark:text-white">최근 2년</option>
                  <option value="3y" className="text-gray-900 dark:text-white">최근 3년</option>
                </select>
              </div>

              {/* 전용면적 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  전용면적 (평)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    placeholder="최소"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-500">~</span>
                  <input
                    type="number"
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value)}
                    placeholder="최대"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 아파트명 (선택) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  아파트명 (선택)
                </label>
                <input
                  type="text"
                  value={aptName}
                  onChange={(e) => setAptName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="래미안, 푸르지오..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 검색 버튼 및 캐시 새로고침 */}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => handleSearch()}
                  disabled={isLoading || !lawdCd}
                  className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      조회 중...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      검색
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefreshCache}
                  disabled={isLoading || !lawdCd}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  title="캐시를 삭제하고 최신 데이터를 가져옵니다"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>사용 방법:</strong> 시/도 → 시/군/구 순으로 선택하면 해당 지역의 실거래가를 조회할 수 있습니다. 읍/면/동은 선택 사항입니다.
              </p>
            </div>
          </div>

          {/* 검색 결과 - 아파트별 그룹핑 */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              {/* 검색 결과 요약 카드 */}
              {resultStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">총 거래 건수</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{resultStats.totalCount}건</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">평균 거래가</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">{formatPrice(resultStats.avgPrice)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">최고가</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatPrice(resultStats.maxPrice)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">최저가</div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatPrice(resultStats.minPrice)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/30 rounded-lg p-4 border border-pink-200 dark:border-pink-700">
                    <div className="text-sm text-pink-600 dark:text-pink-400 font-medium mb-1">평균 평당가</div>
                    <div className="text-xl font-bold text-pink-900 dark:text-pink-100">{(resultStats.avgPricePerPyeong / 10000).toFixed(0)}만원</div>
                  </div>
                </div>
              )}

              {/* 헤더 및 필터 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    검색 결과
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      총 <span className="font-semibold text-blue-600 dark:text-blue-400">{groupedResults.length}개</span> 아파트,{" "}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{groupedResults.reduce((sum, g) => sum + g.count, 0)}건</span>의 거래
                    </div>
                    <button
                      onClick={handleDownloadCSV}
                      disabled={groupedResults.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                      title="현재 필터링된 결과를 CSV 파일로 다운로드합니다"
                    >
                      <Download className="w-4 h-4" />
                      CSV 다운로드
                    </button>
                  </div>
                </div>

                {/* 필터 및 정렬 섹션 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  {/* 정렬 옵션 */}
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      정렬:
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="count">거래 건수</option>
                      <option value="avgPrice">평균 가격</option>
                      <option value="latestDate">최근 거래일</option>
                      <option value="aptName">아파트명</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {sortOrder === 'desc' ? '↓ 내림차순' : '↑ 오름차순'}
                    </button>
                  </div>

                  {/* 필터 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 가격 필터 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        가격 (만원)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          placeholder="최소"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-gray-500">~</span>
                        <input
                          type="number"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          placeholder="최대"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      {/* 빠른 선택 버튼 */}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => { setMinPrice(""); setMaxPrice("30000"); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          3억↓
                        </button>
                        <button
                          onClick={() => { setMinPrice("30000"); setMaxPrice("50000"); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          3~5억
                        </button>
                        <button
                          onClick={() => { setMinPrice("50000"); setMaxPrice("100000"); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          5~10억
                        </button>
                        <button
                          onClick={() => { setMinPrice("100000"); setMaxPrice(""); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          10억↑
                        </button>
                      </div>
                    </div>

                    {/* 거래 유형 필터 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        거래 유형
                      </label>
                      <div className="space-y-1">
                        {['매매', '전세', '월세'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tradeTypes.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTradeTypes([...tradeTypes, type]);
                                } else {
                                  setTradeTypes(tradeTypes.filter(t => t !== type));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 층수 필터 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        층수
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={minFloor}
                          onChange={(e) => setMinFloor(e.target.value)}
                          placeholder="최소"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-gray-500">~</span>
                        <input
                          type="number"
                          value={maxFloor}
                          onChange={(e) => setMaxFloor(e.target.value)}
                          placeholder="최대"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      {/* 빠른 선택 */}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => { setMinFloor("1"); setMaxFloor("5"); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          저층
                        </button>
                        <button
                          onClick={() => { setMinFloor("6"); setMaxFloor("15"); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          중층
                        </button>
                        <button
                          onClick={() => { setMinFloor("16"); setMaxFloor(""); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          고층
                        </button>
                      </div>
                    </div>

                    {/* 건축년도 필터 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        건축년도
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={minBuildYear}
                          onChange={(e) => setMinBuildYear(e.target.value)}
                          placeholder="최소"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <span className="text-gray-500">~</span>
                        <input
                          type="number"
                          value={maxBuildYear}
                          onChange={(e) => setMaxBuildYear(e.target.value)}
                          placeholder="최대"
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      {/* 빠른 선택 */}
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => { setMinBuildYear(String(new Date().getFullYear() - 5)); setMaxBuildYear(""); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          5년↓
                        </button>
                        <button
                          onClick={() => { setMinBuildYear(String(new Date().getFullYear() - 10)); setMaxBuildYear(""); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          10년↓
                        </button>
                        <button
                          onClick={() => { setMinBuildYear(String(new Date().getFullYear() - 15)); setMaxBuildYear(""); }}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          15년↓
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 필터 초기화 버튼 */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setMinPrice(""); setMaxPrice("");
                        setTradeTypes(['매매']);
                        setMinFloor(""); setMaxFloor("");
                        setMinBuildYear(""); setMaxBuildYear("");
                      }}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      필터 초기화
                    </button>
                  </div>
                </div>
              </div>

              {/* 아파트별 그룹 */}
              {groupedResults.map((group) => (
                <div
                  key={group.aptName}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                  {/* 아파트 헤더 */}
                  <div className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      {/* 비교 체크박스 */}
                      <input
                        type="checkbox"
                        checked={selectedForComparison.has(group.aptName)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleComparison(group.aptName);
                        }}
                        className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        title="비교하려면 체크하세요 (최대 3개)"
                      />

                      <button
                        onClick={() => toggleApartment(group.aptName)}
                        className="flex-1 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors py-2 -my-2 px-2 -mx-2 rounded"
                      >
                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {group.aptName}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <span>거래 {group.count}건</span>
                          <span>•</span>
                          <span>평균 {formatPrice(group.avgPrice)}</span>
                          <span>•</span>
                          <span>최근 {group.latestDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {expandedApts.has(group.aptName) ? "접기" : "상세보기"}
                        </span>
                        {expandedApts.has(group.aptName) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    </div>
                  </div>

                  {/* 거래 목록 (확장 시) */}
                  {expandedApts.has(group.aptName) && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {/* 가격 추세 차트 (테이블 위로 이동) */}
                      {group.items.length > 1 && (
                        <div className="px-6 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            전용면적별 가격 추세
                          </h4>

                          {(() => {
                            // 전용면적별 그룹핑 (제곱미터 단위로)
                            const areaGroups = new Map<string, RealPriceItem[]>();
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

                            group.items.forEach(item => {
                              const sqm = Math.round(item.area); // 제곱미터 반올림
                              const groupKey = `${sqm}㎡`;

                              if (!areaGroups.has(groupKey)) {
                                areaGroups.set(groupKey, []);
                              }
                              areaGroups.get(groupKey)!.push(item);
                            });

                            // 이 아파트의 면적 필터 초기화 (아직 없으면)
                            const aptKey = group.aptName;
                            if (!chartAreaFilters[aptKey]) {
                              setChartAreaFilters(prev => ({
                                ...prev,
                                [aptKey]: new Set(Array.from(areaGroups.keys()))
                              }));
                            }

                            const selectedAreas = chartAreaFilters[aptKey] || new Set(Array.from(areaGroups.keys()));

                            const toggleArea = (areaKey: string) => {
                              setChartAreaFilters(prev => {
                                const currentSet = prev[aptKey] || new Set(Array.from(areaGroups.keys()));
                                const newSet = new Set(currentSet);
                                if (newSet.has(areaKey)) {
                                  newSet.delete(areaKey);
                                } else {
                                  newSet.add(areaKey);
                                }
                                return {
                                  ...prev,
                                  [aptKey]: newSet
                                };
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

                            // 날짜별로 데이터 정리 (각 면적별로)
                            const chartData: any[] = [];
                            const allDates = [...new Set(group.items.map(item => item.dealDate))].sort();

                            allDates.forEach(date => {
                              const dataPoint: any = { date };

                              Array.from(areaGroups.entries()).forEach(([areaKey, items], index) => {
                                const itemsOnDate = items.filter(item => item.dealDate === date);

                                if (itemsOnDate.length > 0) {
                                  const prices = itemsOnDate.map(item => item.dealPrice / 10000);
                                  const min = Math.min(...prices);
                                  const max = Math.max(...prices);
                                  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

                                  dataPoint[`${areaKey}_min`] = min;
                                  dataPoint[`${areaKey}_max`] = max;
                                  dataPoint[`${areaKey}_range`] = max - min; // stackId용: 범위 크기
                                  dataPoint[`${areaKey}_avg`] = avg;
                                  dataPoint[`${areaKey}_points`] = prices; // 모든 점
                                }
                              });

                              chartData.push(dataPoint);
                            });

                            // 면적별 추세선 계산
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

                            // Y축 범위 계산: 선택된 면적만의 가격 범위 (여유 15% 추가)
                            const selectedPrices: number[] = [];
                            Array.from(areaGroups.entries())
                              .filter(([areaKey]) => selectedAreas.has(areaKey))
                              .forEach(([areaKey, items]) => {
                                items.forEach(item => {
                                  selectedPrices.push(item.dealPrice / 10000);
                                });
                              });

                            // domain을 함수로 정의하여 recharts의 자동 계산 우회
                            const yAxisDomain: [(dataMin: number) => number, (dataMax: number) => number] = [
                              (dataMin: number) => {
                                if (selectedPrices.length === 0) return dataMin;
                                const minPrice = Math.min(...selectedPrices);
                                const maxPrice = Math.max(...selectedPrices);
                                const priceRange = maxPrice - minPrice;
                                const priceMargin = Math.max(priceRange * 0.15, 500); // 최소 500만원 여유
                                return Math.floor(minPrice - priceMargin);
                              },
                              (dataMax: number) => {
                                if (selectedPrices.length === 0) return dataMax;
                                const minPrice = Math.min(...selectedPrices);
                                const maxPrice = Math.max(...selectedPrices);
                                const priceRange = maxPrice - minPrice;
                                const priceMargin = Math.max(priceRange * 0.15, 500); // 최소 500만원 여유
                                return Math.ceil(maxPrice + priceMargin);
                              }
                            ];

                            return (
                              <>
                                {/* 면적 필터 체크박스 */}
                                <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    표시할 면적 선택:
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {Array.from(areaGroups.entries()).map(([areaKey, items], index) => {
                                      const color = colors[index % colors.length];
                                      const isSelected = selectedAreas.has(areaKey);

                                      return (
                                        <label
                                          key={areaKey}
                                          className="flex items-center gap-2 cursor-pointer text-sm"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleArea(areaKey)}
                                            className="w-4 h-4 rounded"
                                          />
                                          <span
                                            className="font-medium"
                                            style={{ color: isSelected ? color : '#9ca3af' }}
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
                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e: any) => {
                                      if (e && e.activePayload && e.activePayload.length > 0) {
                                        const data = e.activePayload[0].payload;
                                        const date = data.date;

                                        // 선택된 면적 중 첫 번째로 스크롤
                                        const selectedAreaKeys = Array.from(areaGroups.keys()).filter(key => selectedAreas.has(key));
                                        if (selectedAreaKeys.length > 0) {
                                          const firstAreaKey = selectedAreaKeys[0];
                                          const area = parseInt(firstAreaKey.replace('㎡', ''));
                                          const itemId = `item-${group.aptName.replace(/\s+/g, '-')}-${date}-${area}-0`;
                                          const element = document.getElementById(itemId);

                                          if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
                                            setTimeout(() => {
                                              element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
                                            }, 2000);
                                          }
                                        }
                                      }
                                    }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
                                    <XAxis
                                      dataKey="date"
                                      className="text-xs fill-gray-600 dark:fill-gray-400"
                                      tick={{ fontSize: 11 }}
                                      angle={-45}
                                      textAnchor="end"
                                      height={80}
                                    />
                                    <YAxis
                                      className="text-xs fill-gray-600 dark:fill-gray-400"
                                      tick={{ fontSize: 11 }}
                                      label={{ value: '만원', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
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
                                                    style={{ color: colors[index % colors.length] }}
                                                  >
                                                    <strong>{areaKey}</strong>: {points.length}건
                                                    <br />
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                      {Math.min(...points).toLocaleString()}만원 ~ {Math.max(...points).toLocaleString()}만원
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 border-t pt-1">
                                              💡 차트를 클릭하면 해당 거래 목록으로 이동
                                            </p>
                                          </div>
                                        );
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                      formatter={(value) => value}
                                    />

                                    {/* 각 면적별로 영역(Area) + 선(Line) 그리기 */}
                                    {Array.from(areaGroups.entries())
                                      .filter(([areaKey]) => selectedAreas.has(areaKey))
                                      .map(([areaKey, items], index) => {
                                        const color = colors[index % colors.length];

                                        return (
                                          <React.Fragment key={areaKey}>
                                            {/* 최소~최대 범위 영역 (stackId로 영역 생성) */}
                                            {/* 1단계: 최소값까지 transparent로 채우기 */}
                                            <Area
                                              type="monotone"
                                              dataKey={`${areaKey}_min`}
                                              stackId={areaKey}
                                              stroke="none"
                                              fill="transparent"
                                              name={`${areaKey} 최소`}
                                            />
                                            {/* 2단계: 최소값 위에 (최대-최소) 범위를 색상으로 쌓기 */}
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
                                <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <p className="text-xs text-gray-700 dark:text-gray-300">
                                    💡 <strong>차트 사용법:</strong><br />
                                    • 각 면적별로 색상이 다릅니다<br />
                                    • <span className="font-semibold">굵은 실선</span>: 평균 가격 | <span className="font-semibold">가는 점선</span>: 최대/최소 | <span className="font-semibold">영역</span>: 가격 범위 | <span className="font-semibold">중간 점선</span>: 추세선<br />
                                    • <strong>추세선</strong>은 선형 회귀를 통해 전체적인 가격 상승/하락 추세를 보여줍니다<br />
                                    • 체크박스로 원하는 면적만 필터링 가능 (차트와 매물 목록 모두 적용)<br />
                                    • <strong>차트의 데이터 포인트(날짜)를 클릭</strong>하면 해당 날짜의 거래 목록으로 자동 이동
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래금액
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => setItemSort(group.aptName, 'area')}
                                title="클릭하여 정렬"
                              >
                                <div className="flex items-center gap-1">
                                  전용면적
                                  {itemSorts[group.aptName]?.sortBy === 'area' && (
                                    <span>{itemSorts[group.aptName].sortOrder === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => setItemSort(group.aptName, 'dong')}
                                title="클릭하여 정렬"
                              >
                                <div className="flex items-center gap-1">
                                  동
                                  {itemSorts[group.aptName]?.sortBy === 'dong' && (
                                    <span>{itemSorts[group.aptName].sortOrder === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => setItemSort(group.aptName, 'floor')}
                                title="클릭하여 정렬"
                              >
                                <div className="flex items-center gap-1">
                                  층
                                  {itemSorts[group.aptName]?.sortBy === 'floor' && (
                                    <span>{itemSorts[group.aptName].sortOrder === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                건축년도
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => setItemSort(group.aptName, 'dealDate')}
                                title="클릭하여 정렬"
                              >
                                <div className="flex items-center gap-1">
                                  거래일
                                  {itemSorts[group.aptName]?.sortBy === 'dealDate' && (
                                    <span>{itemSorts[group.aptName].sortOrder === 'desc' ? '↓' : '↑'}</span>
                                  )}
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래유형
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래방법
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                위치
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {(() => {
                              // 차트 면적 필터 적용
                              const aptKey = group.aptName;
                              const selectedAreas = chartAreaFilters[aptKey];

                              const filteredItems = getSortedItems(group.aptName, group.items).filter(item => {
                                // 면적 필터가 설정되어 있으면 필터링
                                if (selectedAreas && selectedAreas.size > 0) {
                                  const sqm = Math.round(item.area);
                                  const groupKey = `${sqm}㎡`;
                                  return selectedAreas.has(groupKey);
                                }
                                return true;
                              });

                              return filteredItems.map((item, index) => {
                                const itemId = `item-${group.aptName.replace(/\s+/g, '-')}-${item.dealDate}-${Math.round(item.area)}-${index}`;

                                return (
                                  <tr
                                    key={index}
                                    id={itemId}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700 scroll-mt-32 transition-colors"
                                    data-date={item.dealDate}
                                    data-area={Math.round(item.area)}
                                  >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {item.dealPriceFormatted}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    평당 {(item.pricePerPyeong / 10000).toLocaleString()}만원
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  전용 {item.area.toFixed(2)}㎡
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {item.aptDong || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {item.floor}층
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {item.buildYear}년
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900 dark:text-white">
                                      {item.dealDate}
                                    </span>
                                  </div>
                                  {item.rgstDate && (
                                    <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                      등기: {item.rgstDate}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    item.tradeType === '매매' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                    item.tradeType === '전세' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                  }`}>
                                    {item.tradeType}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                  {item.dealMethod}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-900 dark:text-white font-medium">
                                    {item.dong}
                                  </div>
                                  <div className="flex items-start gap-1 mt-0.5">
                                    <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {item.jibun}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 빈 상태 */}
          {!isLoading && searchResults.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                실거래가 데이터를 검색해보세요
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                법정동코드와 거래년월을 입력하고 검색 버튼을 눌러주세요
              </p>
            </div>
          )}

          {/* 비교 플로팅 바 */}
          {selectedForComparison.size > 0 && (
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-4 z-50">
              <span className="font-medium">
                {selectedForComparison.size}개 선택됨
              </span>
              <button
                onClick={() => setShowComparisonModal(true)}
                disabled={selectedForComparison.size < 2}
                className="bg-white text-blue-600 px-4 py-2 rounded-full font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                비교하기
              </button>
              <button
                onClick={resetComparison}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* 비교 모달 */}
          {showComparisonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    아파트 비교
                  </h2>
                  <button
                    onClick={() => setShowComparisonModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6">
                  {/* 비교 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                            항목
                          </th>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            return (
                              <th key={aptName} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                                {aptName}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {/* 거래 건수 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            거래 건수
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {group?.count}건
                              </td>
                            );
                          })}
                        </tr>

                        {/* 평균 가격 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            평균 거래가
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {group && formatPrice(group.avgPrice)}
                              </td>
                            );
                          })}
                        </tr>

                        {/* 최고가 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            최고가
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            const maxPrice = group ? Math.max(...group.items.map(i => i.dealPrice)) : 0;
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-purple-600 dark:text-purple-400">
                                {formatPrice(maxPrice)}
                              </td>
                            );
                          })}
                        </tr>

                        {/* 최저가 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            최저가
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            const minPrice = group ? Math.min(...group.items.map(i => i.dealPrice)) : 0;
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">
                                {formatPrice(minPrice)}
                              </td>
                            );
                          })}
                        </tr>

                        {/* 평균 평당가 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            평균 평당가
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            const avgPricePerPyeong = group
                              ? group.items.reduce((sum, item) => sum + item.pricePerPyeong, 0) / group.items.length
                              : 0;
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                                {(avgPricePerPyeong / 10000).toFixed(0)}만원
                              </td>
                            );
                          })}
                        </tr>

                        {/* 평균 건축년도 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            평균 건축년도
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            const avgBuildYear = group
                              ? Math.round(group.items.reduce((sum, item) => sum + item.buildYear, 0) / group.items.length)
                              : 0;
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {avgBuildYear}년 ({new Date().getFullYear() - avgBuildYear}년차)
                              </td>
                            );
                          })}
                        </tr>

                        {/* 최근 거래일 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            최근 거래일
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {group?.latestDate}
                              </td>
                            );
                          })}
                        </tr>

                        {/* 면적 범위 */}
                        <tr>
                          <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            면적 범위
                          </td>
                          {Array.from(selectedForComparison).map(aptName => {
                            const group = groupedResults.find(g => g.aptName === aptName);
                            const areas = group?.items.map(i => i.areaPyeong) || [];
                            const minArea = areas.length > 0 ? Math.min(...areas) : 0;
                            const maxArea = areas.length > 0 ? Math.max(...areas) : 0;
                            return (
                              <td key={aptName} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {minArea.toFixed(1)}평 ~ {maxArea.toFixed(1)}평
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={resetComparison}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      선택 초기화
                    </button>
                    <button
                      onClick={() => setShowComparisonModal(false)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
