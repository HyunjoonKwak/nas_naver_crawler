"use client";

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'white' | 'gray' | 'green' | 'red';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const colorClasses = {
  blue: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-600',
  green: 'border-green-600',
  red: 'border-red-600',
};

export function LoadingSpinner({
  size = 'md',
  color = 'blue',
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-b-2 ${colorClasses[color]}`}
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}
