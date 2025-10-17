"use client";

import { ReactNode } from 'react';

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  icon?: ReactNode;
}

interface InsightCardProps {
  insight: Insight;
  onClick?: () => void;
}

const typeStyles = {
  positive: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-700 dark:text-green-300',
  },
  negative: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-700 dark:text-red-300',
  },
  neutral: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    textColor: 'text-orange-700 dark:text-orange-300',
  },
};

const defaultIcons = {
  positive: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  negative: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  neutral: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const styles = typeStyles[insight.type];
  const icon = insight.icon || defaultIcons[insight.type];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`${styles.bg} ${styles.border} border rounded-xl p-4 ${
        onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`${styles.iconBg} ${styles.iconColor} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {insight.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {insight.description}
          </p>
          {(insight.metric || insight.change !== undefined) && (
            <div className="flex items-center gap-2">
              {insight.metric && (
                <span className={`text-sm font-bold ${styles.textColor}`}>
                  {insight.metric}
                </span>
              )}
              {insight.change !== undefined && (
                <span className={`text-xs font-medium ${styles.textColor} flex items-center gap-1`}>
                  {insight.change > 0 ? '↑' : insight.change < 0 ? '↓' : '→'}
                  {Math.abs(insight.change)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Component>
  );
}

interface InsightListProps {
  insights: Insight[];
  maxItems?: number;
}

export function InsightList({ insights, maxItems }: InsightListProps) {
  const displayedInsights = maxItems ? insights.slice(0, maxItems) : insights;

  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          인사이트
        </h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm">분석할 데이터가 충분하지 않습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          인사이트
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {insights.length}개 발견
        </span>
      </div>
      <div className="space-y-3">
        {displayedInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
      {maxItems && insights.length > maxItems && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {insights.length - maxItems}개 더보기
          </button>
        </div>
      )}
    </div>
  );
}
