"use client";

interface ComplexSortFilterProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function ComplexSortFilter({ sortBy, sortOrder, onSortChange }: ComplexSortFilterProps) {
  const sortOptions = [
    { value: 'updatedAt', label: '최근 크롤링순' },
    { value: 'name', label: '단지명순' },
    { value: 'region', label: '지역순' },
    { value: 'createdAt', label: '추가일순' },
    { value: 'complexNo', label: '단지번호순' },
    { value: 'articleCount', label: '매물수순' },
  ];

  const handleSortByChange = (newSortBy: string) => {
    onSortChange(newSortBy, sortOrder);
  };

  const handleSortOrderToggle = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={sortBy}
        onChange={(e) => handleSortByChange(e.target.value)}
        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        onClick={handleSortOrderToggle}
        className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
      >
        {sortOrder === 'asc' ? (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        )}
      </button>
    </div>
  );
}
