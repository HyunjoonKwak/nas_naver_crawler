"use client";

import { useState } from "react";

interface CrawlerFormProps {
  onCrawlComplete: () => void;
}

export default function CrawlerForm({ onCrawlComplete }: CrawlerFormProps) {
  const [complexNumbers, setComplexNumbers] = useState("22065");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

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

      if (response.ok) {
        setMessage(`✅ 크롤링 완료! ${numbers.length}개 단지 처리됨`);
        setComplexNumbers("");
        onCrawlComplete();
      } else {
        setError(data.error || '크롤링 실패');
      }
    } catch (err: any) {
      setError(`오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        부동산 정보 크롤링
      </h2>

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

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 단지 번호 찾는 방법
          </h3>
          <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>네이버 부동산 사이트 접속</li>
            <li>원하는 단지 페이지로 이동</li>
            <li>URL에서 단지 번호 확인</li>
            <li>예: new.land.naver.com/complexes/<strong>22065</strong></li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={loading || !complexNumbers.trim()}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
            loading || !complexNumbers.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              크롤링 중...
            </span>
          ) : (
            '🚀 크롤링 시작'
          )}
        </button>
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

