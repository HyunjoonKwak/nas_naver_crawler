"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ComplexItem {
  id: string;
  complexNo: string;
  complexName: string;
  totalHousehold?: number;
  totalDong?: number;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  address?: string;
  roadAddress?: string;
  jibunAddress?: string;
  articleCount: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ComplexInfo {
  complexNo: string;
  complexName: string;
  totalHousehold?: number;
  totalDong?: number;
  address?: string;
  roadAddress?: string;
  articleCount?: number;
  lastCrawledAt?: string;
  areaRange?: string;
  priceRange?: string;
}

export default function ComplexesPage() {
  const [complexes, setComplexes] = useState<ComplexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlingAll, setCrawlingAll] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{
    crawlId: string | null;
    status: string;
    currentStep: string;
    complexProgress: number;
    processedArticles: number;
  } | null>(null);

  // 경과 시간 추적
  const [crawlStartTime, setCrawlStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // 단지 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComplexNo, setNewComplexNo] = useState("");
  const [complexInfo, setComplexInfo] = useState<ComplexInfo | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // 뷰 모드 (card, list)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // 드래그 앤 드롭
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 시간을 MM:SS 형식으로 변환
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchComplexes();

    // Auto-refresh every 30 seconds to catch updates from detail page crawls
    const refreshInterval = setInterval(() => {
      if (!crawlingAll && !crawling) {
        console.log('[Complexes] Auto-refreshing data...');
        fetchComplexes();
      }
    }, 30000); // 30 seconds

    // Also refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && !crawlingAll && !crawling) {
        console.log('[Complexes] Page visible, refreshing data...');
        fetchComplexes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [crawlingAll, crawling]);

  // Note: checkOngoingCrawl() function removed - no longer needed

  // 경과 시간 업데이트 (1초마다)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (crawlingAll || crawling) {
      if (!crawlStartTime) {
        setCrawlStartTime(Date.now());
        setElapsedSeconds(0);
      }

      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      // 크롤링 종료 시 타이머 리셋
      setCrawlStartTime(null);
      setElapsedSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [crawlingAll, crawling, crawlStartTime]);


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

  const fetchComplexes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/complexes');
      const data = await response.json();
      setComplexes(data.complexes || []);
      console.log('[Complexes] Loaded:', data.complexes?.length || 0);
    } catch (error) {
      console.error('[Complexes] Failed to fetch complexes:', error);
      setComplexes([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  // 단지 정보 가져오기
  // URL 또는 단지번호에서 단지번호를 추출하는 함수
  const extractComplexNo = (input: string): string | null => {
    const trimmed = input.trim();

    // URL 형식인 경우: https://new.land.naver.com/complexes/22065 또는 new.land.naver.com/complexes/22065
    const urlMatch = trimmed.match(/land\.naver\.com\/complexes\/(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // 순수 숫자만 있는 경우
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  };

  const handleFetchComplexInfo = async () => {
    if (!newComplexNo.trim()) {
      alert('네이버 단지 URL 또는 단지번호를 입력해주세요.');
      return;
    }

    const complexNo = extractComplexNo(newComplexNo);

    if (!complexNo) {
      alert('올바른 형식이 아닙니다.\n\n예시:\n- URL: https://new.land.naver.com/complexes/22065\n- 단지번호: 22065');
      return;
    }

    setFetchingInfo(true);
    setComplexInfo(null);

    try {
      const response = await fetch(`/api/complex-info?complexNo=${complexNo}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setComplexInfo(data.complex);
      } else {
        alert(data.error || '단지 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch complex info:', error);
      alert('단지 정보 조회 중 오류가 발생했습니다.');
    } finally {
      setFetchingInfo(false);
    }
  };

  // 단지 추가 (정보 확인 후)
  const handleAddFavorite = async (autoCrawl: boolean = false) => {
    if (!complexInfo) {
      alert('먼저 단지 정보를 조회해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexNo: complexInfo.complexNo,
          complexName: complexInfo.complexName
        })
      });

      const data = await response.json();

      if (response.ok) {
        const addedComplexNo = complexInfo.complexNo;
        const addedComplexName = complexInfo.complexName;

        await fetchFavorites();
        setNewComplexNo("");
        setComplexInfo(null);
        setShowAddForm(false);

        if (autoCrawl) {
          // 추가 후 자동으로 크롤링 시작
          alert(`✅ ${addedComplexName}이(가) 추가되었습니다!\n\n매물 정보를 수집합니다...`);

          setCrawling(addedComplexNo);
          try {
            const crawlResponse = await fetch('/api/crawl', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ complexNumbers: addedComplexNo })
            });

            if (crawlResponse.ok) {
              await fetchFavorites();
              alert(`✅ ${addedComplexName} 크롤링 완료!`);
            } else {
              alert(`⚠️ 크롤링 실패. 나중에 수동으로 크롤링해주세요.`);
            }
          } catch (error) {
            console.error('Auto-crawl failed:', error);
            alert(`⚠️ 크롤링 실패. 나중에 수동으로 크롤링해주세요.`);
          } finally {
            setCrawling(null);
          }
        } else {
          alert(`✅ ${addedComplexName}이(가) 추가되었습니다!\n\n상세 페이지에서 매물 정보를 수집하세요.`);
        }
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

  // DB 기반 폴링 함수
  const pollCrawlStatus = async (crawlId: string) => {
    return new Promise<void>((resolve, reject) => {
      let pollCount = 0;
      const maxPolls = 450; // 15분

      const interval = setInterval(async () => {
        try {
          pollCount++;
          console.log(`[Complexes] Polling ${pollCount}/${maxPolls} for crawlId: ${crawlId}`);

          const response = await fetch(`/api/crawl-status?crawlId=${crawlId}`);
          const data = await response.json();

          console.log('[Complexes] Status:', data.status, 'Progress:', data.progress);

          if (!response.ok) {
            console.error('[Complexes] API error:', data.error);
            clearInterval(interval);
            reject(new Error(data.error || 'Failed to get status'));
            return;
          }

          // 진행 상황 업데이트
          setCrawlProgress({
            crawlId: data.crawlId,
            status: data.status,
            currentStep: data.progress?.currentStep || 'Processing...',
            complexProgress: data.progress?.complexProgress || 0,
            processedArticles: data.progress?.processedArticles || 0,
          });

          // 완료 또는 실패 시 폴링 중지
          if (data.status === 'success' || data.status === 'partial' || data.status === 'failed') {
            console.log('[Complexes] Completed with status:', data.status);
            clearInterval(interval);
            resolve();
            return;
          }

          // 타임아웃 체크
          if (pollCount >= maxPolls) {
            console.error('[Complexes] Timeout reached');
            clearInterval(interval);
            reject(new Error('Crawl timeout - exceeded 15 minutes'));
            return;
          }
        } catch (error) {
          console.error('[Complexes] Polling error:', error);
          clearInterval(interval);
          reject(error);
        }
      }, 2000); // 2초마다 폴링
    });
  };

  const handleCrawlComplex = async (complexNo: string) => {
    setCrawling(complexNo);
    setCrawlProgress(null);

    try {
      // 크롤링 시작
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNo })
      });

      const data = await response.json();

      if (response.ok && data.crawlId) {
        // 폴링으로 진행 상황 추적
        await pollCrawlStatus(data.crawlId);

        // UI 갱신
        await fetchFavorites();

        const complexName = favorites.find(f => f.complexNo === complexNo)?.complexName || complexNo;
        alert(`✅ ${complexName} 크롤링 완료!`);
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(null);
      setCrawlProgress(null);
    }
  };

  const handleStopCrawl = () => {
    const message = `⚠️ 중요: 크롤링을 중단하시겠습니까?\n\n` +
      `현재 UI에서는 진행 상황 추적만 중단됩니다.\n` +
      `백그라운드에서 실행 중인 크롤링은 계속 진행되며 완료됩니다.\n\n` +
      `결과는 나중에 히스토리에서 확인할 수 있습니다.`;

    if (confirm(message)) {
      setCrawling(null);
      setCrawlingAll(false);
      setCrawlProgress(null);
      alert('✅ UI 추적을 중단했습니다.\n\n백그라운드 크롤링은 계속 진행됩니다.');
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
    setCrawlProgress(null);
    const complexNos = favorites.map(f => f.complexNo).join(',');

    try {
      // 크롤링 시작
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNos })
      });

      const data = await response.json();

      if (response.ok && data.crawlId) {
        // 폴링으로 진행 상황 추적
        await pollCrawlStatus(data.crawlId);

        // UI 갱신
        await fetchFavorites();

        alert(`✅ 전체 크롤링 완료!\n\n크롤링된 단지: ${favorites.length}개`);
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      console.error('Failed to crawl all:', error);
      alert('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawlingAll(false);
      setCrawlProgress(null);
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

  // 페이지 이동으로 변경
  const handleViewDetail = (complexNo: string) => {
    window.location.href = `/complex/${complexNo}`;
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
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4 mb-6 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-1">
                    {crawlingAll ? '⏳ 전체 크롤링 진행 중' : '⏳ 크롤링 진행 중'}
                  </h3>
                  {crawlProgress && (
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {crawlProgress.currentStep}
                      {crawlProgress.status === 'crawling' && ' 🔍'}
                      {crawlProgress.status === 'saving' && ' 💾'}
                    </p>
                  )}
                </div>
              </div>

              {/* 프로그레스 바 */}
              {crawlProgress && (
                <div className="space-y-2">
                  <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                      style={{ width: `${crawlProgress.complexProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400">
                    <span>진행률: {crawlProgress.complexProgress}%</span>
                    {crawlProgress.processedArticles > 0 && (
                      <span>처리된 매물: {crawlProgress.processedArticles}개</span>
                    )}
                  </div>
                </div>
              )}

              {/* 경과 시간 및 매물 정보 */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* 경과 시간 */}
                <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">⏱️ 경과 시간</div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatTime(elapsedSeconds)}
                  </div>
                </div>

                {/* 수집 매물 수 */}
                <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">📊 수집 매물</div>
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {crawlProgress?.processedArticles ? crawlProgress.processedArticles.toLocaleString() : '0'} <span className="text-xs font-normal">개</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  ⚠️ 크롤링이 완료될 때까지 페이지를 닫지 마세요.
                </p>
                <button
                  onClick={handleStopCrawl}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-md hover:shadow-lg active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <span>⏹️</span>
                    <span>크롤링 중단</span>
                  </span>
                </button>
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
              <button
                onClick={() => {
                  console.log('[Complexes] Manual refresh triggered');
                  fetchFavorites();
                }}
                disabled={crawlingAll || crawling}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  crawlingAll || crawling
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="단지 정보 새로고침"
              >
                🔃
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
              <div className="flex flex-col gap-3">
                {/* 단지번호 입력 */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newComplexNo}
                    onChange={(e) => setNewComplexNo(e.target.value)}
                    placeholder="네이버 단지 URL 또는 단지번호 입력 (예: https://new.land.naver.com/complexes/22065)"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && !complexInfo && handleFetchComplexInfo()}
                  />
                  {!complexInfo && (
                    <button
                      onClick={handleFetchComplexInfo}
                      disabled={fetchingInfo}
                      className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                        fetchingInfo
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {fetchingInfo ? '⏳ 조회중...' : '🔍 조회'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewComplexNo("");
                      setComplexInfo(null);
                  }}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>

              {/* 단지 정보 미리보기 */}
              {complexInfo && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-3">
                    📋 단지 정보
                  </h4>
                  <div className="space-y-3">
                    {/* 단지명 - 큰 글씨로 강조 */}
                    <div className="pb-3 border-b border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">단지명</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {complexInfo.complexName}
                      </div>
                    </div>

                    {/* 주요 정보 그리드 */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 세대수</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {complexInfo.totalHousehold ? `${complexInfo.totalHousehold.toLocaleString()}세대` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 동수</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {complexInfo.totalDong ? `${complexInfo.totalDong}동` : '-'}
                        </div>
                      </div>
                      {complexInfo.areaRange && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">면적</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {complexInfo.areaRange}
                          </div>
                        </div>
                      )}
                      {complexInfo.priceRange && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">매매가</div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {complexInfo.priceRange}
                          </div>
                        </div>
                      )}
                      {complexInfo.articleCount !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">매물 수</div>
                          <div className="font-semibold text-green-600 dark:text-green-400">
                            {complexInfo.articleCount}개
                          </div>
                        </div>
                      )}
                      {complexInfo.lastCrawledAt && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">마지막 수집</div>
                          <div className="font-semibold text-gray-900 dark:text-white text-xs">
                            {new Date(complexInfo.lastCrawledAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 주소 */}
                    {complexInfo.address && (
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">주소</div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {complexInfo.address}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleAddFavorite(false)}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold"
                    >
                      ➕ 추가만 하기
                    </button>
                    <button
                      onClick={() => handleAddFavorite(true)}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-bold"
                    >
                      ✅ 추가 + 매물 수집
                    </button>
                  </div>
                </div>
              )}
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
              등록된 단지가 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              "단지 추가" 버튼을 클릭하여 단지를 등록하세요
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
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
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
                  {crawlingAll || crawling ? (
                    <button
                      disabled
                      className="w-full mt-4 px-4 py-2.5 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed border-2 border-gray-400 text-sm font-semibold"
                    >
                      상세보기
                    </button>
                  ) : (
                    <Link
                      href={`/complex/${favorite.complexNo}`}
                      className="block w-full mt-4 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-700 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-semibold text-center"
                    >
                      상세보기
                    </Link>
                  )}
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
                      {crawlingAll || crawling ? (
                        <button
                          disabled
                          className="px-3 py-1 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed font-medium"
                        >
                          📋 상세보기
                        </button>
                      ) : (
                        <Link
                          href={`/complex/${favorite.complexNo}`}
                          className="inline-block px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
                        >
                          📋 상세보기
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
