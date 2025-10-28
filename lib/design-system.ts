/**
 * Design System - 일관된 UI/UX를 위한 중앙화된 디자인 상수
 *
 * 이 파일은 프로젝트 전체에서 사용되는 색상, 간격, 그림자 등의 디자인 토큰을 정의합니다.
 * Tailwind CSS 클래스명을 직접 사용하므로 빌드 시 자동으로 포함됩니다.
 */

// ============================================================================
// 색상 시스템 (Color System)
// ============================================================================

export const Colors = {
  // 주요 브랜드 색상 (Primary Brand Colors)
  primary: {
    gradient: 'from-blue-600 to-blue-700',
    gradientDark: 'dark:from-blue-700 dark:to-blue-800',
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    bgDark: 'dark:bg-blue-700',
    text: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    border: 'border-blue-600',
    borderDark: 'dark:border-blue-700',
  },

  // 보조 색상 (Secondary Colors)
  secondary: {
    gradient: 'from-gray-600 to-gray-700',
    gradientDark: 'dark:from-gray-700 dark:to-gray-800',
    bg: 'bg-gray-600',
    bgHover: 'hover:bg-gray-700',
    text: 'text-gray-600',
    textDark: 'dark:text-gray-400',
  },

  // 성공 색상 (Success Colors)
  success: {
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-700',
    text: 'text-green-600',
    textDark: 'dark:text-green-400',
    border: 'border-green-600',
  },

  // 경고 색상 (Warning Colors)
  warning: {
    bg: 'bg-yellow-600',
    bgHover: 'hover:bg-yellow-700',
    text: 'text-yellow-600',
    textDark: 'dark:text-yellow-400',
    border: 'border-yellow-600',
  },

  // 위험/삭제 색상 (Danger Colors)
  danger: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    text: 'text-red-600',
    textDark: 'dark:text-red-400',
    border: 'border-red-600',
  },

  // 정보 색상 (Info Colors)
  info: {
    bg: 'bg-cyan-600',
    bgHover: 'hover:bg-cyan-700',
    text: 'text-cyan-600',
    textDark: 'dark:text-cyan-400',
    border: 'border-cyan-600',
  },
} as const;

// ============================================================================
// 간격 시스템 (Spacing System)
// ============================================================================

export const Spacing = {
  // 페이지 여백 (Page Padding)
  page: {
    x: 'px-4 sm:px-6 lg:px-8',
    y: 'py-4 sm:py-6 lg:py-8',
    all: 'p-4 sm:p-6 lg:p-8',
  },

  // 카드/컨테이너 여백 (Card/Container Padding)
  card: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },

  // 섹션 간격 (Section Spacing)
  section: {
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
    xl: 'space-y-12',
  },

  // 요소 간격 (Element Spacing)
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
} as const;

// ============================================================================
// 타이포그래피 (Typography)
// ============================================================================

export const Typography = {
  // 헤딩 (Headings)
  heading: {
    h1: 'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl md:text-2xl font-bold text-gray-900 dark:text-white',
    h4: 'text-lg md:text-xl font-semibold text-gray-900 dark:text-white',
    h5: 'text-base md:text-lg font-semibold text-gray-900 dark:text-white',
  },

  // 본문 (Body Text)
  body: {
    lg: 'text-lg text-gray-700 dark:text-gray-300',
    md: 'text-base text-gray-700 dark:text-gray-300',
    sm: 'text-sm text-gray-600 dark:text-gray-400',
    xs: 'text-xs text-gray-500 dark:text-gray-500',
  },

  // 라벨 (Labels)
  label: {
    default: 'text-sm font-medium text-gray-700 dark:text-gray-300',
    required: 'text-sm font-medium text-gray-700 dark:text-gray-300 after:content-["*"] after:ml-0.5 after:text-red-500',
  },
} as const;

// ============================================================================
// 버튼 스타일 (Button Styles)
// ============================================================================

export const Button = {
  // 크기 (Sizes)
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  },

  // 변형 (Variants)
  variant: {
    primary: `${Colors.primary.bg} ${Colors.primary.bgHover} text-white`,
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
    danger: `${Colors.danger.bg} ${Colors.danger.bgHover} text-white`,
    success: `${Colors.success.bg} ${Colors.success.bgHover} text-white`,
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
  },

  // 기본 클래스 (Base Classes)
  base: 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
} as const;

// ============================================================================
// 카드/컨테이너 스타일 (Card/Container Styles)
// ============================================================================

export const Card = {
  // 기본 카드 (Base Card)
  base: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',

  // 호버 효과가 있는 카드 (Hover Card)
  hover: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow',

  // 그라데이션 헤더가 있는 카드 (Gradient Header Card)
  withGradientHeader: 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden',
} as const;

// ============================================================================
// 입력 필드 스타일 (Input Field Styles)
// ============================================================================

export const Input = {
  // 기본 입력 필드 (Base Input)
  base: 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',

  // 에러 상태 (Error State)
  error: 'w-full px-4 py-2 border-2 border-red-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500',

  // 성공 상태 (Success State)
  success: 'w-full px-4 py-2 border-2 border-green-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500',
} as const;

// ============================================================================
// 배지 스타일 (Badge Styles)
// ============================================================================

export const Badge = {
  // 기본 배지 (Base Badge)
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',

  // 색상 변형 (Color Variants)
  variant: {
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
} as const;

// ============================================================================
// 그림자 (Shadows)
// ============================================================================

export const Shadow = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  none: 'shadow-none',
} as const;

// ============================================================================
// 애니메이션 (Animations)
// ============================================================================

export const Animation = {
  // 전환 효과 (Transitions)
  transition: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },

  // 스핀 (Spin)
  spin: 'animate-spin',

  // 펄스 (Pulse)
  pulse: 'animate-pulse',

  // 바운스 (Bounce)
  bounce: 'animate-bounce',
} as const;

// ============================================================================
// 페이지 배경 (Page Background)
// ============================================================================

export const PageBackground = {
  default: 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
  solid: 'min-h-screen bg-gray-50 dark:bg-gray-900',
  white: 'min-h-screen bg-white dark:bg-gray-950',
} as const;

// ============================================================================
// 유틸리티 함수 (Utility Functions)
// ============================================================================

/**
 * 클래스명들을 조합하는 헬퍼 함수
 * @param classes - 조합할 클래스명 배열
 * @returns 조합된 클래스명 문자열
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 버튼 클래스를 생성하는 헬퍼 함수
 * @param variant - 버튼 변형
 * @param size - 버튼 크기
 * @returns 완전한 버튼 클래스명
 */
export function getButtonClass(
  variant: keyof typeof Button.variant = 'primary',
  size: keyof typeof Button.size = 'md'
): string {
  return cn(Button.base, Button.variant[variant], Button.size[size]);
}

/**
 * 배지 클래스를 생성하는 헬퍼 함수
 * @param variant - 배지 변형
 * @returns 완전한 배지 클래스명
 */
export function getBadgeClass(
  variant: keyof typeof Badge.variant = 'primary'
): string {
  return cn(Badge.base, Badge.variant[variant]);
}
