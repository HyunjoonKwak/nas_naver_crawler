# 커뮤니티 기능 설계 문서

## 📋 목차
1. [개요](#개요)
2. [핵심 기능](#핵심-기능)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [API 설계](#api-설계)
5. [UI/UX 설계](#uiux-설계)
6. [구현 단계](#구현-단계)
7. [보안 및 권한](#보안-및-권한)
8. [성능 최적화](#성능-최적화)

---

## 개요

### 목적
부동산 인사이트 플랫폼 사용자들이 아파트 단지별 정보, 거래 경험, 생활 정보를 공유하고 소통할 수 있는 커뮤니티 공간 제공

### 핵심 가치
- **단지 중심**: 각 아파트 단지별 전용 게시판
- **실거래 연동**: 크롤링된 실거래 데이터와 연계된 후기
- **신뢰성**: 검증된 정보와 사용자 평판 시스템
- **편의성**: 모바일 최적화 및 실시간 알림

---

## 핵심 기능

### 1. 게시판 시스템

#### 1.1 카테고리 구조
```
/community
├── 단지별 게시판 (Complex Board)
│   └── 각 아파트 단지별 전용 공간
├── 자유 게시판 (Free Board)
│   └── 일반 부동산 정보, 뉴스, 이슈 공유
├── 거래 후기 (Transaction Review)
│   └── 매매/전세/월세 실거래 경험 공유
├── Q&A
│   └── 질문과 답변, 채택 시스템
└── 공지사항 (Notice)
    └── 관리자 공지 (읽기 전용)
```

#### 1.2 게시글 기능
- **작성**: 제목, 내용, 카테고리, 단지 태그, 이미지 첨부
- **수정/삭제**: 작성자 본인만 가능 (관리자는 모든 글 관리)
- **조회**: 조회수 카운트, 최근 본 게시글 저장
- **검색**: 제목+내용, 작성자, 단지별 필터
- **정렬**: 최신순, 인기순, 댓글순

#### 1.3 댓글 시스템
- **계층 구조**: 댓글 + 대댓글 (2단계)
- **기능**: 작성, 수정, 삭제, 좋아요
- **알림**: 내 게시글/댓글에 답변 시 알림

#### 1.4 상호작용
- **좋아요**: 게시글/댓글 공감 표현
- **북마크**: 나중에 다시 보기
- **공유**: URL 복사
- **신고**: 부적절한 게시글/댓글 신고

### 2. 단지별 게시판

#### 2.1 단지 연동
- 단지 상세 페이지(`/complex/[complexNo]`)에 "커뮤니티" 탭 추가
- 해당 단지 관련 게시글만 필터링
- 단지 통계 표시 (게시글 수, 활동 사용자 수)

#### 2.2 단지 정보 통합
- 게시글 작성 시 단지 선택 (자동완성)
- 단지 태그로 빠른 필터링
- 단지별 인기 게시글 표시

### 3. 거래 후기 게시판

#### 3.1 후기 작성
```typescript
interface TransactionReview {
  complexNo: string;      // 단지 번호
  tradeType: string;      // A1(매매), B1(전세), B2(월세)
  price: number;          // 거래 가격
  exclusiveArea: number;  // 전용면적
  tradeDate: Date;        // 거래 시기
  content: string;        // 후기 내용
  rating: number;         // 평점 (1-5)
  pros: string[];         // 장점
  cons: string[];         // 단점
}
```

#### 3.2 신뢰도 검증
- 실거래가 데이터와 비교하여 "검증됨" 뱃지 표시
- 가격 범위, 거래 시기 검증
- 허위 후기 방지

### 4. 사용자 시스템

#### 4.1 프로필
- 닉네임, 아바타
- 활동 통계 (작성 글, 댓글 수)
- 등급/뱃지 시스템

#### 4.2 등급 시스템
```
레벨 1: 새내기 (0-9 포인트)
레벨 2: 이웃 (10-49 포인트)
레벨 3: 주민 (50-199 포인트)
레벨 4: 전문가 (200-499 포인트)
레벨 5: 마스터 (500+ 포인트)

포인트 획득:
- 게시글 작성: +5
- 댓글 작성: +2
- 좋아요 받기: +1
- 베스트 게시글 선정: +50
```

#### 4.3 뱃지 시스템
- 🏠 단지 전문가: 특정 단지 게시글 10개 이상
- 💬 활발한 참여자: 댓글 100개 이상
- ⭐ 베스트 작성자: 베스트 게시글 5개 이상
- 🎖️ 검증된 리뷰어: 검증된 거래 후기 10개 이상

### 5. 알림 시스템

#### 5.1 알림 타입
- 댓글 알림: 내 게시글에 댓글 작성
- 대댓글 알림: 내 댓글에 답글 작성
- 좋아요 알림: 게시글/댓글 좋아요
- 멘션 알림: @username으로 멘션
- 베스트 선정: 내 게시글 베스트 선정

#### 5.2 알림 설정
- 알림 on/off 개별 설정
- 이메일 알림 선택
- 푸시 알림 (PWA)

---

## 데이터베이스 설계

### Prisma Schema

```prisma
// ============================================
// 게시판 관련 모델
// ============================================

// 게시글
model Post {
  id            String    @id @default(cuid())
  title         String
  content       String    @db.Text
  category      PostCategory

  // 작성자
  authorId      String
  author        User      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // 단지 연결 (선택)
  complexNo     String?
  complex       Complex?  @relation(fields: [complexNo], references: [complexNo])

  // 거래 후기 전용 필드
  tradeType     String?   // A1, B1, B2
  tradePrice    Int?
  exclusiveArea Float?
  tradeDate     DateTime?
  rating        Int?      // 1-5
  pros          String[]
  cons          String[]
  isVerified    Boolean   @default(false) // 실거래 검증 여부

  // 통계
  views         Int       @default(0)

  // 관계
  likes         PostLike[]
  bookmarks     PostBookmark[]
  comments      Comment[]
  reports       PostReport[]
  images        PostImage[]

  // 상태
  isPinned      Boolean   @default(false)  // 공지 고정
  isBest        Boolean   @default(false)  // 베스트 게시글
  isDeleted     Boolean   @default(false)  // 소프트 삭제

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([category])
  @@index([complexNo])
  @@index([authorId])
  @@index([createdAt])
  @@index([isBest])
  @@map("posts")
}

// 게시글 카테고리
enum PostCategory {
  FREE      // 자유게시판
  REVIEW    // 거래후기
  QNA       // Q&A
  NOTICE    // 공지사항
  COMPLEX   // 단지게시판
}

// 게시글 이미지
model PostImage {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  url       String
  filename  String
  size      Int      // bytes
  order     Int      @default(0)
  createdAt DateTime @default(now())

  @@index([postId])
  @@map("post_images")
}

// 댓글
model Comment {
  id        String    @id @default(cuid())
  content   String    @db.Text

  // 게시글
  postId    String
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)

  // 작성자
  authorId  String
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // 대댓글
  parentId  String?
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")

  // 관계
  likes     CommentLike[]
  reports   CommentReport[]

  // 상태
  isDeleted Boolean   @default(false)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([postId])
  @@index([authorId])
  @@index([parentId])
  @@map("comments")
}

// 게시글 좋아요
model PostLike {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
  @@map("post_likes")
}

// 댓글 좋아요
model CommentLike {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([commentId, userId])
  @@index([commentId])
  @@index([userId])
  @@map("comment_likes")
}

// 게시글 북마크
model PostBookmark {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
  @@map("post_bookmarks")
}

// 게시글 신고
model PostReport {
  id        String       @id @default(cuid())
  postId    String
  post      Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  reporterId String
  reporter  User         @relation(fields: [reporterId], references: [id], onDelete: Cascade)
  reason    ReportReason
  detail    String?      @db.Text
  status    ReportStatus @default(PENDING)
  createdAt DateTime     @default(now())

  @@index([postId])
  @@index([reporterId])
  @@index([status])
  @@map("post_reports")
}

// 댓글 신고
model CommentReport {
  id         String       @id @default(cuid())
  commentId  String
  comment    Comment      @relation(fields: [commentId], references: [id], onDelete: Cascade)
  reporterId String
  reporter   User         @relation(fields: [reporterId], references: [id], onDelete: Cascade)
  reason     ReportReason
  detail     String?      @db.Text
  status     ReportStatus @default(PENDING)
  createdAt  DateTime     @default(now())

  @@index([commentId])
  @@index([reporterId])
  @@index([status])
  @@map("comment_reports")
}

// 신고 사유
enum ReportReason {
  SPAM          // 스팸
  ABUSE         // 욕설/비방
  INAPPROPRIATE // 부적절한 내용
  FRAUD         // 사기/허위정보
  COPYRIGHT     // 저작권 침해
  ETC           // 기타
}

// 신고 상태
enum ReportStatus {
  PENDING   // 대기중
  REVIEWED  // 검토완료
  RESOLVED  // 처리완료
  REJECTED  // 반려
}

// 알림
model Notification {
  id         String           @id @default(cuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       NotificationType
  title      String
  content    String
  link       String?          // 연결 URL
  isRead     Boolean          @default(false)
  createdAt  DateTime         @default(now())

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}

// 알림 타입
enum NotificationType {
  COMMENT       // 댓글
  REPLY         // 대댓글
  LIKE          // 좋아요
  MENTION       // 멘션
  BEST          // 베스트 선정
  NOTICE        // 공지사항
}

// 사용자 활동 통계
model UserStats {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 활동 통계
  postCount       Int      @default(0)
  commentCount    Int      @default(0)
  likeReceived    Int      @default(0)
  bestPostCount   Int      @default(0)

  // 포인트 & 레벨
  points          Int      @default(0)
  level           Int      @default(1)

  // 뱃지
  badges          String[] // badge IDs

  updatedAt       DateTime @updatedAt

  @@map("user_stats")
}

// User 모델에 추가할 관계
model User {
  // ... 기존 필드들 ...

  // 커뮤니티 관계
  posts           Post[]
  comments        Comment[]
  postLikes       PostLike[]
  commentLikes    CommentLike[]
  bookmarks       PostBookmark[]
  postReports     PostReport[]
  commentReports  CommentReport[]
  notifications   Notification[]
  stats           UserStats?
}

// Complex 모델에 추가할 관계
model Complex {
  // ... 기존 필드들 ...

  // 커뮤니티 관계
  posts           Post[]
}
```

### 인덱스 전략
- 자주 조회되는 컬럼에 인덱스 추가
- 복합 인덱스: `(category, createdAt)`, `(complexNo, createdAt)`
- 풀텍스트 검색: PostgreSQL의 `to_tsvector` 활용

---

## API 설계

### REST API 엔드포인트

#### 게시글 API
```typescript
// 게시글 목록
GET    /api/community/posts
Query: ?category=FREE&complexNo=12345&page=1&limit=20&sort=latest

// 게시글 상세
GET    /api/community/posts/[id]

// 게시글 작성
POST   /api/community/posts
Body: { title, content, category, complexNo?, images? }

// 게시글 수정
PUT    /api/community/posts/[id]
Body: { title?, content?, images? }

// 게시글 삭제
DELETE /api/community/posts/[id]

// 게시글 좋아요
POST   /api/community/posts/[id]/like
DELETE /api/community/posts/[id]/like

// 게시글 북마크
POST   /api/community/posts/[id]/bookmark
DELETE /api/community/posts/[id]/bookmark

// 게시글 신고
POST   /api/community/posts/[id]/report
Body: { reason, detail? }

// 조회수 증가
POST   /api/community/posts/[id]/view
```

#### 댓글 API
```typescript
// 댓글 목록
GET    /api/community/posts/[postId]/comments

// 댓글 작성
POST   /api/community/posts/[postId]/comments
Body: { content, parentId? }

// 댓글 수정
PUT    /api/community/comments/[id]
Body: { content }

// 댓글 삭제
DELETE /api/community/comments/[id]

// 댓글 좋아요
POST   /api/community/comments/[id]/like
DELETE /api/community/comments/[id]/like

// 댓글 신고
POST   /api/community/comments/[id]/report
Body: { reason, detail? }
```

#### 사용자 API
```typescript
// 내 게시글 목록
GET    /api/community/my/posts

// 내 댓글 목록
GET    /api/community/my/comments

// 내 북마크 목록
GET    /api/community/my/bookmarks

// 내 활동 통계
GET    /api/community/my/stats

// 알림 목록
GET    /api/community/notifications
Query: ?page=1&limit=20&unreadOnly=true

// 알림 읽음 처리
PUT    /api/community/notifications/[id]/read

// 모든 알림 읽음
PUT    /api/community/notifications/read-all
```

#### 관리자 API
```typescript
// 신고 목록
GET    /api/admin/community/reports
Query: ?status=PENDING&type=post

// 신고 처리
PUT    /api/admin/community/reports/[id]
Body: { status, action }

// 게시글 관리 (삭제, 공지 고정, 베스트 선정)
PUT    /api/admin/community/posts/[id]/manage
Body: { isPinned?, isBest?, isDeleted? }

// 사용자 제재
POST   /api/admin/community/users/[id]/ban
Body: { reason, duration }
```

### 응답 형식

```typescript
// 성공 응답
{
  success: true,
  data: { ... },
  meta?: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}

// 에러 응답
{
  success: false,
  error: {
    code: "UNAUTHORIZED",
    message: "로그인이 필요합니다."
  }
}
```

---

## UI/UX 설계

### 페이지 구조

```
/community
├── index - 커뮤니티 메인 (카테고리별 최신글, 인기글)
├── [category] - 카테고리별 게시판 (FREE, REVIEW, QNA)
├── post/[id] - 게시글 상세
├── write - 글쓰기
├── edit/[id] - 글수정
├── my/posts - 내가 쓴 글
├── my/comments - 내가 쓴 댓글
├── my/bookmarks - 북마크한 글
└── complex/[complexNo] - 단지별 게시판
```

### 주요 컴포넌트

#### 1. PostList 컴포넌트
```tsx
<PostList>
  <PostCard>
    - 제목, 작성자, 작성일
    - 카테고리 뱃지
    - 단지 태그 (있을 경우)
    - 조회수, 좋아요, 댓글 수
    - 썸네일 이미지 (있을 경우)
  </PostCard>
</PostList>
```

#### 2. PostDetail 컴포넌트
```tsx
<PostDetail>
  <PostHeader>
    - 카테고리, 제목
    - 작성자 정보 (아바타, 닉네임, 레벨)
    - 작성일, 조회수
  </PostHeader>

  <PostContent>
    - 본문 (마크다운 렌더링)
    - 이미지 갤러리
    - 단지 정보 (연결된 경우)
  </PostContent>

  <PostActions>
    - 좋아요, 북마크, 공유, 신고
    - 수정, 삭제 (작성자)
  </PostActions>

  <CommentSection>
    - 댓글 목록
    - 댓글 작성 폼
  </CommentSection>
</PostDetail>
```

#### 3. PostEditor 컴포넌트
```tsx
<PostEditor>
  - 카테고리 선택
  - 단지 선택 (자동완성)
  - 제목 입력
  - 내용 입력 (마크다운 에디터)
  - 이미지 업로드 (드래그앤드롭)
  - 거래 후기 추가 필드 (카테고리가 REVIEW인 경우)
</PostEditor>
```

#### 4. CommentItem 컴포넌트
```tsx
<CommentItem>
  - 작성자 정보
  - 댓글 내용
  - 작성일, 좋아요 수
  - 답글 버튼, 좋아요 버튼, 신고 버튼
  - 대댓글 목록 (재귀)
</CommentItem>
```

### 반응형 디자인

#### 데스크톱 (1024px+)
```
┌────────────────────────────────────────┐
│  Navigation                             │
├────┬───────────────────────────────────┤
│ 카 │  게시글 목록                        │
│ 테 │  ┌──────────────────────────┐     │
│ 고 │  │ 📌 [공지] 이용규칙      │ 👍12│
│ 리 │  ├──────────────────────────┤     │
│    │  │ [자유] 제목...          │ 💬5 │
│ 필 │  │ 작성자 · 1시간 전        │     │
│ 터 │  ├──────────────────────────┤     │
│    │  │ [후기] 압구정현대 입주... │ 👍45│
│ 검 │  │ 작성자 · 2일 전          │     │
│ 색 │  └──────────────────────────┘     │
│    │                                    │
│    │  [페이지네이션]                    │
└────┴───────────────────────────────────┘
```

#### 모바일 (< 768px)
```
┌────────────────────────┐
│  🏘️ 커뮤니티           │
│  [검색] [필터] [글쓰기] │
├────────────────────────┤
│  📌 [공지] 이용규칙     │
│  👍12 💬5 👁200        │
├────────────────────────┤
│  [자유] 제목...        │
│  작성자 · 1시간 전      │
│  👍3 💬2 👁50          │
├────────────────────────┤
│  [후기] 압구정현대...   │
│  작성자 · 2일 전        │
│  👍45 💬12 👁500       │
└────────────────────────┘
```

### 다크모드 지원
- 기존 테마 시스템 활용
- 커뮤니티 전용 색상 팔레트 정의
- 이미지 밝기 자동 조정

---

## 구현 단계

### Phase 1: 기본 게시판 (2주)

#### Week 1
- ✅ Day 1-2: Prisma 스키마 작성 및 마이그레이션
- ✅ Day 3-4: 게시글 CRUD API 구현
- ✅ Day 5: 게시판 목록 UI 구현

#### Week 2
- ✅ Day 1-2: 게시글 상세 페이지 UI
- ✅ Day 3-4: 글쓰기/수정 UI (마크다운 에디터)
- ✅ Day 5: 검색 및 필터링 기능

### Phase 2: 상호작용 기능 (1주)

- ✅ Day 1-2: 댓글 시스템 (API + UI)
- ✅ Day 3: 좋아요/북마크 기능
- ✅ Day 4: 조회수 카운트 및 통계
- ✅ Day 5: 테스트 및 버그 수정

### Phase 3: 고급 기능 (2주)

#### Week 1
- ✅ Day 1-2: 이미지 업로드 (Cloudinary/S3)
- ✅ Day 3-4: 단지별 게시판 연동
- ✅ Day 5: 거래 후기 검증 시스템

#### Week 2
- ✅ Day 1-2: 알림 시스템
- ✅ Day 3-4: 사용자 통계 및 레벨 시스템
- ✅ Day 5: 관리자 기능 (신고 처리)

### Phase 4: 최적화 및 추가 기능 (선택, 1-2주)

- 🔲 실시간 채팅
- 🔲 멘션 기능
- 🔲 태그 시스템
- 🔲 베스트 게시글 자동 선정
- 🔲 PWA 푸시 알림
- 🔲 SEO 최적화

---

## 보안 및 권한

### 인증 및 권한

#### 권한 레벨
```typescript
enum UserRole {
  USER   // 일반 사용자
  FAMILY // 패밀리 (기존)
  ADMIN  // 관리자
}

// 게시판 권한
interface CommunityPermission {
  canWrite: boolean;      // 글쓰기
  canComment: boolean;    // 댓글
  canLike: boolean;       // 좋아요
  canReport: boolean;     // 신고
  canManage: boolean;     // 관리 (ADMIN만)
}
```

#### 권한 체크
```typescript
// API에서 권한 체크
export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('로그인이 필요합니다.');
  }
  return session;
}

// 작성자 확인
export async function requireOwner(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post?.authorId !== userId) {
    throw new Error('권한이 없습니다.');
  }
  return post;
}

// 관리자 확인
export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role !== 'ADMIN') {
    throw new Error('관리자 권한이 필요합니다.');
  }
  return user;
}
```

### XSS 방어
- 게시글 내용 sanitize (DOMPurify)
- 마크다운 렌더링 시 HTML 이스케이프
- CSP (Content Security Policy) 설정

### CSRF 방어
- NextAuth의 CSRF 토큰 활용
- API 요청 시 토큰 검증

### Rate Limiting
```typescript
// 게시글 작성 제한: 1분에 3개
// 댓글 작성 제한: 1분에 10개
// 좋아요 제한: 1분에 30개

import rateLimit from 'express-rate-limit';

export const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 3,
  message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
});
```

### 스팸 방지
- 동일 내용 연속 게시 차단
- 짧은 시간 내 대량 게시 차단
- 신고 누적 시 자동 제재

---

## 성능 최적화

### 1. 데이터베이스 최적화

#### 인덱싱 전략
```sql
-- 복합 인덱스
CREATE INDEX idx_posts_category_created
ON posts(category, created_at DESC);

CREATE INDEX idx_posts_complex_created
ON posts(complex_no, created_at DESC);

-- 풀텍스트 검색 인덱스 (PostgreSQL)
CREATE INDEX idx_posts_search
ON posts USING gin(to_tsvector('korean', title || ' ' || content));
```

#### 쿼리 최적화
```typescript
// N+1 문제 해결 - include 사용
const posts = await prisma.post.findMany({
  include: {
    author: {
      select: { id: true, name: true, image: true }
    },
    _count: {
      select: { comments: true, likes: true }
    }
  }
});

// 페이지네이션 - cursor 기반
const posts = await prisma.post.findMany({
  take: 20,
  skip: 1,
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' }
});
```

### 2. 캐싱 전략

#### Redis 캐싱
```typescript
// 인기 게시글 캐싱 (1시간)
const cacheKey = 'community:popular:24h';
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const popularPosts = await getPopularPosts();
await redis.setex(cacheKey, 3600, JSON.stringify(popularPosts));

// 조회수 캐싱 후 배치 업데이트
await redis.incr(`post:${postId}:views`);
// 1분마다 DB에 일괄 업데이트
```

#### React Query 활용
```typescript
// 게시글 목록 캐싱
const { data, isLoading } = useQuery({
  queryKey: ['posts', category, page],
  queryFn: () => fetchPosts(category, page),
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 10 * 60 * 1000 // 10분
});

// 무한 스크롤
const {
  data,
  fetchNextPage,
  hasNextPage
} = useInfiniteQuery({
  queryKey: ['posts', category],
  queryFn: ({ pageParam = 1 }) => fetchPosts(category, pageParam),
  getNextPageParam: (lastPage, pages) => lastPage.nextPage
});
```

### 3. 이미지 최적화

#### Next.js Image 컴포넌트
```typescript
import Image from 'next/image';

<Image
  src={post.image}
  alt={post.title}
  width={800}
  height={400}
  loading="lazy"
  placeholder="blur"
/>
```

#### CDN 활용
- Cloudinary / AWS S3 + CloudFront
- 이미지 리사이징 및 포맷 변환
- WebP 자동 변환

### 4. 코드 스플리팅

```typescript
// 마크다운 에디터 lazy load
const MarkdownEditor = lazy(() => import('@/components/MarkdownEditor'));

// 댓글 섹션 lazy load
const CommentSection = lazy(() => import('@/components/CommentSection'));
```

### 5. 가상 스크롤
```typescript
// 댓글이 많을 경우 가상 스크롤 적용
import { VirtualList } from '@/components/VirtualList';

<VirtualList
  items={comments}
  itemHeight={100}
  renderItem={(comment) => <CommentItem comment={comment} />}
/>
```

---

## 모니터링 및 분석

### 1. 활동 로그
```typescript
model ActivityLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // POST_CREATE, COMMENT_CREATE, LIKE, etc.
  targetId  String   // post/comment ID
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### 2. 통계 대시보드
- 일일 활성 사용자 (DAU)
- 게시글/댓글 작성 추이
- 인기 단지 TOP 10
- 인기 게시글 TOP 10

### 3. 알림 시스템
- 관리자에게 신고 알림
- 베스트 게시글 선정 알림
- 일일/주간 통계 리포트

---

## 마이그레이션 계획

### 1. 데이터베이스 마이그레이션
```bash
# Prisma 스키마 업데이트
npx prisma db push

# 마이그레이션 파일 생성
npx prisma migrate dev --name add_community_tables

# 프로덕션 적용
npx prisma migrate deploy
```

### 2. 초기 데이터 시딩
```typescript
// 카테고리별 샘플 게시글 생성
// 공지사항 게시글 생성
// 사용자 통계 초기화
```

### 3. 단계별 배포
1. **Stage 1**: 데이터베이스 스키마만 적용 (읽기 전용)
2. **Stage 2**: API 배포 (테스트)
3. **Stage 3**: UI 배포 (베타)
4. **Stage 4**: 정식 오픈

---

## 향후 확장 계획

### 1. 소셜 기능
- 사용자 팔로우
- 피드 시스템
- DM (다이렉트 메시지)

### 2. 게임화
- 일일 출석 체크
- 미션 시스템
- 리더보드

### 3. AI 통합
- 스팸 자동 감지
- 게시글 자동 분류
- 추천 시스템

### 4. 외부 연동
- SNS 공유 (카카오톡, 페이스북)
- 외부 이미지 임베드
- Open Graph 메타데이터

---

## 참고 자료

### 기술 스택
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis
- **Storage**: AWS S3 / Cloudinary
- **Authentication**: NextAuth.js

### 참고 사이트
- 네이버 카페
- 호갱노노 커뮤니티
- 아파트 커뮤니티 사이트들

### 개발 도구
- Prisma Studio: DB 관리
- React Query Devtools: 캐시 디버깅
- Postman: API 테스트

---

## 문서 히스토리

- 2025-10-17: 초안 작성
- 향후 업데이트 예정
