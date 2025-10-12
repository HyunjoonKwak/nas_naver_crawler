"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FavoriteComplex {
  complexNo: string;
  complexName?: string;
  addedAt: string;
  lastCrawledAt?: string;
  articleCount?: number;
}

interface ComplexData {
  overview: any;
  articles: any;
}

export default function ComplexesPage() {
  const [favorites, setFavorites] = useState<FavoriteComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlingAll, setCrawlingAll] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<{ complexNo: string; data: ComplexData } | null>(null);
  
  // 단지 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComplexNo, setNewComplexNo] = useState("");
  const [newComplexName, setNewComplexName] = useState("");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/favorites');
      const data = await response.json();
      setFavorites(data.favorites || []);
      console.log('[Dashboard] Favorites loaded:', data.favorites?.length || 0);
    } catch (error) {
      console.error('[Dashboard] Failed to fetch favorites:', error);
      setFavorites([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!newComplexNo.trim()) {
      alert('단지번호를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexNo: newComplexNo.trim(),
          complexName: newComplexName.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchFavorites();
        setNewComplexNo("");
        setNewComplexName("");
        setShowAddForm(false);
      } else {
        alert(data.error || '단지 추가 실패');
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
      alert('단지 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteFavorite = async (complexNo: string) => {
    const confirmed = window.confirm('이 단지를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/favorites?complexNo=${complexNo}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFavorites();
      } else {
        const data = await response.json();
        alert(data.error || '단지 삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error);
      alert('단지 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCrawlComplex = async (complexNo: string) => {
    setCrawling(complexNo);
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNo })
      });

      const data = await response.json();

      if (response.ok) {
        // 단지 정보 업데이트
        await updateFavoriteInfo(complexNo);
        alert(`${complexNo} 크롤링 완료`);
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(null);
    }
  };

  const handleCrawlAll = async () => {
    if (favorites.length === 0) {
      alert('등록된 단지가 없습니다.');
      return;
    }

    const confirmed = window.confirm(`${favorites.length}개 단지를 모두 크롤링하시겠습니까?`);
    if (!confirmed) return;

    setCrawlingAll(true);
    const complexNos = favorites.map(f => f.complexNo).join(',');

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNos })
      });

      const data = await response.json();

      if (response.ok) {
        // 모든 단지 정보 업데이트
        for (const complexNo of favorites.map(f => f.complexNo)) {
          await updateFavoriteInfo(complexNo);
        }
        alert('전체 크롤링 완료');
        await fetchFavorites();
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl all:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawlingAll(false);
    }
  };

  const updateFavoriteInfo = async (complexNo: string) => {
    try {
      // 최신 크롤링 데이터 조회
      const response = await fetch('/api/results');
      const data = await response.json();
      const results = data.results || [];

      // 해당 단지의 최신 데이터 찾기
      for (const result of results) {
        const resultData = Array.isArray(result.data) ? result.data[0] : result.data;
        if (resultData?.overview?.complexNo === complexNo) {
          // 단지 정보 업데이트
          await fetch('/api/favorites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              complexNo,
              complexName: resultData.overview.complexName,
              articleCount: resultData.articles?.articleList?.length || 0
            })
          });
          break;
        }
      }
    } catch (error) {
      console.error('Failed to update favorite info:', error);
    }
  };

  const handleViewDetail = async (complexNo: string) => {
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      const results = data.results || [];

      // 해당 단지의 최신 데이터 찾기
      for (const result of results) {
        const resultData = Array.isArray(result.data) ? result.data[0] : result.data;
        if (resultData?.overview?.complexNo === complexNo) {
          setSelectedComplex({
            complexNo,
            data: resultData
          });
          return;
        }
      }

      alert('해당 단지의 크롤링 데이터가 없습니다. 먼저 크롤링을 실행해주세요.');
    } catch (error) {
      console.error('Failed to load complex data:', error);
      alert('데이터 조회 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  🏘️
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    단지 목록
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    관심있는 단지를 등록하고 매물을 추적하세요
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
              >
                ← 홈
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
              >
                📚 히스토리
              </Link>
              <Link
                href="/scheduler"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
              >
                ⏰ 스케줄러
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                ➕ 단지 추가
              </button>
              <button
                onClick={handleCrawlAll}
                disabled={crawlingAll || favorites.length === 0}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  crawlingAll || favorites.length === 0
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {crawlingAll ? '⏳ 크롤링 중...' : '🔄 전체 크롤링'}
              </button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              등록된 단지: <span className="font-bold text-blue-600 dark:text-blue-400">{favorites.length}개</span>
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComplexNo}
                  onChange={(e) => setNewComplexNo(e.target.value)}
                  placeholder="단지번호 (예: 22065)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFavorite()}
                />
                <input
                  type="text"
                  value={newComplexName}
                  onChange={(e) => setNewComplexName(e.target.value)}
                  placeholder="단지명 (선택사항)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFavorite()}
                />
                <button
                  onClick={handleAddFavorite}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  추가
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewComplexNo("");
                    setNewComplexName("");
                  }}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Complex Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              등록된 선호 단지가 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              "단지 추가" 버튼을 클릭하여 관심있는 단지를 등록하세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite.complexNo}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {favorite.complexName || `단지 ${favorite.complexNo}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📌 {favorite.complexNo}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>등록일:</span>
                    <span>{formatDate(favorite.addedAt)}</span>
                  </div>
                  {favorite.lastCrawledAt && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>마지막 수집:</span>
                      <span>{formatDate(favorite.lastCrawledAt)}</span>
                    </div>
                  )}
                  {favorite.articleCount !== undefined && (
                    <div className="flex justify-between font-semibold text-blue-600 dark:text-blue-400">
                      <span>매물 수:</span>
                      <span>{favorite.articleCount}개</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetail(favorite.complexNo)}
                    className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors text-sm font-medium"
                  >
                    📋 상세보기
                  </button>
                  <button
                    onClick={() => handleCrawlComplex(favorite.complexNo)}
                    disabled={crawling === favorite.complexNo}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      crawling === favorite.complexNo
                        ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                        : 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400'
                    }`}
                  >
                    {crawling === favorite.complexNo ? '⏳' : '🔄'}
                  </button>
                  <button
                    onClick={() => handleDeleteFavorite(favorite.complexNo)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Complex Detail Modal */}
      {selectedComplex && (
        <ComplexDetailModal
          complexNo={selectedComplex.complexNo}
          data={selectedComplex.data}
          onClose={() => setSelectedComplex(null)}
        />
      )}
    </div>
  );
}

// Complex Detail Modal Component
function ComplexDetailModal({ 
  complexNo, 
  data, 
  onClose 
}: { 
  complexNo: string; 
  data: ComplexData; 
  onClose: () => void;
}) {
  const overview = data.overview || {};
  const articles = data.articles?.articleList || [];
  const [addressInfo, setAddressInfo] = useState<any>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

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
        } catch (error) {
          console.error('Failed to fetch address:', error);
        } finally {
          setLoadingAddress(false);
        }
      }
    };
    fetchAddress();
  }, [overview.latitude, overview.longitude]);

  const formatPrice = (price: number | string | null | undefined) => {
    if (!price || price === 0) return '-';
    if (typeof price === 'string') return price;
    if (isNaN(Number(price))) return '-';
    
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
    const types: any = { 'A1': '매매', 'B1': '전세', 'B2': '월세', 'B3': '단기임대' };
    return types[tradeType] || tradeType;
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
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {overview.complexName || `단지 ${complexNo}`}
            </h2>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                단지번호: {complexNo}
              </p>
              {loadingAddress ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📍 주소 조회 중...
                </p>
              ) : addressInfo ? (
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-0.5">
                  {addressInfo.fullAddress && (
                    <p className="flex items-start gap-1">
                      <span className="text-gray-400">📍</span>
                      <span>{addressInfo.fullAddress}</span>
                    </p>
                  )}
                  {(addressInfo.beopjungdong || addressInfo.haengjeongdong) && (
                    <p className="flex items-center gap-2 text-xs">
                      {addressInfo.beopjungdong && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          법정동: {addressInfo.beopjungdong}
                        </span>
                      )}
                      {addressInfo.haengjeongdong && addressInfo.haengjeongdong !== addressInfo.beopjungdong && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                          행정동: {addressInfo.haengjeongdong}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* 단지 정보 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">📋 단지 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InfoCard title="세대수" value={`${overview.totalHouseHoldCount || '-'}세대`} />
              <InfoCard title="동수" value={`${overview.totalDongCount || '-'}동`} />
              <InfoCard title="사용승인일" value={overview.useApproveYmd || '-'} />
              <InfoCard title="최저가" value={formatPrice(overview.minPrice)} />
              <InfoCard title="최고가" value={formatPrice(overview.maxPrice)} />
              <InfoCard title="최소면적" value={formatArea(overview.minArea)} />
              <InfoCard title="최대면적" value={formatArea(overview.maxArea)} />
              <InfoCard title="매물수" value={`${articles.length}개`} />
            </div>
          </div>

          {/* 매물 목록 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🏘️ 매물 목록</h3>
            {articles.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                등록된 매물이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">거래유형</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">가격</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">면적</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">동</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">층</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">방향</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {articles.slice(0, 20).map((article: any, index: number) => (
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
                          {formatPrice(article.dealOrWarrantPrc)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                {articles.length > 20 && (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    ... 외 {articles.length - 20}개 매물
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

