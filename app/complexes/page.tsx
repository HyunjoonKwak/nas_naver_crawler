"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { MobileNavigation } from "@/components/MobileNavigation";
import { ThemeToggle, Dialog } from "@/components/ui";
import { GroupManagement } from "@/components/GroupManagement";
import { ComplexSortFilter } from "@/components/ComplexSortFilter";
import { ComplexGroupBadges } from "@/components/ComplexGroupBadges";
import { GlobalSearch } from "@/components/GlobalSearch";
import { showSuccess, showError, showLoading, dismissToast, showInfo } from "@/lib/toast";
import { AuthGuard } from "@/components/AuthGuard";
import {
  Plus,
  RefreshCw,
  Loader2,
  Search,
  Folder,
  LayoutGrid,
  List,
  Eye,
  Trash2,
  Star,
  Rocket,
  FileText,
  Search as SearchIcon,
  BarChart3
} from "lucide-react";

interface ComplexGroup {
  id: string;
  name: string;
  color?: string;
}

interface TradeTypeStat {
  type: string;
  count: number;
  avgPrice: string;
}

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
  beopjungdong?: string;
  haengjeongdong?: string;
  articleCount: number;
  isFavorite: boolean;
  groups: ComplexGroup[];
  priceStats?: {
    avgPrice: string;
    minPrice: string;
    maxPrice: string;
  } | null;
  tradeTypeStats: TradeTypeStat[];
  createdAt: string;
  updatedAt: string;
  addedAt?: string;
  lastCrawledAt?: string;
  articleChange24h?: number;
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
  const { data: session, status } = useSession();
  const [complexes, setComplexes] = useState<ComplexItem[]>([]);
  const [totalComplexCount, setTotalComplexCount] = useState<number>(0); // 전체 단지 개수 (필터 무관)
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState<string | null>(null);
  const [crawlingAll, setCrawlingAll] = useState(false);
  const [groupRefreshTrigger, setGroupRefreshTrigger] = useState(0); // 그룹 목록 새로고침 트리거
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

  // 그룹 필터 및 정렬
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showGroupSidebar, setShowGroupSidebar] = useState(false); // 모바일용 토글

  // 드래그 앤 드롭
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dialog 상태
  const [deleteComplexDialog, setDeleteComplexDialog] = useState<{ isOpen: boolean; complexNo: string | null; complexName: string | null }>({ isOpen: false, complexNo: null, complexName: null });
  const [crawlAllDialog, setCrawlAllDialog] = useState(false);
  const [stopTrackingDialog, setStopTrackingDialog] = useState(false);

  // 검색 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 고급 필터 상태
  const [filters, setFilters] = useState({
    priceRange: 'all', // all, 0-3, 3-5, 5-10, 10+
    articleCount: 'all', // all, 0, 1-10, 10-50, 50+
  });

  // 단지 비교 상태
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // 필터링된 단지 목록
  const filteredComplexes = complexes.filter(complex => {
    // 가격대 필터
    if (filters.priceRange !== 'all' && complex.priceStats) {
      const avgPriceStr = complex.priceStats.avgPrice;
      let avgPriceWon = 0;

      const eokMatch = avgPriceStr.match(/(\d+)억/);
      if (eokMatch) {
        avgPriceWon += parseInt(eokMatch[1]) * 100000000;
      }

      const manMatch = avgPriceStr.match(/억([\d,]+)/);
      if (manMatch) {
        avgPriceWon += parseInt(manMatch[1].replace(/,/g, '')) * 10000;
      } else if (!eokMatch) {
        const onlyNumber = avgPriceStr.match(/^([\d,]+)$/);
        if (onlyNumber) {
          avgPriceWon = parseInt(onlyNumber[1].replace(/,/g, '')) * 10000;
        }
      }

      const avgPriceEok = avgPriceWon / 100000000;

      switch (filters.priceRange) {
        case '0-3':
          if (avgPriceEok >= 3) return false;
          break;
        case '3-5':
          if (avgPriceEok < 3 || avgPriceEok >= 5) return false;
          break;
        case '5-10':
          if (avgPriceEok < 5 || avgPriceEok >= 10) return false;
          break;
        case '10+':
          if (avgPriceEok < 10) return false;
          break;
      }
    }

    // 매물 수 필터
    if (filters.articleCount !== 'all') {
      const count = complex.articleCount;
      switch (filters.articleCount) {
        case '0':
          if (count > 0) return false;
          break;
        case '1-10':
          if (count < 1 || count > 10) return false;
          break;
        case '10-50':
          if (count < 10 || count > 50) return false;
          break;
        case '50+':
          if (count < 50) return false;
          break;
      }
    }

    return true;
  });

  // 시간을 MM:SS 형식으로 변환
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 비교 모드 핸들러
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      setSelectedForCompare([]);
    }
  };

  const toggleCompareSelection = (complexNo: string) => {
    if (selectedForCompare.includes(complexNo)) {
      setSelectedForCompare(selectedForCompare.filter(no => no !== complexNo));
    } else if (selectedForCompare.length < 5) {
      setSelectedForCompare([...selectedForCompare, complexNo]);
    }
  };

  const startComparison = () => {
    if (selectedForCompare.length >= 2 && selectedForCompare.length <= 5) {
      setShowCompareModal(true);
    }
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
  }, [crawlingAll, crawling, selectedGroupId, sortBy, sortOrder]);

  // Cmd/Ctrl+K로 검색 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const params = new URLSearchParams();
      if (selectedGroupId) {
        params.append('groupId', selectedGroupId);
      }
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/complex?${params.toString()}`);
      const data = await response.json();

      // 전체 단지 개수 가져오기 (필터 없이)
      if (!selectedGroupId) {
        // 필터 없을 때는 현재 결과가 전체
        setTotalComplexCount(data.complexes?.length || 0);
      } else {
        // 필터 있을 때는 별도로 전체 조회
        const totalResponse = await fetch('/api/complex');
        const totalData = await totalResponse.json();
        setTotalComplexCount(totalData.complexes?.length || 0);
      }

      const favorites = (data.complexes || []).filter((c: any) => c.isFavorite);
      console.log('[CLIENT_FETCH] 단지목록 조회 완료:', {
        total: data.complexes?.length || 0,
        favorites: favorites.length,
        groupFilter: selectedGroupId || 'all',
        sortBy,
        sortOrder,
        favoriteList: favorites.map((f: any) => ({
          complexNo: f.complexNo,
          complexName: f.complexName,
          isFavorite: f.isFavorite
        }))
      });

      setComplexes(data.complexes || []);
      // 그룹 목록도 새로고침 (그룹 카운트 업데이트를 위해)
      setGroupRefreshTrigger(prev => prev + 1);
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

  // 단지 조회 및 추가 (통합: 조회 성공 시 바로 추가 + 크롤링)
  const handleFetchAndAddComplex = async () => {
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

    const loadingToast = showLoading('단지 정보 조회 중...');
    try {
      // 1. 단지 정보 조회
      const infoResponse = await fetch(`/api/complex-info?complexNo=${complexNo}`);
      const infoData = await infoResponse.json();

      if (!infoResponse.ok || !infoData.success) {
        dismissToast(loadingToast);
        showError(infoData.error || '단지 정보를 가져올 수 없습니다.');
        setFetchingInfo(false);
        return;
      }

      const complexInfo = infoData.complex;
      dismissToast(loadingToast);

      // 2. DB에 추가 (Complex 테이블에만, Favorite에는 추가하지 않음)
      const addToast = showLoading('단지 추가 중...');
      const addResponse = await fetch('/api/complex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complexNo: complexInfo.complexNo,
          complexName: complexInfo.complexName
        })
      });

      const addData = await addResponse.json();

      if (!addResponse.ok) {
        dismissToast(addToast);
        showError(addData.error || '단지 추가 실패');
        setFetchingInfo(false);
        return;
      }

      dismissToast(addToast);
      showSuccess(`${complexInfo.complexName}이(가) 추가되었습니다!`);

      await fetchComplexes();
      setNewComplexNo("");
      setComplexInfo(null);
      setShowAddForm(false);

      // 3. 자동으로 크롤링 시작
      const crawlToast = showLoading(`${complexInfo.complexName} 매물 수집 중...`);

      setCrawling(complexInfo.complexNo);
      try {
        const crawlResponse = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complexNumbers: complexInfo.complexNo })
        });

        const crawlData = await crawlResponse.json();

        if (crawlResponse.ok && crawlData.crawlId) {
          // 크롤링 진행 상황 폴링
          await pollCrawlStatus(crawlData.crawlId);
          await fetchComplexes();
          dismissToast(crawlToast);
          showSuccess(`${complexInfo.complexName} 크롤링 완료!`);
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
    } catch (error) {
      dismissToast(loadingToast);
      console.error('Failed to fetch and add complex:', error);
      showError('단지 추가 중 오류가 발생했습니다.');
    } finally {
      setFetchingInfo(false);
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
      const response = await fetch(`/api/complex?complexNo=${deleteComplexDialog.complexNo}`, {
        method: 'DELETE'
      });

      dismissToast(loadingToast);

      if (response.ok) {
        const data = await response.json();
        await fetchComplexes();
        showSuccess(`단지가 완전히 삭제되었습니다. (매물 ${data.deletedData?.articles || 0}개 포함)`);
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
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
        {/* Header */}
        <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* 그룹 사이드바 - 축소 */}
          <div className={`
            w-64 flex-shrink-0
            lg:block
            ${showGroupSidebar ? 'block' : 'hidden'}
            ${showGroupSidebar ? 'fixed inset-0 z-50 lg:relative lg:inset-auto' : ''}
          `}>
            {/* 모바일 오버레이 */}
            {showGroupSidebar && (
              <div
                className="lg:hidden absolute inset-0 bg-black/50"
                onClick={() => setShowGroupSidebar(false)}
              />
            )}

            {/* 사이드바 컨텐츠 */}
            <div className={`
              lg:sticky lg:top-8
              ${showGroupSidebar ? 'relative z-10 h-full bg-gray-50 dark:bg-gray-900 lg:bg-transparent p-4 lg:p-0' : ''}
            `}>
              {/* 모바일 닫기 버튼 */}
              {showGroupSidebar && (
                <button
                  onClick={() => setShowGroupSidebar(false)}
                  className="lg:hidden absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
                >
                  ✕
                </button>
              )}

              <GroupManagement
                selectedGroupId={selectedGroupId}
                onGroupSelect={setSelectedGroupId}
                onGroupsChange={fetchComplexes}
                onAddComplexClick={() => setShowAddForm(true)}
                refreshTrigger={groupRefreshTrigger}
                compareMode={compareMode}
                onCompareToggle={toggleCompareMode}
                complexCount={complexes.length}
                totalComplexCount={totalComplexCount}
              />
            </div>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex-1 min-w-0">
        {/* Search Bar - 메인 컨텐츠 상단으로 이동 */}
        <div className="mb-6">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm">단지명, 주소로 검색...</span>
            <kbd className="ml-auto hidden sm:inline-block px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {/* 그룹 버튼 - 모바일에서만 표시 */}
              <button
                onClick={() => setShowGroupSidebar(!showGroupSidebar)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-semibold shadow-md bg-purple-600 hover:bg-purple-700 text-white"
                title="그룹 관리"
              >
                <Folder className="w-4 h-4" />
                <span>그룹</span>
              </button>
              <button
                onClick={handleCrawlAll}
                disabled={crawlingAll || complexes.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-semibold shadow-md ${
                  crawlingAll || complexes.length === 0
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {crawlingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>크롤링 중...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>전체 크롤링</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  console.log('[Complexes] Manual refresh triggered');
                  fetchComplexes();
                }}
                disabled={!!(crawlingAll || crawling)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-semibold shadow-md ${
                  crawlingAll || crawling
                    ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed text-gray-500'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="DB 데이터 새로고침 (크롤링 없음)"
              >
                <RefreshCw className="w-4 h-4" />
                <span>새로고침</span>
              </button>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* 고급 필터 */}
              <div className="flex items-center gap-2">
                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 가격</option>
                  <option value="0-3">3억 이하</option>
                  <option value="3-5">3억 ~ 5억</option>
                  <option value="5-10">5억 ~ 10억</option>
                  <option value="10+">10억 이상</option>
                </select>

                <select
                  value={filters.articleCount}
                  onChange={(e) => setFilters({ ...filters, articleCount: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 매물</option>
                  <option value="0">매물 없음</option>
                  <option value="1-10">1 ~ 10개</option>
                  <option value="10-50">10 ~ 50개</option>
                  <option value="50+">50개 이상</option>
                </select>
              </div>

              {/* 정렬 필터 */}
              <ComplexSortFilter
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(newSortBy, newSortOrder) => {
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
              />
              {/* View Mode Toggle */}
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                    viewMode === 'card'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>카드</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>리스트</span>
                </button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filters.priceRange === 'all' && filters.articleCount === 'all' ? (
                  <>등록된 단지: <span className="font-bold text-blue-600 dark:text-blue-400">{complexes.length}개</span></>
                ) : (
                  <>
                    필터 결과: <span className="font-bold text-blue-600 dark:text-blue-400">{filteredComplexes.length}개</span>
                    <span className="text-gray-400 dark:text-gray-500"> / {complexes.length}개</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 비교 모드 안내 배너 */}
          {compareMode && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-400 dark:border-purple-600 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-1">
                    📊 단지 비교 모드
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    비교할 단지를 선택하세요 (2개 ~ 5개)
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    선택됨: {selectedForCompare.length}개
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startComparison}
                    disabled={selectedForCompare.length < 2}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedForCompare.length >= 2
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    비교하기
                  </button>
                  <button
                    onClick={toggleCompareMode}
                    className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}


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
                          // 단지번호 설정하고 바로 조회 및 추가
                          setNewComplexNo(recentOneTimeCrawl.complexNo);
                          // 약간의 딜레이 후 실행 (state 업데이트 대기)
                          setTimeout(() => {
                            handleFetchAndAddComplex();
                          }, 100);
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
                    onKeyPress={(e) => e.key === 'Enter' && handleFetchAndAddComplex()}
                  />
                  <button
                    onClick={handleFetchAndAddComplex}
                    disabled={fetchingInfo || crawling}
                    className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                      fetchingInfo || crawling
                        ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white'
                    }`}
                  >
                    {fetchingInfo || crawling ? '⏳ 처리중...' : '✅ 조회 및 추가'}
                  </button>
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

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                단지 조회 후 자동으로 추가되며 매물 정보를 수집합니다. 관심 단지는 카드에서 별도로 추가하세요.
              </p>
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
        ) : filteredComplexes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              필터 조건에 맞는 단지가 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              다른 필터 조건을 선택해보세요
            </p>
            <button
              onClick={() => setFilters({ priceRange: 'all', articleCount: 'all' })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          </div>
        ) : viewMode === 'card' ? (
          // 카드 뷰
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplexes.map((complex, index) => (
              <div
                key={complex.complexNo}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${
                  compareMode && selectedForCompare.includes(complex.complexNo)
                    ? 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500 dark:ring-purple-400'
                    : complex.articleChange24h && complex.articleChange24h > 0
                    ? 'border-green-300 dark:border-green-700 hover:shadow-lg hover:border-green-400 dark:hover:border-green-600'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                }`}
              >
                <div className="px-6 py-6">
                  {/* 비교 모드 체크박스 */}
                  {compareMode && (
                    <div className="mb-4 flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedForCompare.includes(complex.complexNo)}
                          onChange={() => toggleCompareSelection(complex.complexNo)}
                          disabled={!selectedForCompare.includes(complex.complexNo) && selectedForCompare.length >= 5}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                          비교 선택
                        </span>
                      </label>
                      {!selectedForCompare.includes(complex.complexNo) && selectedForCompare.length >= 5 && (
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                          최대 5개
                        </span>
                      )}
                    </div>
                  )}
                  {/* 단지명 - 1열 배치 */}
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {complex.complexName || `단지 ${complex.complexNo}`}
                    </h3>
                    {/* 24시간 매물 변동 배지 */}
                    {complex.articleChange24h !== undefined && complex.articleChange24h > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        +{complex.articleChange24h}
                      </span>
                    )}
                  </div>

                  {/* 단지번호와 관심등록 버튼 - 같은 줄 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>📍</span>
                      <span>단지번호 {complex.complexNo}</span>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(complex.complexNo, complex.isFavorite)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        complex.isFavorite
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${complex.isFavorite ? 'fill-current' : ''}`} />
                      <span>{complex.isFavorite ? '관심단지' : '관심등록'}</span>
                    </button>
                  </div>

                  {/* 그룹 배지 */}
                  <div className="mb-3">
                    <ComplexGroupBadges
                      complexId={complex.id}
                      complexName={complex.complexName}
                      groups={complex.groups || []}
                      onGroupsChange={fetchComplexes}
                    />
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

                    {/* 등록일 */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">등록일</span>
                      <span className="text-gray-900 dark:text-white font-medium text-xs">
                        {(() => {
                          const dateStr = complex.createdAt || complex.updatedAt;
                          if (dateStr && !isNaN(new Date(dateStr).getTime())) {
                            return new Date(dateStr).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            });
                          }
                          return '-';
                        })()}
                      </span>
                    </div>

                    {/* 최근 수집일 */}
                    {complex.lastCrawledAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">최근 수집</span>
                        <span className="text-gray-900 dark:text-white font-medium text-xs">
                          {!isNaN(new Date(complex.lastCrawledAt).getTime())
                            ? new Date(complex.lastCrawledAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : '-'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 가격 정보 */}
                  {complex.priceStats && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">평균 가격</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {complex.priceStats.avgPrice}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-500">최저가</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {complex.priceStats.minPrice}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-500">최고가</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {complex.priceStats.maxPrice}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 거래 유형별 통계 */}
                  {complex.tradeTypeStats && complex.tradeTypeStats.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          거래 유형별
                        </div>
                        {complex.tradeTypeStats.map((stat) => (
                          <div key={stat.type} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">
                              {stat.type} ({stat.count}개)
                            </span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {stat.avgPrice}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* 원래 닫는 div 유지 */}
                  <div className="space-y-2.5 text-sm mb-4 hidden">
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex flex-col gap-2 mt-4">
                    {/* 첫 번째 줄: 상세보기 + 상세 분석 */}
                    <div className="flex gap-2">
                      <Link
                        href={`/complex/${complex.complexNo}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        <span>상세보기</span>
                      </Link>
                      <Link
                        href={`/analytics?mode=single&complexNos=${complex.complexNo}&autoRun=true`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-sm font-medium"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>상세 분석</span>
                      </Link>
                    </div>
                    {/* 두 번째 줄: 네이버부동산 + 크롤링 + 삭제 */}
                    <div className="flex gap-2">
                      <a
                        href={`https://new.land.naver.com/complexes/${complex.complexNo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm font-medium"
                        title="네이버부동산에서 보기"
                      >
                        <Image src="/naver-logo.svg" alt="Naver" width={18} height={18} className="flex-shrink-0" />
                        <span>네이버</span>
                      </a>
                      <button
                        onClick={() => handleCrawlComplex(complex.complexNo)}
                        disabled={crawling === complex.complexNo || crawlingAll}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors whitespace-nowrap ${
                          crawling === complex.complexNo || crawlingAll
                            ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        {crawling === complex.complexNo ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                            <span>크롤링 중...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>크롤링</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteComplex(complex.complexNo, complex.complexName)}
                        className="px-4 py-2 rounded-lg border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                        title="단지 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                    평균 가격
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    매물 수
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    마지막 수집
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredComplexes.map((favorite, index) => (
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
                    <td className="px-4 py-4 whitespace-nowrap">
                      {favorite.priceStats ? (
                        <div className="text-sm">
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {favorite.priceStats.avgPrice}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {favorite.priceStats.minPrice} ~ {favorite.priceStats.maxPrice}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {favorite.articleCount !== undefined ? `${favorite.articleCount}개` : '-'}
                        </span>
                        {favorite.articleChange24h !== undefined && favorite.articleChange24h > 0 && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            +{favorite.articleChange24h}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(favorite.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(favorite.lastCrawledAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>상세</span>
                          </Link>
                        )}
                        <Link
                          href={`/analytics?mode=single&complexNos=${favorite.complexNo}&autoRun=true`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>분석</span>
                        </Link>
                      </div>
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
              <SearchIcon className="w-5 h-5" />
              <span>일회성 매물 조회</span>
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

      {/* Delete Complex Confirmation Dialog */}
      <Dialog
        isOpen={deleteComplexDialog.isOpen}
        onClose={() => setDeleteComplexDialog({ isOpen: false, complexNo: null, complexName: null })}
        onConfirm={confirmDeleteComplex}
        title="⚠️ 단지 완전 삭제"
        description={`${deleteComplexDialog.complexName}을(를) 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n• 단지 정보\n• 모든 매물 데이터\n• 관심단지 연결\n• 그룹 연결\n\n※ 본인이 생성한 단지만 삭제할 수 있습니다.`}
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
          </div> {/* 메인 컨텐츠 닫기 */}
        </div> {/* flex 컨테이너 닫기 */}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <GlobalSearch
              onClose={() => setIsSearchOpen(false)}
              autoFocus={true}
            />
          </div>
        </div>
      )}

      {/* 단지 비교 모달 */}
      {showCompareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="w-full max-w-7xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b border-purple-500">
              <div>
                <h2 className="text-2xl font-bold text-white">📊 단지 비교</h2>
                <p className="text-sm text-purple-100 mt-1">
                  {selectedForCompare.length}개 단지 비교 결과
                </p>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 비교 테이블 */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-900">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 sticky left-0 bg-gray-100 dark:bg-gray-900">
                        항목
                      </th>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <th key={complexNo} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 min-w-[200px]">
                            {complex?.complexName || complexNo}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 단지번호 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        단지번호
                      </td>
                      {selectedForCompare.map(complexNo => (
                        <td key={complexNo} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                          {complexNo}
                        </td>
                      ))}
                    </tr>

                    {/* 평균 가격 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        평균 가격
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                            {complex?.priceStats?.avgPrice || '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 가격 범위 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        가격 범위
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {complex?.priceStats ? (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                  최저: {complex.priceStats.minPrice}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                  최고: {complex.priceStats.maxPrice}
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 매물 수 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        등록 매물 수
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 text-sm font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {complex?.articleCount || 0}개
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* 세대수 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        총 세대수
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {complex?.totalHousehold ? `${complex.totalHousehold.toLocaleString()}세대` : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 동수 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        총 동수
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {complex?.totalDong ? `${complex.totalDong}개동` : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 주소 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        주소
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                            {complex?.roadAddress || complex?.address || '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 최근 수집일 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        최근 수집일
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                            {complex?.lastCrawledAt ? new Date(complex.lastCrawledAt).toLocaleDateString('ko-KR') : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 거래 유형별 통계 */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-800">
                        거래 유형별
                      </td>
                      {selectedForCompare.map(complexNo => {
                        const complex = complexes.find(c => c.complexNo === complexNo);
                        return (
                          <td key={complexNo} className="px-4 py-3 text-center">
                            {complex?.tradeTypeStats && complex.tradeTypeStats.length > 0 ? (
                              <div className="space-y-1 text-xs">
                                {complex.tradeTypeStats.map(stat => (
                                  <div key={stat.type} className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400">{stat.type} ({stat.count})</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{stat.avgPrice}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 액션 버튼 */}
              <div className="mt-6 flex items-center justify-end gap-3">
                {selectedForCompare.map(complexNo => {
                  const complex = complexes.find(c => c.complexNo === complexNo);
                  return (
                    <Link
                      key={complexNo}
                      href={`/complex/${complexNo}`}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      {complex?.complexName || complexNo} 상세보기
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
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
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              crawling || !complexNo.trim()
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {crawling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>크롤링 중...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>크롤링</span>
              </>
            )}
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
