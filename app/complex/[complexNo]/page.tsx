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

  const [activeTab, setActiveTab] = useState<'properties' | 'realPrice' | 'overview'>('properties');
  const [data, setData] = useState<ComplexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const articles = data?.articles?.articleList || [];
  const crawlingInfo = data?.crawling_info || {};

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
              <button
                onClick={handleCrawl}
                disabled={crawling}
                className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
                  crawling
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {crawling ? '⏳ 크롤링 중...' : '🔄 크롤링'}
              </button>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                    {articles.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('realPrice')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'realPrice'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📊</span>
                <span>실거래가 분석</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tr-xl'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">📋</span>
                <span>단지 개요</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
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
                    크롤링을 실행하여 매물 정보를 수집하세요
                  </p>
                  <button
                    onClick={handleCrawl}
                    disabled={crawling}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all font-semibold shadow-lg"
                  >
                    {crawling ? '⏳ 크롤링 중...' : '🚀 크롤링 시작'}
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">거래유형</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">가격</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">면적</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">동/호</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">층</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {articles.map((article: any, index: number) => (
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
                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                              {formatPrice(article.dealOrWarrantPrc)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {formatArea(article.area1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {article.buildingName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {article.floorInfo || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 실거래가 분석 탭 */}
          {activeTab === 'realPrice' && (
            <RealPriceAnalysis complexNo={complexNo} />
          )}

          {/* 단지 개요 탭 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📋 단지 기본 정보
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="단지명" value={overview.complexName} />
                  <InfoRow label="단지번호" value={overview.complexNo} />
                  <InfoRow label="총 세대수" value={overview.totalHouseHoldCount ? `${overview.totalHouseHoldCount}세대` : '-'} />
                  <InfoRow label="총 동수" value={overview.totalDongCount ? `${overview.totalDongCount}동` : '-'} />
                  <InfoRow label="건축년도" value={overview.useApproveYmd ? `${overview.useApproveYmd.toString().substring(0,4)}년` : '-'} />
                  <InfoRow label="최소 면적" value={overview.minArea ? formatArea(overview.minArea) : '-'} />
                  <InfoRow label="최대 면적" value={overview.maxArea ? formatArea(overview.maxArea) : '-'} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {value || '-'}
      </span>
    </div>
  );
}
