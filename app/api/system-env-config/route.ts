/**
 * 시스템 환경 변수 조회 API (관리자 전용)
 *
 * GET: config.env 파싱 후 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// config.env 파일 경로
const CONFIG_ENV_PATH = join(process.cwd(), 'config.env');

// 시스템 환경 변수 정의 (카테고리 및 메타데이터)
const SYSTEM_ENV_DEFINITIONS = [
  // 보안 설정 (조회 불가)
  {
    category: 'security',
    key: 'NEXTAUTH_SECRET',
    displayName: 'NextAuth 인증 시크릿',
    description: 'NextAuth.js 세션 암호화에 사용되는 비밀키',
    isSecret: true,
    canView: false,
  },
  {
    category: 'security',
    key: 'ENCRYPTION_KEY',
    displayName: '데이터 암호화 키',
    description: '사용자 데이터 암호화에 사용되는 키',
    isSecret: true,
    canView: false,
  },
  {
    category: 'security',
    key: 'INTERNAL_API_SECRET',
    displayName: '내부 API 시크릿',
    description: '스케줄러 등 내부 API 호출 인증에 사용',
    isSecret: true,
    canView: false,
  },

  // 인프라 설정 (조회 가능)
  {
    category: 'infrastructure',
    key: 'DATABASE_URL',
    displayName: '데이터베이스 URL',
    description: 'PostgreSQL 데이터베이스 연결 주소',
    isSecret: true,
    canView: true,
  },
  {
    category: 'infrastructure',
    key: 'REDIS_URL',
    displayName: 'Redis URL',
    description: 'Redis 캐시 서버 연결 주소',
    isSecret: false,
    canView: true,
  },

  // 공공 API 키 (조회 가능)
  {
    category: 'api',
    key: 'PUBLIC_DATA_SERVICE_KEY',
    displayName: '공공데이터 API 키',
    description: '공공데이터포털 실거래가 API 인증 키',
    isSecret: true,
    canView: true,
    editGuide: `
## SSH 편집 방법

1. NAS SSH 접속
\`\`\`bash
ssh root@192.168.x.x
\`\`\`

2. 디렉토리 이동
\`\`\`bash
cd /volume1/code_work/nas_naver_crawler
\`\`\`

3. 파일 편집
\`\`\`bash
vi config.env
\`\`\`

4. 해당 줄 수정
\`\`\`
PUBLIC_DATA_SERVICE_KEY=새로운API키
\`\`\`

5. 저장 후 종료 (\`:wq\`)

6. 컨테이너 재시작
\`\`\`bash
docker-compose -f docker-compose.dev.yml restart web
\`\`\`

## API 키 발급 방법

1. [공공데이터포털](https://www.data.go.kr/) 접속
2. 회원가입 및 로그인
3. "아파트매매 실거래 상세 자료" 검색
4. 활용신청 → 일반 인증키(Encoding) 발급
5. 발급받은 키를 위 방법으로 입력
    `,
  },
  {
    category: 'api',
    key: 'SGIS_SERVICE_ID',
    displayName: '통계청 SGIS 서비스 ID',
    description: '역지오코딩용 통계청 API 서비스 ID',
    isSecret: false,
    canView: true,
  },
  {
    category: 'api',
    key: 'SGIS_SECURITY_KEY',
    displayName: '통계청 SGIS 보안 키',
    description: '역지오코딩용 통계청 API 보안 키',
    isSecret: true,
    canView: true,
  },

  // 크롤러 설정 (조회 가능)
  {
    category: 'crawler',
    key: 'OUTPUT_DIR',
    displayName: '출력 디렉토리',
    description: '크롤링 데이터 저장 경로',
    isSecret: false,
    canView: true,
  },
  {
    category: 'crawler',
    key: 'REQUEST_DELAY',
    displayName: '요청 간격 (초)',
    description: '크롤링 요청 사이의 대기 시간',
    isSecret: false,
    canView: true,
  },
  {
    category: 'crawler',
    key: 'TIMEOUT',
    displayName: '페이지 타임아웃 (ms)',
    description: '페이지 로딩 최대 대기 시간',
    isSecret: false,
    canView: true,
  },
  {
    category: 'crawler',
    key: 'HEADLESS',
    displayName: '헤드리스 모드',
    description: '브라우저 화면 표시 여부 (true: 숨김)',
    isSecret: false,
    canView: true,
  },
  {
    category: 'crawler',
    key: 'MAX_RETRIES',
    displayName: '최대 재시도 횟수',
    description: '페이지 로딩 실패 시 재시도 횟수',
    isSecret: false,
    canView: true,
  },
  {
    category: 'crawler',
    key: 'LOG_LEVEL',
    displayName: '로그 레벨',
    description: '로그 출력 수준 (DEBUG, INFO, WARNING, ERROR)',
    isSecret: false,
    canView: true,
  },
];

/**
 * config.env 파일 파싱
 */
function parseConfigEnv(): Record<string, string> {
  try {
    const content = readFileSync(CONFIG_ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};

    content.split('\n').forEach(line => {
      // 주석 및 빈 줄 무시
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      // KEY=VALUE 형식 파싱
      const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        result[key] = value;
      }
    });

    return result;
  } catch (error) {
    console.error('[parseConfigEnv] Failed to read config.env:', error);
    return {};
  }
}

/**
 * GET /api/system-env-config
 * 시스템 환경 변수 조회 (관리자 전용)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 관리자 권한 확인
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // config.env 파싱
    const envValues = parseConfigEnv();

    // process.env와 병합 (우선순위: process.env > config.env)
    const mergedEnv: Record<string, string> = { ...envValues };
    SYSTEM_ENV_DEFINITIONS.forEach(def => {
      const processValue = process.env[def.key];
      if (processValue) {
        mergedEnv[def.key] = processValue;
      }
    });

    // 정의된 환경 변수만 필터링
    let configs = SYSTEM_ENV_DEFINITIONS.filter(def => {
      if (category && def.category !== category) {
        return false;
      }
      return true;
    }).map(def => {
      const value = mergedEnv[def.key] || '';

      return {
        key: def.key,
        value: def.canView ? value : '********',
        displayName: def.displayName,
        description: def.description,
        category: def.category,
        isSecret: def.isSecret,
        canView: def.canView,
        editGuide: def.editGuide || generateDefaultEditGuide(def.key),
      };
    });

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    console.error('[GET /api/system-env-config] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '시스템 환경 변수 조회 실패',
      },
      { status: 500 }
    );
  }
}

/**
 * 기본 편집 가이드 생성
 */
function generateDefaultEditGuide(key: string): string {
  return `
## SSH 편집 방법

1. NAS SSH 접속
\`\`\`bash
ssh root@nas-ip
\`\`\`

2. 디렉토리 이동
\`\`\`bash
cd /volume1/code_work/nas_naver_crawler
\`\`\`

3. 파일 편집
\`\`\`bash
vi config.env
\`\`\`

4. 해당 줄 수정
\`\`\`
${key}=새로운값
\`\`\`

5. 저장 후 종료 (\`:wq\`)

6. 컨테이너 재시작
\`\`\`bash
docker-compose -f docker-compose.dev.yml restart web
\`\`\`
  `;
}
