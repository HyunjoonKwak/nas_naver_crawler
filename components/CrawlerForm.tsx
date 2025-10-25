"use client";

import { useState, useEffect, useRef } from "react";

interface CrawlerFormProps {
  onCrawlComplete: () => void;
}

interface CrawlStatus {
  crawlId?: string;
  status: string; // 'crawling', 'saving', 'success', 'partial', 'failed'
  currentStep: string;
  complexProgress: number;
  processedArticles: number;
  processedComplexes?: number;
  totalComplexes?: number;
  duration?: number;
}

export default function CrawlerForm({ onCrawlComplete }: CrawlerFormProps) {
  const [complexNumbers, setComplexNumbers] = useState("22065");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [currentCrawlId, setCurrentCrawlId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 시간을 MM:SS 형식으로 변환
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 경과 시간 타이머 시작
  const startElapsedTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setStartTime(Date.now());
    setElapsedSeconds(0);

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  // 경과 시간 타이머 중지
  const stopElapsedTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // 크롤링 상태 폴링 (DB 기반)
  const startStatusPolling = (crawlId: string) => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }

    setCurrentCrawlId(crawlId);
    let pollCount = 0;
    const maxPolls = 450; // 15분

    statusIntervalRef.current = setInterval(async () => {
      try {
        pollCount++;
        console.log(`[CrawlerForm] Polling ${pollCount}/${maxPolls} for crawlId: ${crawlId}`);

        const response = await fetch(`/api/crawl-status?crawlId=${crawlId}`);
        const data = await response.json();

        console.log('[CrawlerForm] Status:', data.status, 'Progress:', data.progress);

        if (!response.ok) {
          console.error('[CrawlerForm] API error:', data.error);
          stopStatusPolling();
          setError(data.error || '❌ 상태 조회 실패');
          setLoading(false);
          return;
        }

        // 진행 상황 업데이트
        setCrawlStatus({
          crawlId: data.crawlId,
          status: data.status,
          currentStep: data.progress?.currentStep || 'Processing...',
          complexProgress: data.progress?.complexProgress || 0,
          processedArticles: data.progress?.processedArticles || 0,
          processedComplexes: data.progress?.processedComplexes || 0,
          totalComplexes: data.progress?.totalComplexes || 0,
          duration: data.duration || 0,
        });

        // 완료 또는 실패 시 폴링 중지
        if (data.status === 'success' || data.status === 'partial' || data.status === 'failed') {
          console.log('[CrawlerForm] Completed with status:', data.status);
          stopStatusPolling();

          if (data.status === 'success' || data.status === 'partial') {
            setMessage('✅ 크롤링 완료!');
            onCrawlComplete();
          } else {
            setError(data.errorMessage || '❌ 크롤링 실패');
          }

          setLoading(false);
          return;
        }

        // 타임아웃 체크
        if (pollCount >= maxPolls) {
          console.error('[CrawlerForm] Timeout reached');
          stopStatusPolling();
          setError('❌ 타임아웃 - 15분 초과');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('[CrawlerForm] Polling error:', err);
        stopStatusPolling();
        setError('❌ 상태 확인 중 오류 발생');
        setLoading(false);
      }
    }, 2000); // 2초마다 폴링
  };

  const stopStatusPolling = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    setCurrentCrawlId(null);
    stopElapsedTimer();
  };

  const handleStopCrawl = () => {
    const message = `⚠️ 중요: 크롤링을 중단하시겠습니까?\n\n` +
      `현재 UI에서는 진행 상황 추적만 중단됩니다.\n` +
      `백그라운드에서 실행 중인 크롤링은 계속 진행되며 완료됩니다.\n\n` +
      `결과는 나중에 히스토리에서 확인할 수 있습니다.`;

    if (confirm(message)) {
      stopStatusPolling();
      setLoading(false);
      setCrawlStatus(null);
      setMessage('✅ UI 추적을 중단했습니다. 백그라운드 크롤링은 계속 진행됩니다.');
      setError('');
    }
  };

  // Note: checkOngoingCrawl() removed to prevent auto-resume of ongoing crawls
  // This prevents confusion when users just want to view the page without triggering crawls
  useEffect(() => {
    return () => {
      stopStatusPolling();
      stopElapsedTimer();
    };
  }, []);

  // Note: checkOngoingCrawl() function removed - no longer needed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setCrawlStatus(null);

    try {
      const numbers = complexNumbers.split(',').map(n => n.trim()).filter(Boolean);

      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ complexNumbers: numbers }),
      });

      const data = await response.json();

      if (response.ok && data.crawlId) {
        // crawlId를 받아서 폴링 시작
        console.log('[CrawlerForm] Starting polling for crawlId:', data.crawlId);
        startElapsedTimer(); // 타이머 시작
        startStatusPolling(data.crawlId);
        setComplexNumbers("");
      } else {
        setError(data.error || '크롤링 시작 실패');
        setLoading(false);
      }
    } catch (err: any) {
      setError(`오류 발생: ${err.message}`);
      setLoading(false);
      stopStatusPolling();
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="complexNumbers" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            단지 번호
          </label>
          <input
            type="text"
            id="complexNumbers"
            value={complexNumbers}
            onChange={(e) => setComplexNumbers(e.target.value)}
            placeholder="22065 또는 22065,12345,67890"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            여러 단지를 크롤링하려면 쉼표로 구분하세요.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                단지 번호 찾는 방법
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                네이버 부동산 사이트에서 원하는 단지 페이지로 이동 후, URL에서 단지 번호를 확인하세요.
              </p>
              <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                예: new.land.naver.com/complexes/<span className="text-blue-600 dark:text-blue-400 font-bold">22065</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !complexNumbers.trim()}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-white transition-all shadow-lg ${
              loading || !complexNumbers.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl active:scale-95'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg">크롤링 중...</span>
              </span>
            ) : (
              <span className="text-lg flex items-center justify-center gap-2">
                <span>🚀</span>
                <span>크롤링 시작</span>
              </span>
            )}
          </button>

          {loading && (
            <button
              type="button"
              onClick={handleStopCrawl}
              className="px-6 py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <span>⏹️</span>
                <span>중단</span>
              </span>
            </button>
          )}
        </div>

        {/* 실시간 진행 상태 표시 */}
        {crawlStatus && loading && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-900 dark:text-blue-300 font-medium">
                {crawlStatus.currentStep}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {crawlStatus.status === 'crawling' ? '🔍 크롤링 중' :
                 crawlStatus.status === 'saving' ? '💾 데이터베이스 저장 중' :
                 '✅ 완료'}
              </span>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${crawlStatus.complexProgress}%` }}
              >
                {/* 애니메이션 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>

            {/* 상세 정보 */}
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400">
              <span>진행률: {crawlStatus.complexProgress}%</span>
              {crawlStatus.processedComplexes !== undefined && crawlStatus.totalComplexes && (
                <span>
                  {crawlStatus.processedComplexes} / {crawlStatus.totalComplexes} 단지
                </span>
              )}
            </div>

            {/* 경과 시간 및 매물 정보 */}
            <div className="pt-3 border-t border-blue-200 dark:border-blue-700 grid grid-cols-2 gap-3">
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
                  {crawlStatus.processedArticles > 0 ? crawlStatus.processedArticles.toLocaleString() : '0'} <span className="text-xs font-normal">개</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Success Message */}
      {message && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-300 text-sm font-medium">
            {message}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium">
            ❌ {error}
          </p>
        </div>
      )}
    </div>
  );
}

