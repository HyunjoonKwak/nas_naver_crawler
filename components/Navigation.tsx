'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCrawlEvents } from '@/hooks/useCrawlEvents';
import {
  Home,
  Building2,
  BarChart3,
  MessageSquare,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus,
  User,
  Loader2,
  Clock,
  Key,
  TrendingUp,
  ChevronDown,
  Cog
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [openDesktopDropdown, setOpenDesktopDropdown] = useState<string | null>(null);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data: session, status} = useSession();

  // SSE 기반 실시간 크롤링 상태 모니터링 (토스트 알림 활성화)
  const crawlingStatus = useCrawlEvents(undefined, true);

  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) {
      return `${secs}초`;
    }
    return `${minutes}분 ${secs}초`;
  };

  // 테마 초기화
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    changeTheme(nextTheme);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordSuccess(data.message);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordChange(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.error);
      }
    } catch (error: any) {
      setPasswordError('서버 오류가 발생했습니다.');
    }
  };

  // ESC 키로 메뉴/알림/프로필 모달/드롭다운 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (isNotificationOpen) setIsNotificationOpen(false);
        if (isProfileModalOpen) {
          setIsProfileModalOpen(false);
          setShowPasswordChange(false);
        }
        if (openDesktopDropdown) setOpenDesktopDropdown(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isNotificationOpen && !target.closest('.notification-dropdown')) {
        setIsNotificationOpen(false);
      }
      if (isProfileModalOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(target)) {
        setIsProfileModalOpen(false);
        setShowPasswordChange(false);
      }
      if (openDesktopDropdown && settingsDropdownRef.current && !settingsDropdownRef.current.contains(target)) {
        setOpenDesktopDropdown(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isNotificationOpen, isProfileModalOpen, openDesktopDropdown]);

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

  // 경로 변경 시 모바일 메뉴 및 드롭다운 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
    setOpenDesktopDropdown(null);
    setOpenMobileDropdown(null);
  }, [pathname]);

  // 알림 가져오기
  useEffect(() => {
    if (session) {
      fetchNotifications();
      // 30초마다 알림 갱신
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=5&unreadOnly=true');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error: any) {
      // 알림 조회 실패는 조용히 처리 (UX 방해 방지)
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error: any) {
      // 읽음 표시 실패는 조용히 처리
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error: any) {
      // 전체 읽음 표시 실패는 조용히 처리
    }
  };

  const navLinks = [
    { href: '/home', label: '홈', icon: Home },
    { href: '/complexes', label: '단지 관리', icon: Building2 },
    { href: '/real-price', label: '실거래가', icon: TrendingUp },
    { href: '/analytics', label: '데이터 분석', icon: BarChart3 },
    { href: '/community', label: '커뮤니티', icon: MessageSquare },
    {
      label: '설정',
      icon: Settings,
      submenu: [
        { href: '/alerts', label: '매물 알림', icon: Bell },
        { href: '/scheduler', label: '스케줄러', icon: Clock },
        { href: '/settings/env-config', label: '환경 변수', icon: Key },
        { href: '/system', label: '시스템', icon: Cog },
      ]
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  const isSubmenuActive = (submenu: any[]) => {
    return submenu.some(item => isActive(item.href));
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
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg">
              <Home className="w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                부동산 인사이트
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation - All Links Visible */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
            {navLinks.map((link, index) => {
              const IconComponent = link.icon;

              // 드롭다운 메뉴인 경우
              if ('submenu' in link && link.submenu) {
                const isOpen = openDesktopDropdown === link.label;
                const hasActiveItem = isSubmenuActive(link.submenu);

                return (
                  <div key={link.label} className="relative" ref={link.label === '설정' ? settingsDropdownRef : undefined}>
                    <button
                      onClick={() => setOpenDesktopDropdown(isOpen ? null : link.label)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        hasActiveItem
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{link.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* 드롭다운 메뉴 */}
                    {isOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div className="py-2">
                          {link.submenu.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  isActive(subItem.href)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // 일반 링크인 경우
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Auth Section */}
            {status === 'loading' ? (
              <div className="px-3 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : session ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
                {/* Notification Bell */}
                <div className="relative notification-dropdown">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
                    aria-label="알림"
                  >
                    <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {isNotificationOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          알림
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            모두 읽음
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            새로운 알림이 없습니다
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                              onClick={() => {
                                handleMarkAsRead(notification.id);
                                if (notification.postId) {
                                  window.location.href = `/community/${notification.postId}`;
                                }
                              }}
                            >
                              <p className="text-sm text-gray-900 dark:text-white mb-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(notification.createdAt).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href="/notifications"
                          className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={() => setIsNotificationOpen(false)}
                        >
                          모든 알림 보기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setIsProfileModalOpen(!isProfileModalOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 font-medium transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="whitespace-nowrap">{session.user?.name}</span>
                    </button>

                    {/* 프로필 드롭다운 */}
                    {isProfileModalOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                      <div className="p-4">
                        {/* 사용자 정보 */}
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                            {session.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {session.user?.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {session.user?.email}
                            </div>
                          </div>
                        </div>

                        {/* 역할 및 테마 토글 */}
                        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">역할</span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                (session.user as any).role === 'ADMIN'
                                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                  : (session.user as any).role === 'FAMILY'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
                                {(session.user as any).role === 'ADMIN' ? '관리자' :
                                 (session.user as any).role === 'FAMILY' ? '가족' : '게스트'}
                              </span>
                            </div>

                            {/* 테마 토글 버튼 */}
                            <button
                              onClick={toggleTheme}
                              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title={`현재: ${theme === 'light' ? '라이트' : theme === 'dark' ? '다크' : '자동'} 모드`}
                            >
                              {theme === 'light' && (
                                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                              )}
                              {theme === 'dark' && (
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                              )}
                              {theme === 'system' && (
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 비밀번호 변경 */}
                        {!showPasswordChange ? (
                          <button
                            onClick={() => setShowPasswordChange(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                          >
                            <Key className="w-4 h-4" />
                            <span>비밀번호 변경</span>
                          </button>
                        ) : (
                          <form onSubmit={handlePasswordChange} className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                현재 비밀번호
                              </label>
                              <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                새 비밀번호
                              </label>
                              <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                새 비밀번호 확인
                              </label>
                              <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>

                            {passwordError && (
                              <div className="text-sm text-red-600 dark:text-red-400">
                                {passwordError}
                              </div>
                            )}

                            {passwordSuccess && (
                              <div className="text-sm text-green-600 dark:text-green-400">
                                {passwordSuccess}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                              >
                                변경
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPasswordChange(false);
                                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                  setPasswordError('');
                                  setPasswordSuccess('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-lg transition-colors font-medium"
                              >
                                취소
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  {/* 로그아웃 버튼 - 이름 옆에 배치 */}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    title="로그아웃"
                    aria-label="로그아웃"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <LogIn className="w-4 h-4" />
                  <span>로그인</span>
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>회원가입</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
              )}
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
              {navLinks.map((link) => {
                const IconComponent = link.icon;

                // 드롭다운 메뉴인 경우 (아코디언 스타일)
                if ('submenu' in link && link.submenu) {
                  const isOpen = openMobileDropdown === link.label;
                  const hasActiveItem = isSubmenuActive(link.submenu);

                  return (
                    <div key={link.label}>
                      <button
                        onClick={() => setOpenMobileDropdown(isOpen ? null : link.label)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                          hasActiveItem
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="w-5 h-5" />
                          <span>{link.label}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* 아코디언 서브메뉴 */}
                      {isOpen && (
                        <div className="mt-1 ml-4 space-y-1">
                          {link.submenu.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                                  isActive(subItem.href)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // 일반 링크인 경우
                return (
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
                    <IconComponent className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
              {status === 'loading' ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              ) : session ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-300 text-sm">
                    <User className="w-4 h-4" />
                    <span>{session.user?.name}</span>
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
                    <LogOut className="w-5 h-5" />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>로그인</span>
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
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
        <div className="absolute left-0 right-0 top-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 shadow-md z-40">
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

    </nav>
  );
};
