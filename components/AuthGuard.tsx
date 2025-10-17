'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // 로딩 중에는 아무것도 안함

    // status와 session 둘 다 체크
    if (status === 'unauthenticated' || (!session && status === 'authenticated')) {
      console.log('🔒 AuthGuard: No session, redirecting to /');
      // 인증되지 않은 경우 랜딩페이지로 리다이렉트
      router.replace('/');
    }
  }, [status, session, router]);

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

  console.log('✅ AuthGuard: Session valid, rendering children');
  return <>{children}</>;
}
