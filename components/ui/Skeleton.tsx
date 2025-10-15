import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = '1rem',
  circle = false,
  count = 1,
  className = '',
  style,
  ...props
}) => {
  const skeletonStyle: React.CSSProperties = {
    width: width,
    height: height,
    ...style,
  };

  const skeletonClass = `animate-pulse bg-gray-200 dark:bg-gray-700 ${
    circle ? 'rounded-full' : 'rounded'
  } ${className}`;

  if (count === 1) {
    return <div className={skeletonClass} style={skeletonStyle} {...props} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`${skeletonClass} mb-2`} style={skeletonStyle} {...props} />
      ))}
    </>
  );
};

// 특화 Skeleton 컴포넌트들

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6">
      <div className="space-y-4">
        <Skeleton height="2rem" width="60%" />
        <Skeleton height="1rem" width="40%" />
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
          <Skeleton height="4rem" />
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Skeleton width="20%" height="1.25rem" />
        <Skeleton width="30%" height="1.25rem" />
        <Skeleton width="25%" height="1.25rem" />
        <Skeleton width="25%" height="1.25rem" />
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 p-4">
          <Skeleton width="20%" height="1rem" />
          <Skeleton width="30%" height="1rem" />
          <Skeleton width="25%" height="1rem" />
          <Skeleton width="25%" height="1rem" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '300px' }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6">
      <div className="space-y-4">
        <Skeleton height="1.5rem" width="40%" />
        <div className="flex items-end justify-around gap-2" style={{ height }}>
          <Skeleton height="60%" width="10%" />
          <Skeleton height="80%" width="10%" />
          <Skeleton height="40%" width="10%" />
          <Skeleton height="90%" width="10%" />
          <Skeleton height="70%" width="10%" />
          <Skeleton height="50%" width="10%" />
        </div>
      </div>
    </div>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="space-y-3">
        <Skeleton circle width="3rem" height="3rem" />
        <Skeleton height="0.875rem" width="50%" />
        <Skeleton height="2rem" width="70%" />
      </div>
    </div>
  );
};

// 컴플렉스 카드 스켈레톤 (관심 단지용)
export const ComplexCardSkeleton: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <Skeleton height="1.25rem" width="70%" />
      <Skeleton height="0.75rem" width="40%" className="mt-1" />

      <div className="mt-4 space-y-3">
        <Skeleton height="4rem" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
          <Skeleton height="3.5rem" />
        </div>
      </div>
    </div>
  );
};

// 리스트 스켈레톤
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <Skeleton circle width="3rem" height="3rem" />
          <div className="flex-1 space-y-2">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.875rem" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
};
