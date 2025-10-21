import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

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

/**
 * 현재 로그인한 사용자 정보를 가져옵니다.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions) as ExtendedSession | null;
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isApproved: true,
      isActive: true,
    },
  });

  return user;
}

/**
 * 사용자 role에 따라 접근 가능한 userId 목록을 반환합니다.
 *
 * - ADMIN: 모든 사용자 데이터 접근 가능 (관리 목적)
 * - FAMILY: 본인 데이터만 접근 가능 (완전 독립 운영)
 * - GUEST: 본인 데이터만 접근 가능
 */
export async function getAccessibleUserIds(currentUserId: string, currentUserRole: string): Promise<string[]> {
  if (currentUserRole === 'ADMIN') {
    // ADMIN은 모든 사용자의 데이터에 접근 가능
    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });
    return allUsers.map((u) => u.id);
  }

  // FAMILY와 GUEST 모두 본인 데이터만 접근 (완전 독립 정책)
  return [currentUserId];
}

/**
 * Complex 조회를 위한 where 조건을 생성합니다.
 */
export async function getComplexWhereCondition(currentUser: { id: string; role: string }) {
  const accessibleUserIds = await getAccessibleUserIds(currentUser.id, currentUser.role);

  return {
    userId: {
      in: accessibleUserIds,
    },
  };
}

/**
 * 사용자가 로그인했는지, 승인되었는지, 활성화되었는지 확인합니다.
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  if (!user.isApproved) {
    throw new Error('승인 대기 중인 계정입니다.');
  }

  if (!user.isActive) {
    throw new Error('비활성화된 계정입니다.');
  }

  return user;
}

/**
 * 관리자 권한이 있는지 확인합니다.
 */
export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== 'ADMIN') {
    throw new Error('관리자 권한이 필요합니다.');
  }

  return user;
}
