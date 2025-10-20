/**
 * Next-Auth 타입 확장
 * 타입 안전성을 위한 역할(role) 리터럴 타입 정의
 */

import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Session 타입 확장
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'ADMIN' | 'FAMILY' | 'GUEST';
    } & DefaultSession['user'];
  }

  /**
   * User 타입 확장
   */
  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT 타입 확장
   */
  interface JWT extends DefaultJWT {
    id: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
  }
}
