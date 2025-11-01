import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/health/route';

// Prisma 모킹
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]),
  },
}));

// Redis 모킹 (선택적)
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health status', async () => {
    const response = await GET();
    const data = await response.json();

    // Test 환경에서는 Redis가 없으므로 degraded 상태 (503)
    expect([200, 503]).toContain(response.status);
    expect(['healthy', 'degraded']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('checks');
  });

  it('should include database check', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.checks).toHaveProperty('database');
    expect(data.checks.database.status).toBe('ok');
  });

  it('should include uptime', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.checks).toHaveProperty('uptime');
    expect(typeof data.checks.uptime).toBe('number');
    expect(data.checks.uptime).toBeGreaterThan(0);
  });

  it('should include responseTime', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty('responseTime');
    expect(typeof data.responseTime).toBe('number');
    expect(data.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('should set no-cache headers', async () => {
    const response = await GET();
    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('must-revalidate');
  });

  it('should return 503 on database failure', async () => {
    // Prisma 에러 모킹
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.checks.database.status).toBe('error');
  });
});

