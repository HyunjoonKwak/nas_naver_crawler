"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { ThemeToggle } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import { Search, Loader2, TrendingUp, Home, Calendar, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/real-price-api";

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
  const [lawdCd, setLawdCd] = useState("11110"); // 기본값: 서울 종로구
  const [dealYmd, setDealYmd] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}${month}`;
  });
  const [aptName, setAptName] = useState("");
  const [searchResults, setSearchResults] = useState<RealPriceItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 검색 실행
  const handleSearch = async () => {
    if (!lawdCd || !dealYmd) {
      showError("법정동코드와 거래년월을 입력해주세요");
      return;
    }

    const loadingToast = showLoading("실거래가 조회 중...");
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        lawdCd,
        dealYmd,
        ...(aptName && { aptName }),
      });

      const response = await fetch(`/api/real-price/search?${params.toString()}`);
      const data = await response.json();

      dismissToast(loadingToast);

      if (!response.ok) {
        throw new Error(data.error || "검색 실패");
      }

      setSearchResults(data.data.items);
      setTotalCount(data.data.totalCount);
      showSuccess(`${data.data.items.length}건의 실거래가를 찾았습니다`);
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
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* 네비게이션 */}
        <Navigation />
        <MobileNavigation />

        {/* 메인 컨테이너 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  아파트 실거래가 검색
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  국토교통부 실거래가 데이터를 기반으로 아파트 거래 정보를 조회합니다
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* 검색 폼 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 법정동코드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  법정동코드 (5자리)
                </label>
                <input
                  type="text"
                  value={lawdCd}
                  onChange={(e) => setLawdCd(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="11110"
                  maxLength={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  예: 서울 종로구 = 11110
                </p>
              </div>

              {/* 거래년월 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  거래년월 (YYYYMM)
                </label>
                <input
                  type="text"
                  value={dealYmd}
                  onChange={(e) => setDealYmd(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="202501"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
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
                  disabled={isLoading}
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

            {/* 법정동코드 안내 */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>법정동코드 확인:</strong>{" "}
                <a
                  href="https://www.code.go.kr/stdcode/regCodeL.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600"
                >
                  행정표준코드관리시스템
                </a>
                에서 확인 가능합니다.
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
