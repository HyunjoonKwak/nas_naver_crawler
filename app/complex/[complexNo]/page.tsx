"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RealPriceAnalysis from "@/components/RealPriceAnalysis";

interface ComplexData {
  overview: any;
  articles: any;
  crawling_info?: any;
}

export default function ComplexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const complexNo = params.complexNo as string;

  const [activeTab, setActiveTab] = useState<'properties' | 'realPrice'>('properties');
  const [data, setData] = useState<ComplexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);

  // 필터 상태
  const [filterTradeType, setFilterTradeType] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterDong, setFilterDong] = useState<string>('all');

  // 정렬 상태
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchComplexData();
  }, [complexNo]);

  const fetchComplexData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/results');
      const result = await response.json();

      if (result.results) {
        const complexData = result.results.find((r: any) => {
          const data = Array.isArray(r.data) ? r.data[0] : r.data;
          return data?.overview?.complexNo === complexNo;
        });

        if (complexData) {
          const parsedData = Array.isArray(complexData.data) ? complexData.data[0] : complexData.data;
          setData(parsedData);
        }
      }
    } catch (error) {
      console.error('Failed to fetch complex data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNo })
      });

      if (response.ok) {
        alert('크롤링이 완료되었습니다!');
        await fetchComplexData();
      } else {
        alert('크롤링에 실패했습니다.');
      }
    } catch (error) {
      console.error('Crawl error:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 단지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNo })
      });

      if (response.ok) {
        alert('삭제되었습니다.');
        router.push('/complexes');
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
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
    const types: any = {
      'A1': '매매',
      'B1': '전세',
      'B2': '월세',
      'B3': '단기임대',
    };
    return types[tradeType] || tradeType;
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
    const type = article.tradeTypeCode || article.tradeType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // 필터링된 매물
  const filteredArticles = articles.filter((article: any) => {
    if (filterTradeType !== 'all') {
      const tradeType = article.tradeTypeCode || article.tradeType;
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
        aVal = a.tradeTypeCode || a.tradeType;
        bVal = b.tradeTypeCode || b.tradeType;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/complexes" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  🏘️
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {overview.complexName || '단지 상세'}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    단지번호: {complexNo}
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/complexes"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 목록
              </Link>
            </div>
          </div>
        </div>
      </nav>

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
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>📍 단지번호: {complexNo}</span>
                  {overview.totalHouseHoldCount && (
                    <span>🏢 총 {overview.totalHouseHoldCount}세대</span>
                  )}
                  {overview.totalDongCount && (
                    <span>🏗️ {overview.totalDongCount}개 동</span>
                  )}
                  {overview.useApproveYmd && (
                    <span>📅 {overview.useApproveYmd.toString().substring(0,4)}년 준공</span>
                  )}
                </div>
              </div>

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
                <a
                  href={`https://new.land.naver.com/complexes/${complexNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold text-sm"
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
                value={tradeStats['A1'] || 0}
                color="red"
              />
              <StatCard
                label="전세"
                value={tradeStats['B1'] || 0}
                color="indigo"
              />
              <StatCard
                label="월세"
                value={tradeStats['B2'] || 0}
                color="green"
              />
            </div>
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
                          <option value="A1">매매</option>
                          <option value="B1">전세</option>
                          <option value="B2">월세</option>
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
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th
                              onClick={() => handleSort('tradeType')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              거래유형 {getSortIcon('tradeType')}
                            </th>
                            <th
                              onClick={() => handleSort('price')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              가격 {getSortIcon('price')}
                            </th>
                            <th
                              onClick={() => handleSort('area')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              면적 {getSortIcon('area')}
                            </th>
                            <th
                              onClick={() => handleSort('dong')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              동/호 {getSortIcon('dong')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              층
                            </th>
                            <th
                              onClick={() => handleSort('date')}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              확인일 {getSortIcon('date')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {sortedArticles.map((article: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  (article.tradeTypeCode || article.tradeType) === 'A1'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : (article.tradeTypeCode || article.tradeType) === 'B1'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                  {getTradeTypeLabel(article.tradeTypeCode || article.tradeType)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {(article.tradeTypeCode || article.tradeType) === 'B2' ? (
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {formatArea(article.area1)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {article.buildingName || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {article.floorInfo || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400 text-center">
                      전체 {articles.length}개 중 {sortedArticles.length}개 표시
                    </div>
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
    </div>
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
