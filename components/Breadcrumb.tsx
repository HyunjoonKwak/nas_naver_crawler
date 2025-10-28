import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb 네비게이션 컴포넌트
 *
 * 사용자가 현재 위치를 파악하고 상위 페이지로 쉽게 이동할 수 있게 도와줍니다.
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: '단지 관리', href: '/complexes' },
 *     { label: '아크로리버파크 6단지' }
 *   ]}
 * />
 */
export const Breadcrumb = ({ items, className = '' }: BreadcrumbProps) => {
  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      {/* 홈 아이콘 */}
      <Link
        href="/"
        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="홈으로"
      >
        <Home className="w-4 h-4" />
      </Link>

      {/* Breadcrumb 항목들 */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`${
                  isLast
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};
