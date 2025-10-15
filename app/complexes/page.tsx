"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle, Dialog } from "@/components/ui";
import { showSuccess, showError, showLoading, dismissToast, showInfo } from "@/lib/toast";

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
  addedAt?: string;
  lastCrawledAt?: string;
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

  // 최근 일회성 조회 단지 (빠른 등록용)
  const [recentOneTimeCrawl, setRecentOneTimeCrawl] = useState<{complexNo: string, complexName: string} | null>(null);

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // 드래그 앤 드롭
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dialog 상태
  const [deleteComplexDialog, setDeleteComplexDialog] = useState<{ isOpen: boolean; complexNo: string | null; complexName: string | null }>({ isOpen: false, complexNo: null, complexName: null });
  const [crawlAllDialog, setCrawlAllDialog] = useState(false);
  const [stopTrackingDialog, setStopTrackingDialog] = useState(false);

  // 시간을 MM:SS 형식으로 변환
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchComplexes();

    // Refresh when page becomes visible (탭 전환 시에만)
    const handleVisibilityChange = () => {
      if (!document.hidden && !crawlingAll && !crawling) {
        console.log('[Complexes] Page visible, refreshing data...');
        fetchComplexes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
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
    console.log('[CLIENT_FETCH] 단지목록 조회 시작');
    setLoading(true);
    try {
      const response = await fetch('/api/complexes');
      const data = await response.json();

      const favorites = (data.complexes || []).filter((c: any) => c.isFavorite);
      console.log('[CLIENT_FETCH] 단지목록 조회 완료:', {
        total: data.complexes?.length || 0,
        favorites: favorites.length,
        favoriteList: favorites.map((f: any) => ({
          complexNo: f.complexNo,
          complexName: f.complexName,
          isFavorite: f.isFavorite
        }))
      });

      setComplexes(data.complexes || []);
    } catch (error) {
      console.error('[CLIENT_FETCH] 단지목록 조회 실패:', error);
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
      showError('네이버 단지 URL 또는 단지번호를 입력해주세요.');
      return;
    }

    const complexNo = extractComplexNo(newComplexNo);

    if (!complexNo) {
      showError('올바른 형식이 아닙니다.\n\n예시:\n- URL: https://new.land.naver.com/complexes/22065\n- 단지번호: 22065');
      return;
    }

    setFetchingInfo(true);
    setComplexInfo(null);

    const loadingToast = showLoading('단지 정보 조회 중...');
    try {
      const response = await fetch(`/api/complex-info?complexNo=${complexNo}`);
      const data = await response.json();

      dismissToast(loadingToast);

      if (response.ok && data.success) {
        setComplexInfo(data.complex);
        showSuccess('단지 정보를 불러왔습니다.');
      } else {
        showError(data.error || '단지 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to fetch complex info:', error);
      showError('단지 정보 조회 중 오류가 발생했습니다.');
    } finally {
      setFetchingInfo(false);
    }
  };

  // 단지 추가 (정보 확인 후 자동으로 매물 수집)
  const handleAddFavorite = async () => {
    if (!complexInfo) {
      showError('먼저 단지 정보를 조회해주세요.');
      return;
    }

    const loadingToast = showLoading('단지 추가 중...');
    try {
      // 1. favorites.json에 추가
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

        dismissToast(loadingToast);
        showSuccess(`${addedComplexName}이(가) 추가되었습니다!`);

        await fetchComplexes();
        setNewComplexNo("");
        setComplexInfo(null);
        setShowAddForm(false);

        // 2. 자동으로 크롤링 시작
        const crawlToast = showLoading(`${addedComplexName} 매물 수집 중...`);

        setCrawling(addedComplexNo);
        try {
          const crawlResponse = await fetch('/api/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complexNumbers: addedComplexNo })
          });

          const crawlData = await crawlResponse.json();

          if (crawlResponse.ok && crawlData.crawlId) {
            // 크롤링 진행 상황 폴링
            await pollCrawlStatus(crawlData.crawlId);
            await fetchComplexes();
            dismissToast(crawlToast);
            showSuccess(`${addedComplexName} 크롤링 완료!`);
          } else {
            dismissToast(crawlToast);
            showError('크롤링 실패. 나중에 수동으로 크롤링해주세요.');
          }
        } catch (error) {
          dismissToast(crawlToast);
          console.error('Auto-crawl failed:', error);
          showError('크롤링 실패. 나중에 수동으로 크롤링해주세요.');
        } finally {
          setCrawling(null);
        }
      } else {
        dismissToast(loadingToast);
        showError(data.error || '단지 추가 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to add favorite:', error);
      showError('단지 추가 중 오류가 발생했습니다.');
    }
  };

  const handleToggleFavorite = async (complexNo: string, isFavorite: boolean) => {
    console.log('[CLIENT_TOGGLE] 관심단지 토글 시작:', {
      complexNo,
      currentState: isFavorite ? '관심단지' : '일반단지',
      action: isFavorite ? '해제' : '등록'
    });

    try {
      console.log('[CLIENT_TOGGLE] API 호출 시작');
      const response = await fetch('/api/complexes/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNo }),
      });

      const data = await response.json();
      console.log('[CLIENT_TOGGLE] API 응답:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (response.ok) {
        showInfo(data.message);
        console.log('[CLIENT_TOGGLE] 단지목록 새로고침 시작');
        await fetchComplexes();
        console.log('[CLIENT_TOGGLE] 단지목록 새로고침 완료');
      } else {
        console.error('[CLIENT_TOGGLE] API 에러:', data);
        showError(data.error || '관심단지 설정 실패');
      }
    } catch (error) {
      console.error('[CLIENT_TOGGLE] 예외 발생:', error);
      showError('관심단지 설정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComplex = (complexNo: string, complexName: string) => {
    setDeleteComplexDialog({ isOpen: true, complexNo, complexName });
  };

  const confirmDeleteComplex = async () => {
    if (!deleteComplexDialog.complexNo) return;

    const loadingToast = showLoading('단지 삭제 중...');
    try {
      const response = await fetch(`/api/favorites?complexNo=${deleteComplexDialog.complexNo}`, {
        method: 'DELETE'
      });

      dismissToast(loadingToast);

      if (response.ok) {
        await fetchComplexes();
        showSuccess('단지가 삭제되었습니다.');
      } else {
        const data = await response.json();
        showError(data.error || '단지 삭제 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to delete complex:', error);
      showError('단지 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteComplexDialog({ isOpen: false, complexNo: null, complexName: null });
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

    const loadingToast = showLoading('크롤링 시작 중...');
    try {
      // 크롤링 시작
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNo })
      });

      const data = await response.json();

      dismissToast(loadingToast);

      if (response.ok && data.crawlId) {
        // 폴링으로 진행 상황 추적
        await pollCrawlStatus(data.crawlId);

        // UI 갱신
        await fetchComplexes();

        const complexName = complexes.find(f => f.complexNo === complexNo)?.complexName || complexNo;
        showSuccess(`${complexName} 크롤링 완료!`);
      } else {
        showError(data.error || '크롤링 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to crawl:', error);
      showError('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(null);
      setCrawlProgress(null);
    }
  };

  const handleStopCrawl = () => {
    setStopTrackingDialog(true);
  };

  const confirmStopTracking = () => {
    setCrawling(null);
    setCrawlingAll(false);
    setCrawlProgress(null);
    setStopTrackingDialog(false);
    showInfo('UI 추적을 중단했습니다. 백그라운드 크롤링은 계속 진행됩니다.');
  };

  const handleCrawlAll = () => {
    if (complexes.length === 0) {
      showError('등록된 단지가 없습니다.');
      return;
    }
    setCrawlAllDialog(true);
  };

  const confirmCrawlAll = async () => {
    setCrawlAllDialog(false);
    setCrawlingAll(true);
    setCrawlProgress(null);
    const complexNos = complexes.map(f => f.complexNo).join(',');

    const loadingToast = showLoading(`${complexes.length}개 단지 크롤링 시작 중...`);
    try {
      // 크롤링 시작
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: complexNos })
      });

      const data = await response.json();

      dismissToast(loadingToast);

      if (response.ok && data.crawlId) {
        // 폴링으로 진행 상황 추적
        await pollCrawlStatus(data.crawlId);

        // UI 갱신
        await fetchComplexes();

        showSuccess(`전체 크롤링 완료! ${complexes.length}개 단지`);
      } else {
        showError(data.error || '크롤링 실패');
      }
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to crawl all:', error);
      showError('크롤링 중 오류가 발생했습니다.');
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

    const newFavorites = [...complexes];
    const draggedItem = newFavorites[draggedIndex];
    newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, draggedItem);

    setComplexes(newFavorites);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // 순서를 서버에 저장
    try {
      await fetch('/api/favorites/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: complexes.map((f, idx) => ({ ...f, order: idx })) })
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
                    🏠 홈
                  </Link>
                  <Link
                    href="/scheduler"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    ⏰ 스케줄러
                  </Link>
                  <Link
                    href="/system"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    ⚙️ 시스템
                  </Link>
                  {/* 다크모드 토글 버튼 */}
                  <ThemeToggle />
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
                disabled={crawlingAll || complexes.length === 0}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  crawlingAll || complexes.length === 0
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {crawlingAll ? '⏳ 크롤링 중...' : '🔄 전체 크롤링'}
              </button>
              <button
                onClick={() => {
                  console.log('[Complexes] Manual refresh triggered');
                  fetchComplexes();
                }}
                disabled={!!(crawlingAll || crawling)}
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
                등록된 단지: <span className="font-bold text-blue-600 dark:text-blue-400">{complexes.length}개</span>
              </div>
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-3">
                {/* 최근 일회성 조회 단지 빠른 등록 */}
                {recentOneTimeCrawl && !complexInfo && (
                  <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-200">
                          💡 최근 조회한 단지가 있습니다
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {recentOneTimeCrawl.complexName} ({recentOneTimeCrawl.complexNo})
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          // 단지 정보 직접 설정 (API 조회 생략)
                          setComplexInfo({
                            complexNo: recentOneTimeCrawl.complexNo,
                            complexName: recentOneTimeCrawl.complexName,
                          });
                          setNewComplexNo(recentOneTimeCrawl.complexNo);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        ⚡ 빠른 등록
                      </button>
                    </div>
                  </div>
                )}

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

                  <div className="mt-4">
                    <button
                      onClick={() => handleAddFavorite()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg transition-colors font-bold shadow-lg"
                    >
                      ✅ 관심 단지 추가 및 매물 수집
                    </button>
                    <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                      단지 추가 후 자동으로 매물 정보를 수집합니다
                    </p>
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
        ) : complexes.length === 0 ? (
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
          // 카드 뷰
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complexes.map((complex, index) => (
              <div
                key={complex.complexNo}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                <div className="px-6 py-6">
                  {/* 단지명과 관심단지 버튼 */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                      {complex.complexName || `단지 ${complex.complexNo}`}
                    </h3>
                    <button
                      onClick={() => handleToggleFavorite(complex.complexNo, complex.isFavorite)}
                      className={`ml-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        complex.isFavorite
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {complex.isFavorite ? '⭐ 관심단지' : '☆ 관심등록'}
                    </button>
                  </div>

                  {/* 단지번호 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>📍</span>
                    <span>단지번호 {complex.complexNo}</span>
                  </div>

                  {/* 구분선 */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* 단지 정보 */}
                  <div className="space-y-2.5 text-sm mb-4">
                    {/* 매물 수 */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">등록 매물</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {complex.articleCount}개
                      </span>
                    </div>

                    {/* 세대수 */}
                    {complex.totalHousehold && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">세대수</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {complex.totalHousehold.toLocaleString()}세대
                        </span>
                      </div>
                    )}

                    {/* 동수 */}
                    {complex.totalDong && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">동수</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {complex.totalDong}개동
                        </span>
                      </div>
                    )}

                    {/* 주소 */}
                    {complex.address && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">주소</span>
                        <span className="text-gray-900 dark:text-white font-medium text-xs text-right">
                          {complex.roadAddress || complex.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/complex/${complex.complexNo}`}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors text-sm font-semibold text-center"
                    >
                      상세보기
                    </Link>
                    <button
                      onClick={() => handleCrawlComplex(complex.complexNo)}
                      disabled={crawling === complex.complexNo || crawlingAll}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        crawling === complex.complexNo || crawlingAll
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {crawling === complex.complexNo ? '⏳' : '🔄'}
                    </button>
                    <button
                      onClick={() => handleDeleteComplex(complex.complexNo, complex.complexName)}
                      className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
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
                {complexes.map((favorite, index) => (
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

        {/* Single Complex Crawl Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 to-gray-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🔍 일회성 매물 조회
            </h3>
            <p className="text-slate-100 text-sm mt-1">
              관심 단지로 등록하지 않고 매물 정보만 확인합니다
            </p>
          </div>
          <div className="p-6">
            {/* 안내 메시지 */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-2xl">ℹ️</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    일회성 조회 vs 관심 단지
                  </h4>
                  <div className="text-xs text-blue-800 dark:text-blue-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                      <span>DB에 저장되어 언제든지 조회 가능합니다</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                      <span>홈페이지 관심 단지 목록에는 표시되지 않습니다</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                      <span>스케줄러에서 자동 크롤링되지 않습니다</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-blue-900 dark:text-blue-200 font-medium">
                        💡 지속적으로 관리하려면 상단의 "단지 추가" 버튼을 사용하세요
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SingleComplexCrawler
              onCrawlComplete={fetchComplexes}
              onCrawlSuccess={(complexNo, complexName) => {
                setRecentOneTimeCrawl({ complexNo, complexName });
              }}
            />
          </div>
        </div>
      </main>

      {/* Delete Complex Confirmation Dialog */}
      <Dialog
        isOpen={deleteComplexDialog.isOpen}
        onClose={() => setDeleteComplexDialog({ isOpen: false, complexNo: null, complexName: null })}
        onConfirm={confirmDeleteComplex}
        title="단지 삭제"
        description={`${deleteComplexDialog.complexName}을(를) 완전히 삭제하시겠습니까?\n\n(DB와 모든 매물 데이터가 삭제됩니다)`}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />

      {/* Crawl All Confirmation Dialog */}
      <Dialog
        isOpen={crawlAllDialog}
        onClose={() => setCrawlAllDialog(false)}
        onConfirm={confirmCrawlAll}
        title="전체 크롤링"
        description={`${complexes.length}개 단지를 모두 크롤링하시겠습니까?`}
        confirmText="크롤링 시작"
        cancelText="취소"
        variant="default"
      />

      {/* Stop Tracking Confirmation Dialog */}
      <Dialog
        isOpen={stopTrackingDialog}
        onClose={() => setStopTrackingDialog(false)}
        onConfirm={confirmStopTracking}
        title="크롤링 추적 중단"
        description="⚠️ 중요: 현재 UI에서는 진행 상황 추적만 중단됩니다.\n\n백그라운드에서 실행 중인 크롤링은 계속 진행되며 완료됩니다.\n\n결과는 나중에 히스토리에서 확인할 수 있습니다."
        confirmText="추적 중단"
        cancelText="취소"
        variant="default"
      />
    </div>
  );
}

// 단일 단지 크롤링 컴포넌트
function SingleComplexCrawler({
  onCrawlComplete,
  onCrawlSuccess
}: {
  onCrawlComplete: () => void;
  onCrawlSuccess?: (complexNo: string, complexName: string) => void;
}) {
  const [complexNo, setComplexNo] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const extractComplexNo = (input: string): string | null => {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/land\.naver\.com\/complexes\/(\d+)/);
    if (urlMatch) return urlMatch[1];
    if (/^\d+$/.test(trimmed)) return trimmed;
    return null;
  };

  const handleCrawl = async () => {
    if (!complexNo.trim()) {
      setError('단지번호 또는 URL을 입력해주세요.');
      return;
    }

    const extracted = extractComplexNo(complexNo);
    if (!extracted) {
      setError('올바른 형식이 아닙니다.\n예: https://new.land.naver.com/complexes/22065 또는 22065');
      return;
    }

    setCrawling(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complexNumbers: extracted })
      });

      const data = await response.json();

      if (response.ok && data.crawlId) {
        // 폴링으로 결과 대기
        await pollCrawlStatus(data.crawlId);

        // DB에서 단지 정보 조회 (단지명 가져오기)
        let complexName = extracted;
        try {
          const complexResponse = await fetch(`/api/complexes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complexNo: extracted })
          });
          const complexData = await complexResponse.json();
          if (complexResponse.ok && complexData.complex) {
            complexName = complexData.complex.complexName || extracted;
          }
        } catch (e) {
          console.warn('단지명 조회 실패, 단지번호 사용:', e);
        }

        setMessage(`✅ ${complexName} 크롤링 완료!`);
        setComplexNo("");

        // 상위 컴포넌트에 크롤링 성공 정보 전달 (빠른 등록용)
        if (onCrawlSuccess) {
          onCrawlSuccess(extracted, complexName);
        }

        // 2초 후 자동으로 상세 페이지로 이동
        setTimeout(() => {
          window.location.href = `/complex/${extracted}`;
        }, 2000);

        onCrawlComplete();
      } else {
        setError(data.error || '크롤링 실패');
      }
    } catch (err) {
      console.error('Failed to crawl:', err);
      setError('크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawling(false);
    }
  };

  const pollCrawlStatus = async (crawlId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let pollCount = 0;
      const maxPolls = 450;

      const interval = setInterval(async () => {
        try {
          pollCount++;
          const response = await fetch(`/api/crawl-status?crawlId=${crawlId}`);
          const data = await response.json();

          if (!response.ok) {
            clearInterval(interval);
            reject(new Error(data.error || 'Failed to get status'));
            return;
          }

          if (data.status === 'success' || data.status === 'partial' || data.status === 'failed') {
            clearInterval(interval);
            if (data.status === 'failed') {
              reject(new Error(data.errorMessage || 'Crawl failed'));
            } else {
              resolve();
            }
            return;
          }

          if (pollCount >= maxPolls) {
            clearInterval(interval);
            reject(new Error('Timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          단지 번호 또는 URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={complexNo}
            onChange={(e) => setComplexNo(e.target.value)}
            placeholder="22065 또는 https://new.land.naver.com/complexes/22065"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={crawling}
            onKeyPress={(e) => e.key === 'Enter' && !crawling && handleCrawl()}
          />
          <button
            onClick={handleCrawl}
            disabled={crawling || !complexNo.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              crawling || !complexNo.trim()
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {crawling ? '⏳ 크롤링 중...' : '🚀 크롤링'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          💡 네이버 부동산 단지 페이지 URL 또는 단지번호를 입력하세요
        </p>
      </div>

      {message && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-300 text-sm font-medium">
            {message}
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium whitespace-pre-line">
            ❌ {error}
          </p>
        </div>
      )}
    </div>
  );
}
