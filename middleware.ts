import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 인증된 사용자는 모든 페이지 접근 가능
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // 공개 페이지: 랜딩페이지, 로그인, 회원가입
        const publicPaths = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/api/auth',
        ];

        // 공개 페이지는 인증 없이 접근 가능
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true;
        }

        // 나머지 페이지는 인증 필요
        return !!token;
      },
    },
    pages: {
      signIn: '/', // 인증 실패 시 랜딩페이지로 리다이렉트
    },
  }
);

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
