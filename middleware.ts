import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 페이지: 랜딩페이지(로그인 포함), 회원가입, API 라우트
  const publicPaths = [
    '/',
    '/auth/signup',
  ];

  // API 라우트는 항상 허용
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 공개 페이지는 인증 없이 접근 가능
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // JWT 토큰 확인
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 인증되지 않은 경우 랜딩페이지로 리다이렉트
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // 인증된 사용자는 모든 페이지 접근 가능
  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
