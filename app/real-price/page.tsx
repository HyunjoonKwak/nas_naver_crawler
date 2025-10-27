"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import { Search, Loader2, TrendingUp, Home, Calendar, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/real-price-api";
import DongCodeSelector from "@/components/DongCodeSelector";

interface RealPriceItem {
  aptName: string;
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
}

export default function RealPricePage() {
  const { data: session } = useSession();
  const [lawdCd, setLawdCd] = useState(""); // DongCodeSelector로부터 받음
  const [selectedArea, setSelectedArea] = useState(""); // 선택된 지역명
  const [selectedDong, setSelectedDong] = useState(""); // 선택된 읍면동명
  const [period, setPeriod] = useState("3m"); // 기본값: 최근 3개월
  const [aptName, setAptName] = useState("");
  const [searchResults, setSearchResults] = useState<RealPriceItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
  const handleSearch = async () => {
    if (!lawdCd) {
      showError("지역을 선택해주세요");
      return;
    }

    const loadingToast = showLoading("실거래가 조회 중...");
    setIsLoading(true);

    try {
      const monthsToSearch = getMonthsToSearch();
      const allResults: RealPriceItem[] = [];

      // 각 월별로 API 호출
      for (const dealYmd of monthsToSearch) {
        const params = new URLSearchParams({
          lawdCd,
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

      // 읍면동이 선택된 경우 필터링
      let filteredResults = allResults;
      if (selectedDong) {
        filteredResults = allResults.filter(item => {
          // dong 필드에 선택된 읍면동명이 포함되는지 확인
          return item.dong && item.dong.includes(selectedDong);
        });
      }

      setSearchResults(filteredResults);
      setTotalCount(filteredResults.length);

      if (filteredResults.length > 0) {
        const message = selectedDong
          ? `${selectedDong} 지역에서 ${filteredResults.length}건의 실거래가를 찾았습니다`
          : `${filteredResults.length}건의 실거래가를 찾았습니다`;
        showSuccess(message);
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

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* 네비게이션 */}
        <Navigation />
        <MobileNavigation />

        {/* 메인 컨테이너 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 조회 기간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  조회 기간
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="3m">최근 3개월</option>
                  <option value="6m">최근 6개월</option>
                  <option value="12m">최근 12개월</option>
                  <option value="2y">최근 2년</option>
                  <option value="3y">최근 3년</option>
                </select>
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
                  onClick={handleSearch}
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

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  검색 결과 ({totalCount}건)
                </h2>
              </div>

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        아파트명
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        거래금액
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        전용면적
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        층
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        거래일
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        주소
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {searchResults.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.aptName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {item.dealPriceFormatted}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            평당 {(item.pricePerPyeong / 10000).toLocaleString()}만원
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.area.toFixed(2)}㎡ ({item.areaPyeong}평)
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.floor}층
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {item.dealDate}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {item.address}
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
