"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import { Search, Loader2, TrendingUp, Home, Calendar, MapPin, ChevronDown, ChevronUp, Building2, Star, X } from "lucide-react";
import { formatPrice } from "@/lib/price-format";
import DongCodeSelector from "@/components/DongCodeSelector";

interface RealPriceItem {
  aptName: string;
  aptDong: string;
  dealPrice: number;
  dealPriceFormatted: string;
  dealDate: string;
  address: string;
  dong: string;
  jibun: string;
  area: number;
  areaPyeong: number;
  floor: number;
  buildYear: number;
  dealType: string;
  pricePerPyeong: number;
  rgstDate: string;
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
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Array<{
    lawdCd: string;
    areaName: string;
    dongName?: string;
    timestamp: number;
  }>>([]);

  // 즐겨찾기 목록 조회
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await fetch('/api/favorites');
      const data = await response.json();
      return data.success ? data.favorites : [];
    },
    enabled: !!session,
  });

  // 즐겨찾기 추가 mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async ({ aptName, lawdCd, address }: { aptName: string; lawdCd: string; address: string }) => {
      const response = await fetch('/api/favorites/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptName, lawdCd, address }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '즐겨찾기 추가 실패');
      }
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showSuccess(data.alreadyFavorite ? '이미 즐겨찾기에 추가되어 있습니다' : '즐겨찾기에 추가되었습니다');
    },
    onError: (error: any) => {
      showError(error.message || '즐겨찾기 추가 중 오류가 발생했습니다');
    },
  });

  // 즐겨찾기 삭제 mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (complexId: string) => {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexId }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '즐겨찾기 삭제 실패');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      showSuccess('즐겨찾기에서 제거되었습니다');
    },
    onError: (error: any) => {
      showError(error.message || '즐겨찾기 삭제 중 오류가 발생했습니다');
    },
  });

  // 즐겨찾기 여부 확인 함수
  const isFavorite = (aptName: string) => {
    if (!favoritesData) return false;
    return favoritesData.some((fav: any) => fav.complex?.complexName === aptName);
  };

  // 즐겨찾기된 아파트의 complexNo 찾기
  const getComplexNo = (aptName: string) => {
    if (!favoritesData) return null;
    const fav = favoritesData.find((f: any) => f.complex?.complexName === aptName);
    return fav?.complex?.complexNo || null;
  };

  // 즐겨찾기된 아파트의 complexId 찾기
  const getComplexId = (aptName: string) => {
    if (!favoritesData) return null;
    const fav = favoritesData.find((f: any) => f.complex?.complexName === aptName);
    return fav?.complexId || null;
  };

  // 즐겨찾기 토글 함수
  const handleToggleFavorite = (aptName: string, address: string) => {
    if (isFavorite(aptName)) {
      const complexId = getComplexId(aptName);
      if (complexId) {
        removeFavoriteMutation.mutate(complexId);
      }
    } else {
      addFavoriteMutation.mutate({ aptName, lawdCd, address });
    }
  };

  // 아파트별로 그룹핑
  const groupedResults = useMemo(() => {
    const groups = new Map<string, RealPriceItem[]>();

    searchResults.forEach(item => {
      if (!groups.has(item.aptName)) {
        groups.set(item.aptName, []);
      }
      groups.get(item.aptName)!.push(item);
    });

    // 각 그룹을 배열로 변환하고 거래 건수 기준 내림차순 정렬
    let results = Array.from(groups.entries())
      .map(([aptName, items]) => ({
        aptName,
        items,
        count: items.length,
        // 평균 가격 계산
        avgPrice: items.reduce((sum, item) => sum + item.dealPrice, 0) / items.length,
        // 최근 거래일
        latestDate: items[0].dealDate, // 이미 날짜 정렬되어 있음
      }))
      .sort((a, b) => b.count - a.count); // 거래 건수 내림차순

    // 내 관심 단지만 보기 필터 적용
    if (showOnlyFavorites && favoritesData) {
      results = results.filter(group => isFavorite(group.aptName));
    }

    return results;
  }, [searchResults, showOnlyFavorites, favoritesData]);

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

      // 각 월별로 API 호출
      for (const dealYmd of monthsToSearch) {
        const params = new URLSearchParams({
          lawdCd: searchLawdCd,
          dealYmd,
          ...(aptName && { aptName }),
        });

        const response = await fetch(`/api/real-price/search?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          console.error(`${dealYmd} 조회 실패:`, data.error);
          continue;
        }

        if (data.data.items && data.data.items.length > 0) {
          allResults.push(...data.data.items);
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

              {/* 검색 버튼 */}
              <div className="flex items-end">
                <button
                  onClick={() => handleSearch()}
                  disabled={isLoading || !lawdCd}
                  className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
              {/* 헤더 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      검색 결과
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      총 <span className="font-semibold text-blue-600 dark:text-blue-400">{groupedResults.length}개</span> 아파트,{" "}
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{totalCount}건</span>의 거래
                    </div>
                  </div>

                  {/* 즐겨찾기 필터 토글 */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                        showOnlyFavorites
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-400'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-yellow-500' : ''}`} />
                      <span>내 관심 단지만 보기</span>
                    </button>
                    {showOnlyFavorites && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        즐겨찾기된 아파트만 표시됩니다
                      </span>
                    )}
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
                  <div className="px-6 py-4 flex items-center justify-between">
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

                    {/* 즐겨찾기 및 상세 분석 버튼 */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* 즐겨찾기 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(group.aptName, group.items[0]?.address || '');
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          isFavorite(group.aptName)
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-400'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                      >
                        <Star
                          className={`w-4 h-4 ${isFavorite(group.aptName) ? 'fill-yellow-500' : ''}`}
                        />
                        {isFavorite(group.aptName) ? '즐겨찾기됨' : '즐겨찾기'}
                      </button>

                      {/* 상세 분석 바로가기 (즐겨찾기된 경우만 표시) */}
                      {isFavorite(group.aptName) && getComplexNo(group.aptName) && (
                        <Link
                          href={`/complex/${getComplexNo(group.aptName)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          상세 분석
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* 거래 목록 (확장 시) */}
                  {expandedApts.has(group.aptName) && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래금액
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                전용면적
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                동
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                층
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                건축년도
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래일
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                거래유형
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                위치
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {group.items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {item.dealType}
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
                            ))}
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
        </div>
      </div>
    </AuthGuard>
  );
}
