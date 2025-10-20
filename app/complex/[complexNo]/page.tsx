"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Dialog } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";

// 무거운 차트 컴포넌트를 동적 로딩 (코드 스플리팅)
const RealPriceAnalysis = dynamic(() => import("@/components/RealPriceAnalysis"), {
  loading: () => <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
  ssr: false,
});

interface ComplexData {
  overview: any;
  articles: any;
  crawling_info?: any;
}

export default function ComplexDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const complexNo = params.complexNo as string;

  const [activeTab, setActiveTab] = useState<'properties' | 'realPrice'>('properties');
  const [data, setData] = useState<ComplexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{
    currentStep: string;
    status: string;
    processedArticles: number;
  } | null>(null);

  // 필터 상태
  const [filterTradeType, setFilterTradeType] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterDong, setFilterDong] = useState<string>('all');

  // 정렬 상태
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 페이지당 매물 수

  // Dialog 상태
  const [deleteDialog, setDeleteDialog] = useState(false);

  // 필터 변경 시 페이지 초기화 (Hooks는 항상 같은 순서로 호출되어야 함)
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTradeType, filterArea, filterDong, sortField, sortDirection]);

  useEffect(() => {
    fetchComplexData();
  }, [complexNo]);

  const fetchComplexData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/results?complexNo=${complexNo}`);
      const result = await response.json();

      console.log('API Response:', result);

      if (result.results && result.results.length > 0) {
        const complexData = result.results[0];
        console.log('Complex Data:', complexData);
        console.log('Articles:', complexData.articles);
        setData(complexData);
      } else {
        console.log('No data found for complex:', complexNo);
      }
    } catch (error) {
      console.error('Failed to fetch complex data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    setCrawling(true);

    // Show initial progress immediately
    setCrawlProgress({
      currentStep: '크롤링을 시작하고 있습니다...',
      status: 'crawling',
      processedArticles: 0,
    });

    // Simulate progress updates while waiting for response
    const messages = [
      '브라우저를 설정하고 있습니다...',
      '단지 정보를 수집하고 있습니다...',
      '매물 목록을 스크롤하고 있습니다...',
      '매물 데이터를 분석하고 있습니다...',
      '데이터를 처리하고 있습니다...',
    ];
    let messageIndex = 0;

    const progressInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCrawlProgress(prev => prev ? { ...prev, currentStep: messages[messageIndex] } : null);
    }, 3000);

    try {
      // Start crawl (this will take a while)
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexNumbers: complexNo,
          initiator: 'complex-detail',
        })
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (response.ok) {
        // Show final stats
        const articleCount = data.data?.totalArticles || 0;
        setCrawlProgress({
          currentStep: '✅ 크롤링이 완료되었습니다!',
          status: 'success',
          processedArticles: articleCount,
        });

        // Refresh data after completion
        await fetchComplexData();

        setTimeout(() => {
          showSuccess(`크롤링이 완료되었습니다!\n\n수집된 매물: ${articleCount}개`);
        }, 500);
      } else {
        showError('크롤링에 실패했습니다.');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Crawl error:', error);
      showError('크롤링 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => {
        setCrawling(false);
        setCrawlProgress(null);
      }, 2000); // Show final state for 2 seconds
    }
  };

  // Note: Real-time polling removed because /api/crawl is synchronous
  // Using simulated progress updates instead to provide better UX feedback

  const handleDelete = () => {
    setDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const loadingToast = showLoading('단지 삭제 중...');
    try {
      const response = await fetch(`/api/favorites?complexNo=${complexNo}`, {
        method: 'DELETE',
      });

      dismissToast(loadingToast);

      if (response.ok) {
        showSuccess('삭제되었습니다.');
        router.push('/complexes');
      } else {
        const data = await response.json();
        showError(`삭제에 실패했습니다: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Delete error:', error);
      showError('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteDialog(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    if (!price || price === 0) return '-';
    if (typeof price === 'string') return price;

    const priceNum = Number(price);
    const uk = Math.floor(priceNum / 10000);
    const man = priceNum % 10000;

    if (uk === 0) return `${man}만`;
    if (man === 0) return `${uk}억`;
    return `${uk}억 ${man}만`;
  };

  const formatArea = (area: number) => {
    if (!area) return '-';
    const pyeong = (area / 3.3058).toFixed(1);
    return `${area}㎡ (${pyeong}평)`;
  };

  const getTradeTypeLabel = (tradeType: string) => {
    // tradeTypeName이 이미 한글로 되어 있음
    return tradeType;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const articles = data?.articles || [];
  const crawlingInfo = data?.crawling_info || {};

  // 거래 유형별 통계
  const tradeStats = articles.reduce((acc: any, article: any) => {
    const type = article.tradeTypeName || '기타';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // 필터링된 매물
  const filteredArticles = articles.filter((article: any) => {
    if (filterTradeType !== 'all') {
      const tradeType = article.tradeTypeName;
      if (tradeType !== filterTradeType) return false;
    }

    if (filterArea !== 'all') {
      const area = article.area1;
      if (!area) return false;
      const pyeong = Math.floor(area / 3.3058);
      if (pyeong.toString() !== filterArea) return false;
    }

    if (filterDong !== 'all') {
      if (article.buildingName !== filterDong) return false;
    }

    return true;
  });

  // 정렬된 매물
  const sortedArticles = [...filteredArticles].sort((a: any, b: any) => {
    if (!sortField) return 0;

    let aVal: any, bVal: any;

    switch (sortField) {
      case 'tradeType':
        aVal = a.tradeTypeName || '';
        bVal = b.tradeTypeName || '';
        break;
      case 'area':
        aVal = a.area1 || 0;
        bVal = b.area1 || 0;
        break;
      case 'dong':
        aVal = a.buildingName || '';
        bVal = b.buildingName || '';
        break;
      case 'price':
        aVal = a.dealOrWarrantPrc || 0;
        bVal = b.dealOrWarrantPrc || 0;
        break;
      case 'date':
        aVal = a.articleConfirmYmd || a.cfmYmd || 0;
        bVal = b.articleConfirmYmd || b.cfmYmd || 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // 정렬 토글
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 정렬 아이콘
  const getSortIcon = (field: string) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // 페이지네이션
  const totalPages = Math.ceil(sortedArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedArticles = sortedArticles.slice(startIndex, endIndex);

  // 고유 면적 리스트
  const uniqueAreas = Array.from(new Set(
    articles.map((a: any) => {
      const area = a.area1;
      if (!area) return null;
      const pyeong = Math.floor(area / 3.3058);
      return pyeong;
    }).filter(Boolean)
  )).sort((a: any, b: any) => a - b);

  // 고유 동 리스트
  const uniqueDongs = Array.from(new Set(
    articles.map((a: any) => a.buildingName).filter(Boolean)
  )).sort();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 상단: 단지 개요 및 통계 */}
        <div className="mb-6 space-y-4">
          {/* 단지 기본 정보 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {overview.complexName || '단지명 없음'}
                </h2>
                {/* 기본 정보 */}
                <div className="space-y-2 mb-4">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>📍 단지번호: {complexNo}</span>
                    {(overview.totalHousehold || overview.totalHouseHoldCount) && (
                      <span>🏢 총 {(overview.totalHousehold || overview.totalHouseHoldCount).toLocaleString()}세대</span>
                    )}
                    {(overview.totalDong || overview.totalDongCount) && (
                      <span>🏗️ {overview.totalDong || overview.totalDongCount}개 동</span>
                    )}
                  </div>

                  {/* 사용승인일 */}
                  {overview.useApproveYmd && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>📅 사용승인일: {overview.useApproveYmd.toString().substring(0,4)}-{overview.useApproveYmd.toString().substring(4,6)}-{overview.useApproveYmd.toString().substring(6,8)}</span>
                    </div>
                  )}

                  {/* 좌표 정보 */}
                  {(overview.location?.latitude || overview.location?.longitude) && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>🗺️ 좌표: {overview.location.latitude?.toFixed(6)}, {overview.location.longitude?.toFixed(6)}</span>
                    </div>
                  )}

                  {/* 주소 정보 */}
                  {(overview.roadAddress || overview.jibunAddress || overview.address) && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>🏠 주소: {overview.roadAddress || overview.jibunAddress || overview.address}</span>
                    </div>
                  )}
                </div>

                {/* CSV 추가 정보 - 면적/가격 범위 */}
                {(overview.minArea || overview.maxArea || overview.minPrice || overview.maxPrice) && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(overview.minArea || overview.maxArea) && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">전용면적 범위</div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {overview.minArea && overview.maxArea
                            ? `${overview.minArea.toFixed(2)}㎡ ~ ${overview.maxArea.toFixed(2)}㎡`
                            : overview.minArea
                            ? `${overview.minArea.toFixed(2)}㎡`
                            : `${overview.maxArea.toFixed(2)}㎡`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {overview.minArea && overview.maxArea
                            ? `${(overview.minArea / 3.3058).toFixed(1)}평 ~ ${(overview.maxArea / 3.3058).toFixed(1)}평`
                            : overview.minArea
                            ? `${(overview.minArea / 3.3058).toFixed(1)}평`
                            : `${(overview.maxArea / 3.3058).toFixed(1)}평`}
                        </div>
                      </div>
                    )}

                    {(overview.minPrice || overview.maxPrice) && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">매매가 범위</div>
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {overview.minPrice && overview.maxPrice
                            ? `${formatPrice(overview.minPrice)} ~ ${formatPrice(overview.maxPrice)}`
                            : overview.minPrice
                            ? `${formatPrice(overview.minPrice)}`
                            : `${formatPrice(overview.maxPrice)}`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 크롤링 진행 상태 배너 */}
              {crawling && (
                <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">
                        ⏳ 크롤링 진행 중
                      </h3>
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        {crawlProgress?.currentStep || '크롤링을 시작하고 있습니다...'}
                        {crawlProgress?.status === 'crawling' && ' 🔍'}
                        {crawlProgress?.status === 'saving' && ' 💾'}
                      </p>
                    </div>
                    {crawlProgress && crawlProgress.processedArticles > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-blue-600 dark:text-blue-400">수집 매물</div>
                        <div className="text-lg font-bold text-blue-900 dark:text-blue-200">
                          {crawlProgress.processedArticles}개
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 액션 버튼 그룹 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCrawl}
                  disabled={crawling}
                  className={`px-4 py-2 rounded-lg transition-colors font-semibold text-sm ${
                    crawling
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {crawling ? '⏳ 수집중...' : '🔄 매물 새로고침'}
                </button>
                <button
                  onClick={() => setActiveTab('realPrice')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  📊 실거래가 수집
                </button>
                <Link
                  href={`/analytics?mode=single&complexNos=${complexNo}&autoRun=true`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  📈 데이터 분석
                </Link>
                <a
                  href={`https://new.land.naver.com/complexes/${complexNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  🔗 네이버부동산
                </a>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  🗑️ 단지 삭제
                </button>
              </div>
            </div>

            {/* 거래유형별 매물 건수 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <StatCard
                label="전체 매물"
                value={articles.length}
                color="blue"
              />
              <StatCard
                label="매매"
                value={tradeStats['매매'] || 0}
                color="red"
              />
              <StatCard
                label="전세"
                value={tradeStats['전세'] || 0}
                color="indigo"
              />
              <StatCard
                label="월세"
                value={tradeStats['월세'] || 0}
                color="green"
              />
            </div>

            {/* 평형별 타입 정보 */}
            {overview.pyeongs && Array.isArray(overview.pyeongs) && overview.pyeongs.length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span className="text-lg">📐</span>
                  평형별 타입 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {overview.pyeongs.map((pyeong: any, index: number) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                            {pyeong.pyeongName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {pyeong.pyeongName2}평
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          #{pyeong.pyeongNo}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">전용면적:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {pyeong.exclusiveArea}㎡
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">공급면적:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {pyeong.supplyArea}㎡
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'properties'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tl-xl'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🏠</span>
                <span>매물 정보</span>
                {articles.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                    {filteredArticles.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('realPrice')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'realPrice'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-xl'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                <span>실거래가 분석</span>
              </div>
            </button>
          </div>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="space-y-6">
          {/* 매물 정보 탭 */}
          {activeTab === 'properties' && (
            <div>
              {articles.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <div className="text-7xl mb-4">📭</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    매물 정보가 없습니다
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    매물 새로고침을 실행하여 최신 매물 정보를 수집하세요
                  </p>
                  <button
                    onClick={handleCrawl}
                    disabled={crawling}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                  >
                    {crawling ? '⏳ 수집중...' : '🔄 매물 새로고침'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 필터 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          거래유형
                        </label>
                        <select
                          value={filterTradeType}
                          onChange={(e) => setFilterTradeType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          <option value="매매">매매</option>
                          <option value="전세">전세</option>
                          <option value="월세">월세</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          평형
                        </label>
                        <select
                          value={filterArea}
                          onChange={(e) => setFilterArea(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          {uniqueAreas.map((area: any) => (
                            <option key={area} value={area}>{area}평형</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          동
                        </label>
                        <select
                          value={filterDong}
                          onChange={(e) => setFilterDong(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">전체</option>
                          {uniqueDongs.map((dong: any) => (
                            <option key={dong} value={dong}>{dong}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 매물 테이블 */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* 상단 스크롤바 */}
                    <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-700" id="table-scroll-top" onScroll={(e) => {
                      const bottomScroll = document.getElementById('table-scroll-bottom');
                      if (bottomScroll) bottomScroll.scrollLeft = e.currentTarget.scrollLeft;
                    }}>
                      <div style={{ height: '1px', width: '100%', minWidth: '1400px' }}></div>
                    </div>

                    {/* 실제 테이블 */}
                    <div className="overflow-x-auto" id="table-scroll-bottom" onScroll={(e) => {
                      const topScroll = document.getElementById('table-scroll-top');
                      if (topScroll) topScroll.scrollLeft = e.currentTarget.scrollLeft;
                    }}>
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                          <tr>
                            <th
                              onClick={() => handleSort('tradeType')}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              거래유형 {getSortIcon('tradeType')}
                            </th>
                            <th
                              onClick={() => handleSort('price')}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              가격 {getSortIcon('price')}
                            </th>
                            <th
                              onClick={() => handleSort('area')}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              면적 {getSortIcon('area')}
                            </th>
                            <th
                              onClick={() => handleSort('dong')}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              동/호 {getSortIcon('dong')}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              층
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              중개소
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">
                              중복
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              매물특징
                            </th>
                            <th
                              onClick={() => handleSort('date')}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              확인일 {getSortIcon('date')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {paginatedArticles.map((article: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  article.tradeTypeName === '매매'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : article.tradeTypeName === '전세'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {article.tradeTypeName}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {article.tradeTypeName === '월세' ? (
                                  <div className="text-sm">
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      보증 {formatPrice(article.dealOrWarrantPrc)}
                                    </div>
                                    <div className="text-blue-600 dark:text-blue-400">
                                      월 {formatPrice(article.rentPrc)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {formatPrice(article.dealOrWarrantPrc)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {formatArea(article.area1)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {article.buildingName || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {article.floorInfo || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {article.realtorName || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-300">
                                {article.sameAddrCnt ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                    {article.sameAddrCnt}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={article.articleFeatureDesc || ''}>
                                {article.articleFeatureDesc || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {(() => {
                                  const date = article.articleConfirmYmd || article.cfmYmd;
                                  return date ?
                                    `${date.toString().substring(0,4)}.${date.toString().substring(4,6)}.${date.toString().substring(6,8)}`
                                    : '-';
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          전체 {sortedArticles.length}개 중 {startIndex + 1}-{Math.min(endIndex, sortedArticles.length)}번째 표시
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            처음
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            이전
                          </button>
                          <span className="px-4 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            다음
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            마지막
                          </button>
                        </div>
                      </div>
                    )}

                    {totalPages <= 1 && (
                      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400 text-center">
                        전체 {articles.length}개 중 {sortedArticles.length}개 표시
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 실거래가 분석 탭 */}
          {activeTab === 'realPrice' && (
            <RealPriceAnalysis complexNo={complexNo} />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="단지 삭제"
        description="이 단지를 즐겨찾기에서 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
      </div>
    </AuthGuard>
  );
}

// 통계 카드 컴포넌트
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: any = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
        {value}
      </div>
    </div>
  );
}
