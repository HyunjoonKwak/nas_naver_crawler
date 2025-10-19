"use client";

import { useRef, useState, useEffect, ReactNode, CSSProperties } from 'react';
import { useThrottleCallback } from '@/hooks/useThrottle';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  // 스크롤 이벤트 쓰로틀링 (16ms ≈ 60fps)
  const handleScroll = useThrottleCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  gap?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  gap = 0,
  renderItem,
  className = '',
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const columns = Math.floor(containerWidth / (itemWidth + gap));
  const rows = Math.ceil(items.length / columns);
  const totalHeight = rows * (itemHeight + gap);

  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - 1);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + 1
  );

  const visibleItems: Array<{ item: T; index: number; row: number; col: number }> = [];

  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < items.length) {
        visibleItems.push({
          item: items[index],
          index,
          row,
          col,
        });
      }
    }
  }

  // 스크롤 이벤트 쓰로틀링 (16ms ≈ 60fps)
  const handleScroll = useThrottleCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: row * (itemHeight + gap),
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
