import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';

// 환경 변수 모킹
beforeAll(() => {
  (process.env as any).DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  (process.env as any).NEXTAUTH_SECRET = 'test-secret-key-at-least-32-chars-long';
  (process.env as any).NEXTAUTH_URL = 'http://localhost:3000';
  (process.env as any).INTERNAL_API_SECRET = 'test-internal-secret-at-least-32-chars';
  (process.env as any).NODE_ENV = 'test';
});

// 각 테스트 후 정리
afterEach(() => {
  // Mock 초기화는 각 테스트 파일에서 수동으로 처리
});

afterAll(() => {
  // 최종 정리
});

