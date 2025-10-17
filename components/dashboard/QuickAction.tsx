"use client";

import { ReactNode } from 'react';
import Link from 'next/link';

interface QuickActionProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  external?: boolean;
}

const colorClasses = {
  blue: 'from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700',
  green: 'from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700',
  purple: 'from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700',
  orange: 'from-orange-600 to-red-600 dark:from-orange-700 dark:to-red-700',
  red: 'from-red-600 to-rose-600 dark:from-red-700 dark:to-rose-700',
  indigo: 'from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700',
};

export function QuickAction({
  title,
  description,
  icon,
  href,
  onClick,
  color = 'blue',
  external = false,
}: QuickActionProps) {
  const gradientClass = colorClasses[color];

  const content = (
    <div className={`bg-gradient-to-br ${gradientClass} rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 p-6 text-white h-full`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{title}</h3>
          <p className="text-white/90 text-sm">{description}</p>
        </div>
        <svg
          className="w-5 h-5 text-white/80 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
        >
          {content}
        </a>
      );
    }
    return (
      <Link
        href={href}
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
      >
        {content}
      </button>
    );
  }

  return content;
}
