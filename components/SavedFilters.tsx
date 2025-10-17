"use client";

import { useState, useEffect } from 'react';
import { FilterOptions } from './AdvancedFilters';

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  createdAt: string;
}

interface SavedFiltersProps {
  currentFilters: FilterOptions;
  onLoadFilter: (filters: FilterOptions) => void;
}

const STORAGE_KEY = 'saved_filters';

export function SavedFilters({ currentFilters, onLoadFilter }: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  // 로컬 스토리지에서 저장된 필터 로드
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  // 필터 저장
  const saveFilter = () => {
    if (!filterName.trim()) {
      alert('필터 이름을 입력해주세요.');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    setFilterName('');
    setIsModalOpen(false);
  };

  // 필터 삭제
  const deleteFilter = (id: string) => {
    if (!confirm('이 필터를 삭제하시겠습니까?')) {
      return;
    }

    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // 필터 설명 생성
  const getFilterDescription = (filters: FilterOptions): string => {
    const parts: string[] = [];

    if (filters.regions && filters.regions.length > 0) {
      parts.push(`지역: ${filters.regions.join(', ')}`);
    }
    if (filters.minDong || filters.maxDong) {
      parts.push(`동: ${filters.minDong || '?'}~${filters.maxDong || '?'}`);
    }
    if (filters.minHosu || filters.maxHosu) {
      parts.push(`세대: ${filters.minHosu || '?'}~${filters.maxHosu || '?'}`);
    }
    if (filters.tradeTypes && filters.tradeTypes.length > 0) {
      parts.push(`거래: ${filters.tradeTypes.join(', ')}`);
    }
    if (filters.minArticles) {
      parts.push(`매물: ${filters.minArticles}개 이상`);
    }
    if (filters.favoritesOnly) {
      parts.push('즐겨찾기만');
    }

    return parts.length > 0 ? parts.join(' | ') : '필터 없음';
  };

  return (
    <div className="space-y-3">
      {/* 저장된 필터 목록 */}
      {savedFilters.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              저장된 필터
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {savedFilters.length}개
            </span>
          </div>

          <div className="space-y-2">
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <button
                  onClick={() => onLoadFilter(filter.filters)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {filter.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {getFilterDescription(filter.filters)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(filter.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </button>
                <button
                  onClick={() => deleteFilter(filter.id)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  aria-label="필터 삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 현재 필터 저장 버튼 */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        현재 필터 저장
      </button>

      {/* 저장 모달 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              필터 저장
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                필터 이름
              </label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveFilter();
                  }
                }}
                placeholder="예: 서울 강남 3억 이하 매물"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                현재 필터 설정:
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                {getFilterDescription(currentFilters)}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFilterName('');
                  setIsModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveFilter}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
