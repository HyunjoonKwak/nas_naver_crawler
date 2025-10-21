/**
 * Next-Auth 타입 확장
 * 타입 안전성을 위한 역할(role) 리터럴 타입 정의
 */

declare module 'next-auth' {
  /**
   * Session 타입 확장
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'ADMIN' | 'FAMILY' | 'GUEST';
      image?: string | null;
    };
  }

  /**
   * User 타입 확장
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT 타입 확장
   */
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
  }
}
