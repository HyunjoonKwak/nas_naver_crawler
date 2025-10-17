import { useRef, useState, TouchEvent, MouseEvent } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // 스와이프로 인식할 최소 거리 (px)
}

interface SwipeResult {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  swipeOffset: number;
  isSwiping: boolean;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
}: SwipeHandlers): SwipeResult {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isMouseDown = useRef(false);

  const minSwipeDistance = threshold;

  const onTouchStartHandler = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const onTouchMoveHandler = (e: TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;

    // 최대 스와이프 거리 제한 (200px)
    const limitedDiff = Math.max(-200, Math.min(200, diff));
    setSwipeOffset(limitedDiff);
    setTouchEnd(currentTouch);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    // 리셋
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  // 마우스 이벤트 (데스크톱 테스트용)
  const onMouseDownHandler = (e: MouseEvent) => {
    isMouseDown.current = true;
    setTouchStart(e.clientX);
    setIsSwiping(true);
  };

  const onMouseMoveHandler = (e: MouseEvent) => {
    if (!isMouseDown.current || touchStart === null) return;
    const currentX = e.clientX;
    const diff = currentX - touchStart;
    const limitedDiff = Math.max(-200, Math.min(200, diff));
    setSwipeOffset(limitedDiff);
    setTouchEnd(currentX);
  };

  const onMouseUpHandler = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;

    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setTouchStart(null);
    setTouchEnd(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const onMouseLeaveHandler = () => {
    if (isMouseDown.current) {
      isMouseDown.current = false;
      setTouchStart(null);
      setTouchEnd(null);
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  };

  return {
    onTouchStart: onTouchStartHandler,
    onTouchMove: onTouchMoveHandler,
    onTouchEnd: onTouchEndHandler,
    onMouseDown: onMouseDownHandler,
    onMouseMove: onMouseMoveHandler,
    onMouseUp: onMouseUpHandler,
    onMouseLeave: onMouseLeaveHandler,
    swipeOffset,
    isSwiping,
  };
}
