# Swipe Gesture 사용 가이드

## 개요

모바일 UX 개선을 위한 스와이프 제스처 기능이 구현되었습니다.

## 구성 요소

### 1. `useSwipe` Hook (`/hooks/useSwipe.ts`)

터치 및 마우스 이벤트를 처리하여 스와이프 제스처를 감지합니다.

**Features:**
- 터치 이벤트 지원 (모바일)
- 마우스 이벤트 지원 (데스크톱 테스트용)
- 스와이프 거리 추적
- 좌우 스와이프 감지

**사용법:**
```typescript
import { useSwipe } from '@/hooks/useSwipe';

const swipe = useSwipe({
  onSwipeLeft: () => console.log('왼쪽 스와이프'),
  onSwipeRight: () => console.log('오른쪽 스와이프'),
  threshold: 100, // 최소 스와이프 거리 (px)
});

// 컴포넌트에 적용
<div
  onTouchStart={swipe.onTouchStart}
  onTouchMove={swipe.onTouchMove}
  onTouchEnd={swipe.onTouchEnd}
  style={{ transform: `translateX(${swipe.swipeOffset}px)` }}
>
  콘텐츠
</div>
```

### 2. `SwipeableCard` Component (`/components/SwipeableCard.tsx`)

스와이프 가능한 카드 래퍼 컴포넌트입니다.

**Features:**
- 좌우 액션 버튼 표시
- 시각적 피드백
- 터치/마우스 이벤트 자동 처리

**사용법:**
```typescript
import { SwipeableCard } from '@/components/SwipeableCard';

<SwipeableCard
  onSwipeLeft={() => handleDelete(item.id)}
  onSwipeRight={() => handleFavorite(item.id)}
  leftAction={{
    icon: <TrashIcon />,
    label: "삭제",
    color: "bg-red-500"
  }}
  rightAction={{
    icon: <StarIcon />,
    label: "즐겨찾기",
    color: "bg-yellow-500"
  }}
  threshold={100}
>
  <YourCardContent />
</SwipeableCard>
```

## 적용 예시

### 단지 카드에 적용

```tsx
// app/complexes/page.tsx
import { SwipeableCard } from '@/components/SwipeableCard';

<SwipeableCard
  onSwipeLeft={() => handleDeleteComplex(complex.complexNo)}
  onSwipeRight={() => handleToggleFavorite(complex.complexNo, complex.isFavorite)}
  leftAction={{
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    label: "삭제",
    color: "bg-red-500"
  }}
  rightAction={{
    icon: complex.isFavorite ? (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ) : (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    label: complex.isFavorite ? "관심취소" : "관심등록",
    color: "bg-yellow-500"
  }}
>
  {/* 기존 카드 내용 */}
  <div className="bg-white dark:bg-gray-800 rounded-xl ...">
    ...
  </div>
</SwipeableCard>
```

### 즐겨찾기 카드에 적용 (주의사항)

`SortableFavoriteCard`는 드래그 앤 드롭 기능이 있어 스와이프와 충돌할 수 있습니다.

**해결 방법:**
1. 모바일에서만 스와이프, 데스크톱에서만 드래그
2. 별도의 모바일 전용 카드 컴포넌트 생성

```tsx
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

{isMobile ? (
  <SwipeableCard {...swipeProps}>
    <FavoriteCardContent />
  </SwipeableCard>
) : (
  <SortableFavoriteCard {...sortableProps} />
)}
```

## 스타일링 팁

### 스와이프 중 스크롤 방지

```css
.swipeable-container {
  touch-action: pan-y; /* 세로 스크롤만 허용 */
  -webkit-overflow-scrolling: touch;
}
```

### 부드러운 애니메이션

```tsx
<div
  className={`transition-transform ${
    swipe.isSwiping ? 'duration-0' : 'duration-300'
  }`}
  style={{ transform: `translateX(${swipe.swipeOffset}px)` }}
>
```

## 접근성 고려사항

1. **대체 버튼 제공**: 스와이프를 사용할 수 없는 사용자를 위한 버튼 제공
2. **시각적 피드백**: 스와이프 진행 상태를 명확하게 표시
3. **취소 기능**: 실수로 스와이프한 경우 되돌리기 기능

## 성능 최적화

1. **`touchmove` 이벤트 스로틀링**: 과도한 리렌더링 방지
2. **`will-change` 속성 사용**:
```css
.swipeable {
  will-change: transform;
}
```

3. **GPU 가속 활용**:
```css
.swipeable {
  transform: translate3d(0, 0, 0);
}
```

## 브라우저 호환성

- ✅ iOS Safari 12+
- ✅ Chrome Mobile 80+
- ✅ Samsung Internet 12+
- ✅ Firefox Mobile 80+

## 향후 개선사항

1. 햅틱 피드백 추가 (Vibration API)
2. 스와이프 진행률에 따른 저항력 조정
3. 다중 방향 스와이프 (상하좌우)
4. 스와이프 히스토리 되돌리기
