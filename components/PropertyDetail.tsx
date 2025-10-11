"use client";

import { useState } from "react";

interface PropertyDetailProps {
  data: any;
  onClose: () => void;
}

export default function PropertyDetail({ data, onClose }: PropertyDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'articles'>('overview');

  // 디버깅: 데이터 구조 확인
  console.log('PropertyDetail data:', data);
  console.log('Is Array?', Array.isArray(data));
  
  // 데이터가 배열인 경우 첫 번째 요소 사용
  const complexData = Array.isArray(data) ? data[0] : data;
  
  console.log('complexData:', complexData);
  console.log('overview:', complexData?.overview);
  
  // 단지 개요 정보 추출
  const overview = complexData?.overview || {};
  const articles = complexData?.articles?.articleList || [];
  const crawlingInfo = complexData?.crawling_info || {};

  // 거래 유형 변환
  const getTradeTypeLabel = (tradeType: string) => {
    const types: any = {
      'A1': '매매',
      'B1': '전세',
      'B2': '월세',
      'B3': '단기임대',
    };
    return types[tradeType] || tradeType;
  };

  // 가격 포맷
  const formatPrice = (price: number, tradeType: string) => {
    if (!price) return '-';
    
    if (tradeType === 'A1') {
      // 매매: 억 단위
      const uk = Math.floor(price / 10000);
      const man = price % 10000;
      return man > 0 ? `${uk}억 ${man}만` : `${uk}억`;
    } else {
      // 전월세: 억 단위
      const uk = Math.floor(price / 10000);
      const man = price % 10000;
      return man > 0 ? `${uk}억 ${man}만` : `${uk}억`;
    }
  };

  // 면적 포맷
  const formatArea = (area: number) => {
    if (!area) return '-';
    const pyeong = (area / 3.3058).toFixed(1);
    return `${area}㎡ (${pyeong}평)`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {overview.complexName || '단지 정보'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              단지번호: {crawlingInfo.complex_no || '-'} | 크롤링: {crawlingInfo.crawling_date ? new Date(crawlingInfo.crawling_date).toLocaleString('ko-KR') : '-'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            📋 단지 정보
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'articles'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            🏘️ 매물 목록 ({articles.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' ? (
            /* 단지 개요 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoCard title="기본 정보">
                <InfoRow label="단지명" value={overview.complexName} />
                <InfoRow label="세대수" value={overview.totalHouseHoldCount ? `${overview.totalHouseHoldCount}세대` : '-'} />
                <InfoRow label="동수" value={overview.totalDongCount ? `${overview.totalDongCount}동` : '-'} />
                <InfoRow label="사용승인일" value={overview.useApproveYmd} />
              </InfoCard>

              <InfoCard title="면적 정보">
                <InfoRow label="최소 면적" value={overview.minArea ? formatArea(overview.minArea) : '-'} />
                <InfoRow label="최대 면적" value={overview.maxArea ? formatArea(overview.maxArea) : '-'} />
              </InfoCard>

              <InfoCard title="가격 정보">
                <InfoRow 
                  label="최저가" 
                  value={overview.minPrice ? formatPrice(overview.minPrice, 'A1') : '-'} 
                />
                <InfoRow 
                  label="최고가" 
                  value={overview.maxPrice ? formatPrice(overview.maxPrice, 'A1') : '-'} 
                />
              </InfoCard>

              <InfoCard title="위치 정보">
                <InfoRow label="위도" value={overview.latitude} />
                <InfoRow label="경도" value={overview.longitude} />
              </InfoCard>
            </div>
          ) : (
            /* 매물 목록 */
            <div className="overflow-x-auto">
              {articles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg mb-2">📭 등록된 매물이 없습니다</p>
                  <p className="text-sm">현재 거래 중인 매물이 없습니다.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        거래유형
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        가격
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        면적
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        층
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        방향
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        등록일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {articles.map((article: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            article.tradeTypeName === '매매' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : article.tradeTypeName === '전세'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {getTradeTypeLabel(article.tradeType)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {article.tradeType === 'B2' ? (
                            // 월세: 보증금/월세
                            <div>
                              <div>{formatPrice(article.dealOrWarrantPrc, article.tradeType)}</div>
                              <div className="text-xs text-gray-500">/ {formatPrice(article.rentPrc, article.tradeType)}</div>
                            </div>
                          ) : (
                            formatPrice(article.dealOrWarrantPrc, article.tradeType)
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {formatArea(article.area1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {article.floorInfo || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {article.direction || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {article.cfmYmd ? 
                            `${article.cfmYmd.substring(0,4)}.${article.cfmYmd.substring(4,6)}.${article.cfmYmd.substring(6,8)}` 
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {value || '-'}
      </span>
    </div>
  );
}

