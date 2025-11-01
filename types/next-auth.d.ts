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

  /**
   * NextAuthOptions 타입
   */
  export interface NextAuthOptions {
    providers: any[];
    callbacks?: any;
    pages?: any;
    session?: any;
    secret?: string;
    jwt?: any;
  }

  /**
   * getServerSession 함수
   */
  export function getServerSession(...args: any[]): Promise<Session | null>;

  /**
   * NextAuth default export
   */
  export default function NextAuth(options: NextAuthOptions): any;
}

/**
 * next-auth/next 모듈에도 동일한 타입 확장 적용
 */
declare module 'next-auth/next' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'ADMIN' | 'FAMILY' | 'GUEST';
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'FAMILY' | 'GUEST';
    image?: string | null;
  }

  export function getServerSession(...args: any[]): Promise<Session | null>;
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
