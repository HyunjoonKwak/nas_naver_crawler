"use client";

import { ReactNode } from 'react';
import { useSwipe } from '@/hooks/useSwipe';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: ReactNode;
    label: string;
    color: string;
  };
  threshold?: number;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
}: SwipeableCardProps) {
  const swipe = useSwipe({
    onSwipeLeft,
    onSwipeRight,
    threshold,
  });

  const showLeftAction = swipe.swipeOffset < -50;
  const showRightAction = swipe.swipeOffset > 50;

  return (
    <div className="relative overflow-hidden touch-pan-y">
      {/* Left Action (스와이프 우측으로 갔을 때 왼쪽에 나타남) */}
      {rightAction && (
        <div
          className={`absolute left-0 top-0 bottom-0 flex items-center justify-center transition-all ${
            rightAction.color
          } ${showRightAction ? 'w-24' : 'w-0'}`}
        >
          {showRightAction && (
            <div className="flex flex-col items-center text-white px-4">
              {rightAction.icon}
              <span className="text-xs mt-1 font-medium">{rightAction.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Right Action (스와이프 좌측으로 갔을 때 오른쪽에 나타남) */}
      {leftAction && (
        <div
          className={`absolute right-0 top-0 bottom-0 flex items-center justify-center transition-all ${
            leftAction.color
          } ${showLeftAction ? 'w-24' : 'w-0'}`}
        >
          {showLeftAction && (
            <div className="flex flex-col items-center text-white px-4">
              {leftAction.icon}
              <span className="text-xs mt-1 font-medium">{leftAction.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div
        className={`relative transition-transform ${
          swipe.isSwiping ? 'transition-none' : 'duration-300'
        }`}
        style={{
          transform: `translateX(${swipe.swipeOffset}px)`,
        }}
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
        onMouseDown={swipe.onMouseDown}
        onMouseMove={swipe.onMouseMove}
        onMouseUp={swipe.onMouseUp}
        onMouseLeave={swipe.onMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
