'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

// Extended Session type helper
type ExtendedSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
    image?: string | null;
  };
};

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const extendedSession = session as ExtendedSession | null;
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // 로딩 중에는 아무것도 안함

    // status와 session 둘 다 체크
    if (status === 'unauthenticated' || (!session && status === 'authenticated')) {
      console.log('🔒 AuthGuard: No session, redirecting to /');
      // 인증되지 않은 경우 랜딩페이지로 리다이렉트
      router.replace('/');
      return;
    }

    // 관리자 권한 체크
    if (requireAdmin && extendedSession?.user?.role !== 'ADMIN') {
      console.log('🔒 AuthGuard: Admin required, redirecting to /dashboard');
      router.replace('/dashboard');
    }
  }, [status, session, router, requireAdmin, extendedSession]);

  // 로딩 중이거나 세션이 없으면 로딩 표시
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 세션이 없으면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!session) {
    console.log('🔒 AuthGuard: Blocking render, no session');
    return null;
  }

  // 관리자 권한이 필요한데 관리자가 아니면 렌더링하지 않음
  if (requireAdmin && extendedSession?.user?.role !== 'ADMIN') {
    console.log('🔒 AuthGuard: Blocking render, not admin');
    return null;
  }

  console.log('✅ AuthGuard: Session valid, rendering children');
  return <>{children}</>;
}
