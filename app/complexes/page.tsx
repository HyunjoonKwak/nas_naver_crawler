"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PropertyDetail from "@/components/PropertyDetail";

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
        <PropertyDetail
          data={selectedComplex.data}
          onClose={() => setSelectedComplex(null)}
        />
      )}
    </div>
  );
}
