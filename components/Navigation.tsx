'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCrawlEvents } from '@/hooks/useCrawlEvents';
import { GlobalSearch } from '@/components/GlobalSearch';

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // SSE 기반 실시간 크롤링 상태 모니터링
  const crawlingStatus = useCrawlEvents();

  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) {
      return `${secs}초`;
    }
    return `${minutes}분 ${secs}초`;
  };

  // ESC 키로 모바일 메뉴 및 검색 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen, isSearchOpen]);

  // Cmd/Ctrl+K로 검색 열기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 모바일 메뉴 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // 경로 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/home', label: '홈', icon: '🏠' },
    { href: '/complexes', label: '단지 목록', icon: '🏘️' },
    { href: '/analytics', label: '데이터 분석', icon: '📊' },
    { href: '/community', label: '커뮤니티', icon: '💬' },
    { href: '/system', label: '시스템', icon: '⚙️' },
  ];

  // 현재 페이지에 해당하는 링크는 표시하지 않음
  const filteredNavLinks = navLinks.filter(link => {
    // 홈 페이지
    if (link.href === '/' && pathname === '/') return false;
    // 다른 페이지들
    if (link.href !== '/' && pathname?.startsWith(link.href)) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800"
      role="navigation"
      aria-label="주 네비게이션"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/home"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
            aria-label="부동산 인사이트 홈으로 이동"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
              🏠
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                부동산 인사이트
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                스마트한 부동산 정보수집 관리시스템
              </p>
            </div>
          </Link>

          {/* Search Button */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm">검색...</span>
              <kbd className="ml-auto hidden lg:inline-block px-2 py-1 text-xs font-semibold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {filteredNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isActive(link.href)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                }`}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.icon} {link.label}
              </Link>
            ))}

            {/* Auth Buttons */}
            {status === 'loading' ? (
              <div className="px-4 py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              </div>
            ) : session ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  👤 {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="검색"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg
                className="w-6 h-6 text-gray-700 dark:text-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg md:hidden z-50"
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            {/* Mobile Menu Links */}
            <nav className="space-y-1 mb-3" aria-label="모바일 네비게이션">
              {filteredNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
              {status === 'loading' ? (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                </div>
              ) : session ? (
                <>
                  <div className="px-3 py-2 text-gray-700 dark:text-gray-300 text-sm">
                    👤 {session.user?.name}
                    {(session.user as any).role === 'ADMIN' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded">
                        관리자
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors text-sm"
                  >
                    <span className="text-lg">🚪</span>
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm"
                  >
                    <span>🔐</span>
                    <span>로그인</span>
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm"
                  >
                    <span>📝</span>
                    <span>회원가입</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 크롤링 상태 인디케이터 (모든 페이지에 표시) */}
      {crawlingStatus.isActive && (
        <div className="absolute left-0 right-0 top-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 shadow-md z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center gap-3 text-white text-sm">
              <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-semibold">
                {crawlingStatus.scheduleName
                  ? `스케줄 "${crawlingStatus.scheduleName}" 실행 중`
                  : '크롤링 진행 중'
                }
              </span>
              {crawlingStatus.startTime && (
                <span className="text-blue-100">
                  • {formatElapsedTime(crawlingStatus.elapsedSeconds)} 경과
                </span>
              )}
              {crawlingStatus.totalComplexes && (
                <span className="text-blue-100 hidden sm:inline">
                  • {crawlingStatus.totalComplexes}개 단지
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <GlobalSearch
              onClose={() => setIsSearchOpen(false)}
              autoFocus={true}
            />
          </div>
        </div>
      )}
    </nav>
  );
};
