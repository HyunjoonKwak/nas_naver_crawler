"use client";

import { useState, useEffect } from "react";

interface PropertyDetailProps {
  data: any;
  onClose: () => void;
  onRefresh?: (complexNo: string) => void;
  onDelete?: (complexNo: string) => void;
  complexNo?: string; // 단지번호 직접 전달 (빈 상태 대응)
}

export default function PropertyDetail({ data, onClose, onRefresh, onDelete, complexNo: propComplexNo }: PropertyDetailProps) {
  const [addressInfo, setAddressInfo] = useState<any>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 필터 상태
  const [filterTradeType, setFilterTradeType] = useState<string>('all');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterDong, setFilterDong] = useState<string>('all');

  // 정렬 상태
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 디버깅: 데이터 구조 확인
  console.log('PropertyDetail data:', data);
  console.log('Is Array?', Array.isArray(data));

  // 데이터가 null인 경우 (크롤링 데이터 없음)
  const hasNoData = !data;

  // 데이터가 배열인 경우 첫 번째 요소 사용
  const complexData = Array.isArray(data) ? data[0] : data;

  console.log('complexData:', complexData);
  console.log('overview:', complexData?.overview);

  // 단지 개요 정보 추출
  const overview = complexData?.overview || {};
  const articles = complexData?.articles?.articleList || [];
  const crawlingInfo = complexData?.crawling_info || {};

  // 위도/경도로 주소 조회
  useEffect(() => {
    const fetchAddress = async () => {
      if (overview.latitude && overview.longitude) {
        setLoadingAddress(true);
        try {
          const response = await fetch(
            `/api/geocode?latitude=${overview.latitude}&longitude=${overview.longitude}`
          );
          if (response.ok) {
            const result = await response.json();
            setAddressInfo(result.address);
          }
        } catch (error: any) {
          console.error('Failed to fetch address:', error);
        } finally {
          setLoadingAddress(false);
        }
      }
    };
    fetchAddress();
  }, [overview.latitude, overview.longitude]);

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

  // 가격 표시 (이미 포맷된 문자열 또는 숫자 처리)
  const formatPrice = (price: number | string | null | undefined) => {
    if (!price || price === 0) return '-';
    
    // 이미 "X억 X,XXX" 형식의 문자열이면 그대로 반환
    if (typeof price === 'string') {
      return price;
    }
    
    // 숫자인 경우 포맷팅
    if (isNaN(Number(price))) return '-';
    const priceNum = Number(price);
    const uk = Math.floor(priceNum / 10000);
    const man = priceNum % 10000;
    
    if (uk === 0) {
      return `${man}만`;
    } else if (man === 0) {
      return `${uk}억`;
    } else {
      return `${uk}억 ${man}만`;
    }
  };

  // 면적 포맷
  const formatArea = (area: number) => {
    if (!area) return '-';
    const pyeong = (area / 3.3058).toFixed(1);
    return `${area}㎡ (${pyeong}평)`;
  };

  // 고유한 면적(평형) 리스트 추출
  const uniqueAreas = Array.from(new Set(
    articles.map((a: any) => {
      const area = a.area1;
      if (!area) return null;
      const pyeong = Math.floor(area / 3.3058);
      return pyeong;
    }).filter(Boolean)
  )).sort((a: any, b: any) => a - b);

  // 고유한 동 리스트 추출
  const uniqueDongs = Array.from(new Set(
    articles.map((a: any) => a.buildingName).filter(Boolean)
  )).sort();

  // 필터링된 매물 목록
  const filteredArticles = articles.filter((article: any) => {
    // 거래 유형 필터
    if (filterTradeType !== 'all') {
      const tradeType = article.tradeTypeCode || article.tradeType;
      if (tradeType !== filterTradeType) return false;
    }

    // 면적 필터
    if (filterArea !== 'all') {
      const area = article.area1;
      if (!area) return false;
      const pyeong = Math.floor(area / 3.3058);
      if (pyeong.toString() !== filterArea) return false;
    }

    // 동 필터
    if (filterDong !== 'all') {
      if (article.buildingName !== filterDong) return false;
    }

    return true;
  });

  // 정렬된 매물 목록
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

  // 정렬 토글 핸들러
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

  // 거래 유형별 통계
  const tradeStats = articles.reduce((acc: any, article: any) => {
    const type = article.tradeTypeCode || article.tradeType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const statsText = [
    tradeStats['A1'] ? `매매 ${tradeStats['A1']}` : null,
    tradeStats['B1'] ? `전세 ${tradeStats['B1']}` : null,
    tradeStats['B2'] ? `월세 ${tradeStats['B2']}` : null,
  ].filter(Boolean).join(' | ');

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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.complexName || '단지 정보'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                단지번호: {crawlingInfo.complex_no || overview.complexNo || '-'} | 크롤링: {crawlingInfo.crawling_date ? new Date(crawlingInfo.crawling_date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Action Buttons */}
          {(onRefresh || onDelete) && (
            <div className="flex gap-3">
              {onRefresh && (
                <button
                  onClick={async () => {
                    const complexNo = crawlingInfo.complex_no || overview.complexNo;
                    if (complexNo) {
                      setRefreshing(true);
                      await onRefresh(complexNo);
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                    refreshing
                      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {refreshing ? '⏳ 새로고침 중...' : '🔄 매물 새로고침'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    const complexNo = crawlingInfo.complex_no || overview.complexNo;
                    if (complexNo && window.confirm('이 단지를 삭제하시겠습니까?')) {
                      onDelete(complexNo);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  🗑️ 단지 삭제
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content - 단지정보와 매물목록을 한 페이지에 표시 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {hasNoData ? (
            /* 크롤링 데이터가 없는 경우 */
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="text-center max-w-md">
                <div className="text-8xl mb-6">📭</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  크롤링 데이터가 없습니다
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  이 단지의 매물 정보를 수집하려면 크롤링을 실행해주세요.
                </p>

                {onRefresh && (
                  <div className="space-y-4">
                    <button
                      onClick={async () => {
                        const complexNo = propComplexNo || crawlingInfo.complex_no || overview.complexNo;
                        if (complexNo && onRefresh) {
                          setRefreshing(true);
                          await onRefresh(complexNo);
                          setRefreshing(false);
                        }
                      }}
                      disabled={refreshing}
                      className={`w-full max-w-xs px-6 py-4 rounded-lg transition-all font-bold text-lg ${
                        refreshing
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      }`}
                    >
                      {refreshing ? '⏳ 크롤링 중...' : '🚀 지금 크롤링 시작'}
                    </button>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-left">
                      <p className="text-blue-800 dark:text-blue-300 font-medium mb-2">
                        💡 크롤링이란?
                      </p>
                      <p className="text-blue-700 dark:text-blue-400">
                        네이버 부동산에서 해당 단지의 매물 정보(가격, 면적, 층수 등)를 자동으로 수집하는 기능입니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 단지 개요 - 컴팩트한 가로 배치 */}
              <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              📋 단지 정보
            </h3>

            {/* 기본 정보 - 한 줄로 배치 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CompactInfo label="세대수" value={overview.totalHouseHoldCount ? `${overview.totalHouseHoldCount}세대` : '-'} />
                <CompactInfo label="동수" value={overview.totalDongCount ? `${overview.totalDongCount}동` : '-'} />
                <CompactInfo label="사용승인일" value={overview.useApproveYmd || '-'} />
                <CompactInfo label="면적" value={overview.minArea && overview.maxArea ? `${(overview.minArea / 3.3058).toFixed(0)}-${(overview.maxArea / 3.3058).toFixed(0)}평` : '-'} />
              </div>
            </div>

            {/* 가격 정보 - 한 줄로 배치 */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-2 gap-4">
                <CompactInfo label="최저가" value={formatPrice(overview.minPrice)} valueClass="text-green-700 dark:text-green-400 font-bold" />
                <CompactInfo label="최고가" value={formatPrice(overview.maxPrice)} valueClass="text-red-700 dark:text-red-400 font-bold" />
              </div>
            </div>

            {/* 위치 정보 - 필요시만 표시 */}
            {(overview.latitude || overview.longitude || addressInfo) && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📍</div>
                  <div className="flex-1 space-y-1">
                    {loadingAddress ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400">주소 조회 중...</div>
                    ) : addressInfo?.fullAddress ? (
                      <>
                        <div className="text-sm text-gray-900 dark:text-white font-medium">
                          {addressInfo.fullAddress}
                        </div>
                        {(addressInfo.beopjungdong || addressInfo.haengjeongdong) && (
                          <div className="flex gap-2 flex-wrap">
                            {addressInfo.beopjungdong && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                {addressInfo.beopjungdong}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : overview.latitude && overview.longitude ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        위도: {overview.latitude}, 경도: {overview.longitude}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

          {/* 매물 목록 - 가시성 강화 */}
          <div>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    🏘️ 매물 목록
                  </h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-white/90 text-lg font-semibold">
                      전체 <span className="text-3xl font-bold text-yellow-300 mx-1">{articles.length}</span>개
                    </div>
                    {statsText && (
                      <div className="text-white/80 text-base">
                        {statsText}
                      </div>
                    )}
                    {filteredArticles.length !== articles.length && (
                      <div className="bg-yellow-400/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span className="text-yellow-200 font-bold text-base">
                          필터링: {filteredArticles.length}개
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 필터 초기화 버튼 */}
                {(filterTradeType !== 'all' || filterArea !== 'all' || filterDong !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterTradeType('all');
                      setFilterArea('all');
                      setFilterDong('all');
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg transition-colors font-medium"
                  >
                    🔄 필터 초기화
                  </button>
                )}
              </div>
            </div>

            {/* 필터 UI */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 거래유형 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    거래유형
                  </label>
                  <select
                    value={filterTradeType}
                    onChange={(e) => setFilterTradeType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {tradeStats['A1'] && <option value="A1">매매 ({tradeStats['A1']})</option>}
                    {tradeStats['B1'] && <option value="B1">전세 ({tradeStats['B1']})</option>}
                    {tradeStats['B2'] && <option value="B2">월세 ({tradeStats['B2']})</option>}
                    {tradeStats['B3'] && <option value="B3">단기임대 ({tradeStats['B3']})</option>}
                  </select>
                </div>

                {/* 평형 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    평형
                  </label>
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {uniqueAreas.map((pyeong: any) => (
                      <option key={pyeong} value={pyeong}>
                        {pyeong}평형
                      </option>
                    ))}
                  </select>
                </div>

                {/* 동 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    동
                  </label>
                  <select
                    value={filterDong}
                    onChange={(e) => setFilterDong(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    {uniqueDongs.map((dong: any) => (
                      <option key={dong} value={dong}>
                        {dong}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {articles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg mb-2">📭 등록된 매물이 없습니다</p>
                  <p className="text-sm">현재 거래 중인 매물이 없습니다.</p>
                </div>
              ) : sortedArticles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg mb-2">🔍 필터 조건에 맞는 매물이 없습니다</p>
                  <p className="text-sm">다른 조건으로 검색해보세요.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('tradeType')}
                      >
                        <div className="flex items-center gap-1">
                          거래유형
                          <span className="text-sm">{getSortIcon('tradeType')}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        가격
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('area')}
                      >
                        <div className="flex items-center gap-1">
                          면적
                          <span className="text-sm">{getSortIcon('area')}</span>
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('dong')}
                      >
                        <div className="flex items-center gap-1">
                          동
                          <span className="text-sm">{getSortIcon('dong')}</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        층
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        방향
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          매물확인일
                          <span className="text-sm">{getSortIcon('date')}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedArticles.map((article: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            (article.tradeTypeCode || article.tradeType) === 'A1'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : (article.tradeTypeCode || article.tradeType) === 'B1'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {getTradeTypeLabel(article.tradeTypeCode || article.tradeType)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {(article.tradeTypeCode || article.tradeType) === 'B2' ? (
                            // 월세: 보증금/월세
                            <div>
                              <div className="text-gray-700 dark:text-gray-300">
                                보증금 {formatPrice(article.dealOrWarrantPrc)}
                              </div>
                              <div className="text-blue-600 dark:text-blue-400 font-semibold">
                                월세 {formatPrice(article.rentPrc)}
                              </div>
                            </div>
                          ) : (
                            formatPrice(article.dealOrWarrantPrc)
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {formatArea(article.area1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {article.buildingName || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {article.floorInfo || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {article.direction || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
              )}
            </div>
          </div>
            </>
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

function CompactInfo({ label, value, valueClass }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">{label}</div>
      <div className={`text-base font-bold ${valueClass || 'text-gray-900 dark:text-white'}`}>
        {value || '-'}
      </div>
    </div>
  );
}

