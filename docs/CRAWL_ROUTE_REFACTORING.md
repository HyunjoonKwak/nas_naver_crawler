# app/api/crawl/route.ts 리팩토링 계획

> 이 문서는 1,110줄의 대형 API 라우트를 점진적으로 리팩토링하기 위한 계획입니다.

## 현황

**파일 크기**: 1,110줄
**주요 함수**:
- `executeCrawlInBackground`: 207줄 - 백그라운드 크롤링 실행
- `saveCrawlResultsToDB`: 329줄 - DB 저장 로직
- `sendAlertsForChanges`: 154줄 - 알림 발송
- `POST` handler: 292줄 - 메인 API 핸들러
- `sendScheduleCrawlCompleteNotification`: 85줄 - 완료 알림
- `GET` handler: 7줄 - 상태 조회

**총 의존성**: 15개 외부 모듈

## 리팩토링 전략

### Phase 1: 서비스 레이어 추출 (현재 진행 중) ✅

#### 1.1 Python 크롤러 실행 서비스
**파일**: `services/crawler-executor.ts`
**상태**: ✅ 완료
**책임**:
- Python 프로세스 spawn
- stdout/stderr 스트리밍
- 타임아웃 관리

**사용 예시**:
```typescript
import { executePythonCrawler } from '@/services/crawler-executor';

const result = await executePythonCrawler({
  crawlId: 'xxx',
  complexNos: '22065,22066',
  baseDir: process.cwd(),
  timeout: 600000,
});

if (!result.success) {
  throw new Error(result.error);
}
```

#### 1.2 타입 정의
**파일**: `services/types.ts`
**상태**: ✅ 완료
**내용**:
- `CrawlDbResult` - DB 저장 결과
- `CrawlExecutionOptions` - 크롤링 옵션
- `AlertSendResult` - 알림 결과
- `CrawlStatus` - 상태 enum
- `CrawlHistoryUpdate` - 히스토리 업데이트

### Phase 2: DB 저장 로직 리팩토링 (다음 단계)

**문제점**:
- `saveCrawlResultsToDB` 함수가 329줄로 너무 큼
- 파일 읽기, JSON 파싱, DB 저장, 역지오코딩 등 여러 책임

**분리 계획**:

#### 2.1 파일 읽기 유틸리티
**파일**: `services/crawl-file-reader.ts`
**함수**:
```typescript
// 최신 크롤링 결과 파일 찾기
export async function findLatestCrawlFile(
  crawledDataDir: string
): Promise<string | null>;

// 크롤링 데이터 읽기 및 파싱
export async function readCrawlData(
  filePath: string
): Promise<any[]>;
```

#### 2.2 단지 정보 처리
**파일**: `services/complex-processor.ts`
**함수**:
```typescript
// 크롤링 데이터를 단지 upsert 데이터로 변환
export function prepareComplexUpsertData(
  crawlData: any[],
  userId: string
): ComplexUpsertData[];

// 역지오코딩 (좌표 → 주소)
export async function enrichWithGeocode(
  complexes: ComplexUpsertData[]
): Promise<void>;
```

#### 2.3 매물 정보 처리
**파일**: `services/article-processor.ts`
**함수**:
```typescript
// 크롤링 데이터를 매물 생성 데이터로 변환
export function prepareArticleCreateData(
  crawlData: any[],
  complexNoToIdMap: Map<string, string>
): ArticleCreateData[];

// 매물 변경 감지 (신규/삭제/가격변경)
export function detectArticleChanges(
  oldArticles: Article[],
  newArticles: Article[]
): ArticleChanges;
```

#### 2.4 통합 DB 서비스
**파일**: `services/crawl-db-service.ts`
**함수**:
```typescript
// 크롤링 결과를 DB에 저장 (오케스트레이션)
export async function saveCrawlResultsToDB(
  crawlId: string,
  complexNos: string[],
  userId: string
): Promise<CrawlDbResult> {
  // 1. 파일 읽기
  const data = await readCrawlData(...);

  // 2. 단지 처리
  const complexes = prepareComplexUpsertData(data, userId);
  await enrichWithGeocode(complexes);
  await upsertComplexes(complexes);

  // 3. 매물 처리
  const articles = prepareArticleCreateData(data, ...);
  await upsertArticles(articles);

  // 4. 결과 반환
  return { totalArticles, totalComplexes, errors };
}
```

### Phase 3: 알림 로직 리팩토링

#### 3.1 알림 서비스
**파일**: `services/alert-service.ts`
**현재**: `sendAlertsForChanges` 함수 (154줄)
**리팩토링**:
```typescript
// 변경사항에 대한 알림 발송
export async function sendAlertsForChanges(
  complexNos: string[]
): Promise<AlertSendResult>;

// 개별 알림 전송
async function sendAlert(
  alert: Alert,
  changes: ArticleChanges
): Promise<boolean>;

// 디스코드 알림
async function sendDiscordAlert(
  alert: Alert,
  changes: ArticleChanges
): Promise<void>;

// 이메일 알림
async function sendEmailAlert(
  alert: Alert,
  changes: ArticleChanges
): Promise<void>;

// 웹훅 알림
async function sendWebhookAlert(
  alert: Alert,
  changes: ArticleChanges
): Promise<void>;
```

### Phase 4: API 라우트 간소화

#### 4.1 POST 핸들러 리팩토링
**현재**: 292줄
**목표**: 100줄 이하

**Before** (292줄):
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 및 권한 체크 (20줄)
    // 2. 입력 검증 (30줄)
    // 3. 중복 실행 방지 (20줄)
    // 4. 크롤링 히스토리 생성 (30줄)
    // 5. 타임아웃 계산 (10줄)
    // 6. 백그라운드 실행 (150줄)
    // 7. 에러 처리 (32줄)
  } catch (error) {
    // ...
  }
}
```

**After** (100줄):
```typescript
import { validateCrawlRequest } from '@/lib/validators/crawl-validator';
import { executeCrawlWorkflow } from '@/services/crawl-workflow';

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 및 권한 체크
    const currentUser = await requireAuth(['ADMIN', 'FAMILY']);

    // 2. 입력 검증 (Zod)
    const validation = await validateRequest(request, crawlRequestSchema);
    if (!validation.success) return validation.response;

    const { complexNumbers } = validation.data;

    // 3. 중복 실행 방지
    if (await isCrawlInProgress()) {
      return NextResponse.json(
        { error: '이미 크롤링이 진행 중입니다.' },
        { status: 409 }
      );
    }

    // 4. 크롤링 워크플로우 실행
    const result = await executeCrawlWorkflow({
      complexNos: complexNumbers,
      userId: currentUser.id,
      scheduleId: null,
    });

    return NextResponse.json({
      success: true,
      crawlId: result.crawlId,
      message: '크롤링이 시작되었습니다.',
    });
  } catch (error: any) {
    logger.error('Crawl request failed', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### 4.2 크롤링 워크플로우 서비스
**파일**: `services/crawl-workflow.ts`
**책임**: 전체 크롤링 프로세스 오케스트레이션

```typescript
export async function executeCrawlWorkflow(
  options: CrawlWorkflowOptions
): Promise<CrawlWorkflowResult> {
  const { crawlId, complexNos, userId, scheduleId } = options;

  try {
    // 1. 히스토리 생성
    await createCrawlHistory(crawlId, complexNos, userId, scheduleId);

    // 2. Python 크롤러 실행
    const crawlResult = await executePythonCrawler({
      crawlId,
      complexNos: complexNos.join(','),
      baseDir: getBaseDir(),
      timeout: calculateDynamicTimeout(complexNos.length),
    });

    if (!crawlResult.success) {
      throw new Error(crawlResult.error);
    }

    // 3. DB 저장
    const dbResult = await saveCrawlResultsToDB(crawlId, complexNos, userId);

    // 4. 히스토리 업데이트
    await updateCrawlHistory(crawlId, {
      successCount: dbResult.totalComplexes,
      totalArticles: dbResult.totalArticles,
      status: dbResult.errors.length > 0 ? 'partial' : 'success',
    });

    // 5. 캐시 무효화
    await invalidateCrawlCaches();

    // 6. 알림 발송
    await sendAlertsForChanges(complexNos);

    // 7. 완료 이벤트 브로드캐스트
    eventBroadcaster.notifyCrawlComplete(crawlId, dbResult.totalArticles);

    return {
      success: true,
      crawlId,
      ...dbResult,
    };
  } catch (error: any) {
    // 에러 처리 및 히스토리 업데이트
    await handleCrawlError(crawlId, error);
    throw error;
  }
}
```

## 마이그레이션 체크리스트

### Phase 1: 서비스 추출 ✅
- [x] `services/crawler-executor.ts` 생성 (140 lines)
- [x] `services/types.ts` 생성

### Phase 2: DB 저장 로직 리팩토링 ✅
- [x] `services/crawl-file-reader.ts` 생성 (180 lines)
- [x] `services/complex-processor.ts` 생성 (240 lines)
- [x] `services/article-processor.ts` 생성 (180 lines)
- [x] `services/crawl-db-service.ts` 생성 (190 lines)

### Phase 3: 알림 & 워크플로우 오케스트레이션 ✅
- [x] `services/alert-service.ts` 생성 (320 lines)
- [x] `services/crawl-workflow.ts` 생성 (320 lines)

### Phase 4: POST 핸들러 리팩토링 ✅
- [x] POST 핸들러를 executeCrawlWorkflow 호출로 변경
- [x] 불필요한 함수 제거 (executeCrawlInBackground, saveCrawlResultsToDB, sendAlertsForChanges)
- [x] 미사용 import 정리
- [x] 타입 에러 수정 및 검증

### Phase 5: Validator 추가 (선택사항)
- [ ] `lib/validators/crawl-validator.ts` 생성
- [ ] Zod 스키마 추가 (`lib/schemas.ts`)
- [ ] 기존 수동 검증 제거

### Phase 6: 테스트 (추후)
- [ ] 단위 테스트 작성 (각 서비스)
- [ ] 통합 테스트 (워크플로우)
- [ ] 기존 기능 동작 검증

## 실제 결과 (완료)

**코드 감소**:
- `app/api/crawl/route.ts`: 1,002줄 → 649줄 (35% 감소)
- 분리된 서비스: 총 1,570줄 (재사용 가능, 테스트 가능)
  - `services/crawler-executor.ts`: 140줄
  - `services/crawl-file-reader.ts`: 180줄
  - `services/complex-processor.ts`: 240줄
  - `services/article-processor.ts`: 180줄
  - `services/crawl-db-service.ts`: 190줄
  - `services/alert-service.ts`: 320줄
  - `services/crawl-workflow.ts`: 320줄

**개선 사항**:
- ✅ 단일 책임 원칙 (SRP) 준수
- ✅ 테스트 가능성 대폭 향상
- ✅ 코드 재사용성 증가
- ✅ 유지보수 용이성 향상
- ✅ 명확한 의존성 계층 구조
- ✅ 타입 안정성 보장

**커밋 이력**:
1. `726c1ca` - Phase 1: crawler-executor, types 생성
2. `bf1aa3f` - Phase 2: file-reader, complex/article-processor, db-service 생성
3. `7a5191f` - Phase 3: alert-service, crawl-workflow 생성
4. `8f8d8c0` - Phase 4: POST 핸들러 간소화 (527줄 제거)

## 주의사항

### ⚠️ 점진적 리팩토링 필수
- 한 번에 모든 것을 리팩토링하지 말 것
- 각 서비스를 추출할 때마다 테스트 후 커밋
- 기존 기능이 동작하는지 확인

### ⚠️ 의존성 관리
- 순환 의존성 주의
- 서비스 간 명확한 인터페이스 정의
- 공유 타입은 `services/types.ts`에 집중

### ⚠️ 백워드 호환성
- API 응답 포맷 변경 금지
- 기존 SSE 이벤트 유지
- 크롤링 히스토리 스키마 변경 최소화

## 참고 자료

- 원본 파일: `app/api/crawl/route.ts`
- 서비스 디렉토리: `services/`
- 타입 정의: `services/types.ts`
- 크롤러 실행: `services/crawler-executor.ts`
