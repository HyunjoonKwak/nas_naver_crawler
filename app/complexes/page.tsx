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
  // 크롤링 데이터가 있을 때 추가 정보
  totalHouseHoldCount?: number;
  totalDongCount?: number;
  minArea?: number;
  maxArea?: number;
  minPrice?: number;
  maxPrice?: number;
  order?: number;
}

interface ComplexData {
  overview: any;
  articles: any;
}

interface SelectedComplex {
  complexNo: string;
  data: ComplexData | null;
}

export default function ComplexesPage() {
  const [favorites, setFavorites] = useState<FavoriteComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlingAll, setCrawlingAll] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<SelectedComplex | null>(null);

  // 단지 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComplexNo, setNewComplexNo] = useState("");
  const [newComplexName, setNewComplexName] = useState("");

  // 뷰 모드 (card, list)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // 드래그 앤 드롭
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 서버 크롤링 상태
  const [serverCrawlState, setServerCrawlState] = useState<{
    isCrawling: boolean;
    complexCount?: number;
    currentComplex?: string;
    startTime?: string;
  } | null>(null);

  useEffect(() => {
    fetchFavorites();
    // 페이지 로드 시 모든 단지 정보 자동 동기화
    syncAllFavorites();
    // 서버 크롤링 상태 확인
    checkServerCrawlState();
  }, []);

  // 서버 크롤링 상태 폴링 (5초마다)
  useEffect(() => {
    const interval = setInterval(checkServerCrawlState, 5000);
    return () => clearInterval(interval);
  }, []);

  // 경과 시간 업데이트를 위한 리렌더링 (1초마다)
  const [, setTick] = useState(0);
  useEffect(() => {
    if (crawlingAll || crawling) {
      const interval = setInterval(() => {
        setTick(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [crawlingAll, crawling]);

  const checkServerCrawlState = async () => {
    try {
      const response = await fetch('/api/crawl-state');
      const data = await response.json();
      setServerCrawlState(data);

      // 서버에서 크롤링 중이지만 로컬 상태가 아니면 동기화
      if (data.isCrawling && !crawlingAll && !crawling) {
        setCrawlingAll(true);
      }
      // 서버에서 크롤링 완료되었지만 로컬 상태가 크롤링 중이면 동기화
      if (!data.isCrawling && (crawlingAll || crawling)) {
        setCrawlingAll(false);
        setCrawling(null);
        // 데이터 새로고침
        await fetchFavorites();
      }
    } catch (error) {
      console.error('Failed to check server crawl state:', error);
    }
  };

  // 크롤링 중 페이지 이탈 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (crawlingAll || crawling) {
        e.preventDefault();
        e.returnValue = '크롤링이 진행 중입니다. 페이지를 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [crawlingAll, crawling]);

  // 모든 선호단지 정보를 크롤링 데이터와 동기화
  const syncAllFavorites = async () => {
    try {
      // 최신 크롤링 데이터 조회
      const response = await fetch('/api/results');
      const data = await response.json();
      const results = data.results || [];

      // 각 크롤링 결과에서 단지 정보 추출하여 업데이트
      for (const result of results) {
        const resultData = Array.isArray(result.data) ? result.data[0] : result.data;
        if (resultData?.overview?.complexNo) {
          await fetch('/api/favorites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              complexNo: resultData.overview.complexNo,
              complexName: resultData.overview.complexName,
              articleCount: resultData.articles?.articleList?.length || 0,
              totalHouseHoldCount: resultData.overview.totalHouseHoldCount,
              totalDongCount: resultData.overview.totalDongCount,
              minArea: resultData.overview.minArea,
              maxArea: resultData.overview.maxArea,
              minPrice: resultData.overview.minPrice,
              maxPrice: resultData.overview.maxPrice,
            })
          });
        }
      }

      // 동기화 완료 후 UI 갱신
      await fetchFavorites();
      console.log('[단지목록] 모든 단지 정보 동기화 완료');
    } catch (error) {
      console.error('[단지목록] 동기화 실패:', error);
    }
  };

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

    // 서버에 크롤링 시작 상태 저장
    await fetch('/api/crawl-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCrawling: true, complexCount: 1, currentComplex: complexNo })
    });

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
        // UI 갱신
        await fetchFavorites();

        // 크롤 상태 및 시스템 상태 조회
        const [crawlStatusResponse, systemStatusResponse] = await Promise.all([
          fetch('/api/crawl-status'),
          fetch('/api/status')
        ]);
        const crawlStatus = await crawlStatusResponse.json();
        const systemStatus = await systemStatusResponse.json();

        const complexName = favorites.find(f => f.complexNo === complexNo)?.complexName || complexNo;
        const articleCount = crawlStatus.items_collected || 0;
        const elapsedTime = crawlStatus.elapsed_seconds || 0;
        const speed = crawlStatus.speed || 0;

        alert(
          `✅ 크롤링 완료!\n\n` +
          `📌 단지: ${complexName}\n` +
          `🏠 수집된 매물: ${articleCount}개\n` +
          `⏱️ 소요 시간: ${elapsedTime}초\n` +
          `⚡ 수집 속도: ${speed}개/초\n\n` +
          `📊 시스템 상태:\n` +
          `• 전체 크롤링 파일: ${systemStatus.crawledDataCount || 0}개\n` +
          `• 선호 단지: ${systemStatus.favoritesCount || 0}개`
        );
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(null);
      // 서버에 크롤링 완료 상태 저장
      await fetch('/api/crawl-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCrawling: false })
      });
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

    // 서버에 크롤링 시작 상태 저장
    await fetch('/api/crawl-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCrawling: true, complexCount: favorites.length })
    });

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
        await fetchFavorites();

        // 크롤 상태 및 시스템 상태 조회
        const [crawlStatusResponse, systemStatusResponse] = await Promise.all([
          fetch('/api/crawl-status'),
          fetch('/api/status')
        ]);
        const crawlStatus = await crawlStatusResponse.json();
        const systemStatus = await systemStatusResponse.json();

        const totalArticles = crawlStatus.items_collected || 0;
        const elapsedTime = crawlStatus.elapsed_seconds || 0;
        const speed = crawlStatus.speed || 0;

        alert(
          `✅ 전체 크롤링 완료!\n\n` +
          `📌 크롤링된 단지: ${favorites.length}개\n` +
          `🏠 전체 매물 수: ${totalArticles}개\n` +
          `⏱️ 소요 시간: ${elapsedTime}초\n` +
          `⚡ 수집 속도: ${speed}개/초\n\n` +
          `📊 시스템 상태:\n` +
          `• 전체 크롤링 파일: ${systemStatus.crawledDataCount || 0}개\n` +
          `• 선호 단지: ${systemStatus.favoritesCount || 0}개\n` +
          `• 디스크 사용량: ${systemStatus.crawledDataSize || '알 수 없음'}`
        );
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl all:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawlingAll(false);
      // 서버에 크롤링 완료 상태 저장
      await fetch('/api/crawl-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCrawling: false })
      });
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
          // 단지 정보 업데이트 (overview 데이터 포함)
          await fetch('/api/favorites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              complexNo,
              complexName: resultData.overview.complexName,
              articleCount: resultData.articles?.articleList?.length || 0,
              totalHouseHoldCount: resultData.overview.totalHouseHoldCount,
              totalDongCount: resultData.overview.totalDongCount,
              minArea: resultData.overview.minArea,
              maxArea: resultData.overview.maxArea,
              minPrice: resultData.overview.minPrice,
              maxPrice: resultData.overview.maxPrice,
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

      // 크롤링 데이터가 없어도 빈 데이터로 모달 열기
      setSelectedComplex({
        complexNo,
        data: null // null로 설정하여 빈 상태 표시
      });
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

  // 가격 포맷 (만원 단위 → 억/만 표시)
  const formatPrice = (price?: number) => {
    if (!price) return '-';
    const uk = Math.floor(price / 10000);
    const man = price % 10000;

    if (uk === 0) return `${man}만`;
    if (man === 0) return `${uk}억`;
    return `${uk}억 ${man}만`;
  };

  // 면적 포맷 (m² → 평)
  const formatArea = (area?: number) => {
    if (!area) return '-';
    const pyeong = (area / 3.3058).toFixed(1);
    return `${pyeong}평`;
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFavorites = [...favorites];
    const draggedItem = newFavorites[draggedIndex];
    newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, draggedItem);

    setFavorites(newFavorites);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // 순서를 서버에 저장
    try {
      await fetch('/api/favorites/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: favorites.map((f, idx) => ({ ...f, order: idx })) })
      });
    } catch (error) {
      console.error('Failed to save order:', error);
    }
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
              {(crawlingAll || crawling) ? (
                <>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-semibold"
                    title="크롤링 중에는 페이지 이동이 제한됩니다"
                  >
                    ← 홈
                  </button>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-semibold"
                    title="크롤링 중에는 페이지 이동이 제한됩니다"
                  >
                    📚 히스토리
                  </button>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-semibold"
                    title="크롤링 중에는 페이지 이동이 제한됩니다"
                  >
                    ⏰ 스케줄러
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-semibold"
                  >
                    ← 홈
                  </Link>
                  <Link
                    href="/scheduler"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    ⏰ 스케줄러
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Crawling Status Banner */}
        {(crawlingAll || crawling) && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 dark:border-yellow-400"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                  {crawlingAll ? '⏳ 전체 크롤링 진행 중' : '⏳ 크롤링 진행 중'}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {serverCrawlState?.isCrawling && serverCrawlState.complexCount ? (
                    <>
                      {serverCrawlState.complexCount}개 단지의 데이터를 수집하고 있습니다.
                      {serverCrawlState.currentComplex && (
                        <span className="block mt-1">
                          현재 수집 중: <span className="font-semibold">{serverCrawlState.currentComplex}</span>
                        </span>
                      )}
                      {serverCrawlState.startTime && (() => {
                        const elapsed = Math.floor((Date.now() - new Date(serverCrawlState.startTime).getTime()) / 1000);
                        const minutes = Math.floor(elapsed / 60);
                        const seconds = elapsed % 60;
                        return (
                          <span className="block mt-1 text-xs">
                            경과 시간: {minutes > 0 ? `${minutes}분 ` : ''}{seconds}초
                          </span>
                        );
                      })()}
                    </>
                  ) : crawlingAll ? (
                    `${favorites.length}개 단지의 데이터를 수집하고 있습니다. 잠시만 기다려주세요.`
                  ) : (
                    '데이터를 수집하고 있습니다. 잠시만 기다려주세요.'
                  )}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                  ⚠️ 크롤링이 완료될 때까지 페이지를 닫지 마세요.
                  {serverCrawlState?.isCrawling && (
                    <span className="ml-2">다른 기기에서도 크롤링 진행 상태가 표시됩니다.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={crawlingAll || !!crawling}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  crawlingAll || crawling
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
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

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  🎴 카드
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  📋 리스트
                </button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                등록된 단지: <span className="font-bold text-blue-600 dark:text-blue-400">{favorites.length}개</span>
              </div>
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

        {/* Complex Cards/List */}
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
        ) : viewMode === 'card' ? (
          // 카드 뷰 - 네이버 부동산 스타일
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite, index) => (
              <div
                key={favorite.complexNo}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
                onClick={() => handleViewDetail(favorite.complexNo)}
              >
                {/* 드래그 힌트 */}
                <div className="px-6 pt-4 pb-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <span className="cursor-grab active:cursor-grabbing">☰</span>
                    드래그하여 순서 변경
                  </p>
                </div>

                <div className="px-6 pb-6">
                  {/* 단지명 */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {favorite.complexName || `단지 ${favorite.complexNo}`}
                  </h3>

                  {/* 단지번호 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>📍</span>
                    <span>단지번호 {favorite.complexNo}</span>
                  </div>

                  {/* 구분선 */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* 단지 정보 */}
                  <div className="space-y-2.5 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">유형</span>
                      <span className="text-gray-900 dark:text-white font-medium">아파트</span>
                    </div>

                    {/* 세대수 */}
                    {favorite.totalHouseHoldCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">세대수</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {favorite.totalHouseHoldCount.toLocaleString()}세대
                        </span>
                      </div>
                    )}

                    {/* 동수 */}
                    {favorite.totalDongCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">동수</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {favorite.totalDongCount}개동
                        </span>
                      </div>
                    )}

                    {/* 면적 */}
                    {(favorite.minArea || favorite.maxArea) && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">면적</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {favorite.minArea && favorite.maxArea
                            ? `${formatArea(favorite.minArea)} ~ ${formatArea(favorite.maxArea)}`
                            : formatArea(favorite.minArea || favorite.maxArea)}
                        </span>
                      </div>
                    )}

                    {favorite.lastCrawledAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">마지막 수집</span>
                        <span className="text-gray-900 dark:text-white font-medium text-xs">
                          {formatDate(favorite.lastCrawledAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 매매가 범위 - 크롤링 데이터가 있을 때만 */}
                  {(favorite.minPrice || favorite.maxPrice) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">매매가</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {favorite.minPrice && favorite.maxPrice
                            ? `${formatPrice(favorite.minPrice)} ~ ${formatPrice(favorite.maxPrice)}`
                            : formatPrice(favorite.minPrice || favorite.maxPrice)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 매물 수 - 강조 */}
                  {favorite.articleCount !== undefined && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">매물</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {favorite.articleCount}
                          <span className="text-base font-normal ml-1">건</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 상세보기 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!crawlingAll && !crawling) {
                        handleViewDetail(favorite.complexNo);
                      }
                    }}
                    disabled={crawlingAll || !!crawling}
                    className={`w-full mt-4 px-4 py-2.5 rounded-lg transition-colors text-sm font-semibold ${
                      crawlingAll || crawling
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed border-2 border-gray-400'
                        : 'bg-white dark:bg-gray-700 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    상세보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 리스트 뷰
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                    순서
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    단지명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    단지번호
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    마지막 수집
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    매물 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {favorites.map((favorite, index) => (
                  <tr
                    key={favorite.complexNo}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-move ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-lg cursor-grab active:cursor-grabbing">⋮⋮</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {favorite.complexName || `단지 ${favorite.complexNo}`}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {favorite.complexNo}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(favorite.addedAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(favorite.lastCrawledAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {favorite.articleCount !== undefined ? `${favorite.articleCount}개` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetail(favorite.complexNo)}
                        disabled={crawlingAll || !!crawling}
                        className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                          crawlingAll || crawling
                            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        📋 상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Complex Detail Modal */}
      {selectedComplex && (
        <PropertyDetail
          data={selectedComplex.data}
          complexNo={selectedComplex.complexNo}
          onClose={() => setSelectedComplex(null)}
          onRefresh={async (complexNo) => {
            await handleCrawlComplex(complexNo);
            // 모달 새로고침
            await handleViewDetail(complexNo);
          }}
          onDelete={async (complexNo) => {
            await handleDeleteFavorite(complexNo);
            setSelectedComplex(null);
          }}
        />
      )}
    </div>
  );
}
