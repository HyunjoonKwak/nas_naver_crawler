import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('존재하지 않는 사용자입니다.');
        }

        if (!user.isActive) {
          throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
        }

        if (!user.isApproved) {
          throw new Error('승인 대기 중인 계정입니다. 관리자의 승인을 기다려주세요.');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }

        // 마지막 로그인 시간 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7일 (세션 만료)
    updateAge: 24 * 60 * 60, // 24시간마다 세션 갱신
  },
  // cookies 커스터마이징 제거 - NextAuth 기본값 사용
  // 테스트/프로덕션 분리는 NEXTAUTH_SECRET과 NEXTAUTH_URL로만 처리
  secret: process.env.NEXTAUTH_SECRET,
  // JWT 토큰 설정
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  // 디버그 모드 (개발 환경에서만)
  debug: process.env.NODE_ENV === 'development' && process.env.DEBUG_ENABLED === 'true',
  // 로그 활성화 (에러만)
  logger: {
    error(code: any, metadata: any) {
      // JWT 세션 복호화 실패는 쿠키 만료 시 정상적으로 발생할 수 있음 (경고 수준으로 낮춤)
      if (code?.name === 'JWT_SESSION_ERROR' || code?.code === 'ERR_JWE_DECRYPTION_FAILED') {
        // 무시 또는 경고만 출력
        return;
      }
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code: any) {
      // NEXTAUTH_URL, DEBUG_ENABLED 경고 무시
      if (code === 'NEXTAUTH_URL' || code === 'DEBUG_ENABLED') {
        return;
      }
      console.warn('[NextAuth Warn]', code);
    },
    debug(code: any, metadata: any) {
      console.log('[NextAuth Debug]', code, metadata);
    },
  },
};
