"use client";

import { useState } from 'react';

export interface FilterOptions {
  // 지역 필터
  regions?: string[];

  // 단지 규모
  minDong?: number;
  maxDong?: number;
  minHosu?: number;
  maxHosu?: number;

  // 매물 정보
  minArticles?: number;
  tradeTypes?: ('매매' | '전세' | '월세')[];

  // 가격 범위
  minPrice?: number;
  maxPrice?: number;

  // 면적 범위
  minArea?: number;
  maxArea?: number;

  // 날짜 필터
  dateFrom?: string;
  dateTo?: string;

  // 즐겨찾기
  favoritesOnly?: boolean;
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  availableRegions?: string[];
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onReset,
  availableRegions = [],
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.values(filters).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    return v !== undefined && v !== null && v !== '';
  }).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white">고급 필터</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              {activeFilterCount}개 적용
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              초기화
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* 지역 필터 */}
          {availableRegions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                지역
              </label>
              <div className="flex flex-wrap gap-2">
                {availableRegions.map((region) => (
                  <button
                    key={region}
                    onClick={() => {
                      const current = filters.regions || [];
                      const updated = current.includes(region)
                        ? current.filter((r) => r !== region)
                        : [...current, region];
                      updateFilter('regions', updated.length > 0 ? updated : undefined);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      filters.regions?.includes(region)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 단지 규모 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                동 수
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="최소"
                  value={filters.minDong || ''}
                  onChange={(e) => updateFilter('minDong', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500 dark:text-gray-400">~</span>
                <input
                  type="number"
                  placeholder="최대"
                  value={filters.maxDong || ''}
                  onChange={(e) => updateFilter('maxDong', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                세대 수
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="최소"
                  value={filters.minHosu || ''}
                  onChange={(e) => updateFilter('minHosu', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500 dark:text-gray-400">~</span>
                <input
                  type="number"
                  placeholder="최대"
                  value={filters.maxHosu || ''}
                  onChange={(e) => updateFilter('maxHosu', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 거래 유형 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              거래 유형
            </label>
            <div className="flex flex-wrap gap-2">
              {(['매매', '전세', '월세'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    const current = filters.tradeTypes || [];
                    const updated = current.includes(type)
                      ? current.filter((t) => t !== type)
                      : [...current, type];
                    updateFilter('tradeTypes', updated.length > 0 ? updated : undefined);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    filters.tradeTypes?.includes(type)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 매물 수 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              최소 매물 수
            </label>
            <input
              type="number"
              placeholder="예: 10"
              value={filters.minArticles || ''}
              onChange={(e) => updateFilter('minArticles', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 가격 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              가격 범위 (만원)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소"
                value={filters.minPrice || ''}
                onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">~</span>
              <input
                type="number"
                placeholder="최대"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 면적 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              면적 범위 (㎡)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="최소"
                value={filters.minArea || ''}
                onChange={(e) => updateFilter('minArea', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">~</span>
              <input
                type="number"
                placeholder="최대"
                value={filters.maxArea || ''}
                onChange={(e) => updateFilter('maxArea', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 날짜 범위 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              수집 날짜
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400">~</span>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 즐겨찾기만 */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.favoritesOnly || false}
                onChange={(e) => updateFilter('favoritesOnly', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                즐겨찾기만 표시
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
