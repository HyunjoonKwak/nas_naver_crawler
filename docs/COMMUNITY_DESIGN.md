# 커뮤니티 기능 설계 문서 (단순화 버전)

## 📋 목차
1. [개요](#개요)
2. [핵심 기능](#핵심-기능)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [API 설계](#api-설계)
5. [UI/UX 설계](#uiux-설계)
6. [구현 단계](#구현-단계)
7. [보안 및 권한](#보안-및-권한)

---

## 개요

### 목적
부동산 인사이트 플랫폼 사용자들이 정보를 공유하고 소통할 수 있는 단순하고 실용적인 커뮤니티 공간 제공

### 핵심 가치
- **단순함**: 3개의 명확한 게시판 (자유, Q&A, 공지)
- **실용성**: 필수 기능에만 집중
- **편의성**: 모바일 최적화 및 알림

---

## 핵심 기능

### 1. 게시판 시스템 (3개만)

#### 1.1 카테고리 구조
```
/community
├── 자유 게시판 (FREE)
│   └── 일반 부동산 정보, 뉴스, 이슈, 의견 공유
├── Q&A (QNA)
│   └── 질문과 답변, 채택 시스템
└── 공지사항 (NOTICE)
    └── 관리자 공지 (읽기 전용)
```

**제거된 것들:**
- ❌ 단지별 게시판 (복잡도 증가)
- ❌ 거래 후기 게시판 (실거래 검증 복잡)

#### 1.2 게시글 기능
- **작성**: 제목, 내용, 카테고리, 이미지 첨부 (선택)
- **수정/삭제**: 작성자 본인만 가능
- **조회**: 조회수 카운트
- **검색**: 제목+내용 검색
- **정렬**: 최신순, 인기순 (좋아요순)

#### 1.3 댓글 시스템
- **단순 댓글**: 1단계만 (대댓글 없음)
- **기능**: 작성, 수정, 삭제
- **알림**: 내 게시글에 댓글 작성 시 알림

#### 1.4 상호작용
- **좋아요**: 게시글에만 (댓글 좋아요 제외)
- **신고**: 부적절한 게시글/댓글 신고

**제거된 것들:**
- ❌ 북마크 (복잡도 증가)
- ❌ 댓글 좋아요
- ❌ 대댓글 (1단계 댓글만)

### 2. Q&A 채택 시스템

#### 2.1 질문 게시글
- Q&A 카테고리 게시글은 "질문" 상태
- 작성자가 댓글 중 하나를 "채택"할 수 있음
- 채택되면 게시글 상태가 "해결됨"으로 변경

#### 2.2 채택 표시
```typescript
interface Post {
  // ... 기본 필드
  isResolved: boolean;      // Q&A 해결 여부
  acceptedCommentId: string | null;  // 채택된 댓글 ID
}
```

### 3. 사용자 시스템 (단순화)

#### 3.1 프로필 (최소)
- 닉네임 (User name)
- 활동 통계 (작성 글, 댓글 수)

**제거된 것들:**
- ❌ 등급/레벨 시스템
- ❌ 뱃지 시스템
- ❌ 포인트 시스템

### 4. 알림 시스템 (최소)

#### 4.1 알림 타입 (3가지만)
- 댓글 알림: 내 게시글에 댓글 작성
- 채택 알림: 내 댓글이 채택됨
- 공지 알림: 새 공지사항

**제거된 것들:**
- ❌ 좋아요 알림
- ❌ 멘션 알림
- ❌ 대댓글 알림

---

## 데이터베이스 설계

### Prisma Schema (단순화)

```prisma
// ============================================
// 게시판 관련 모델
// ============================================

// 게시글
model Post {
  id            String       @id @default(cuid())
  title         String
  content       String       @db.Text
  category      PostCategory

  // 작성자
  authorId      String
  author        User         @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // 통계
  views         Int          @default(0)
  likesCount    Int          @default(0)

  // Q&A 전용
  isResolved    Boolean      @default(false)
  acceptedCommentId String?

  // 관계
  likes         PostLike[]
  comments      Comment[]
  reports       PostReport[]
  images        PostImage[]

  // 상태
  isPinned      Boolean      @default(false)  // 공지 고정
  isDeleted     Boolean      @default(false)  // 소프트 삭제

  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([category])
  @@index([authorId])
  @@index([createdAt])
  @@index([isPinned])
  @@map("posts")
}

// 게시글 카테고리 (3개만)
enum PostCategory {
  FREE      // 자유게시판
  QNA       // Q&A
  NOTICE    // 공지사항
}

// 게시글 이미지 (선택)
model PostImage {
  id        String   @id @default(cuid())
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  url       String
  filename  String
  size      Int
  order     Int      @default(0)
  createdAt DateTime @default(now())

  @@index([postId])
  @@map("post_images")
}

// 댓글 (1단계만)
model Comment {
  id        String    @id @default(cuid())
  content   String    @db.Text

  // 게시글
  postId    String
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)

  // 작성자
  authorId  String
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)

  // 채택 여부 (Q&A용)
  isAccepted Boolean  @default(false)

  // 관계
  reports   CommentReport[]

  // 상태
  isDeleted Boolean   @default(false)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([postId])
  @@index([authorId])
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
  ETC           // 기타
}

// 신고 상태
enum ReportStatus {
  PENDING   // 대기중
  REVIEWED  // 검토완료
  RESOLVED  // 처리완료
  REJECTED  // 반려
}

// 알림 (3가지만)
model Notification {
  id         String           @id @default(cuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       NotificationType
  title      String
  content    String
  link       String?
  isRead     Boolean          @default(false)
  createdAt  DateTime         @default(now())

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}

// 알림 타입 (3가지만)
enum NotificationType {
  COMMENT       // 댓글
  ACCEPTED      // 채택
  NOTICE        // 공지사항
}

// User 모델에 추가할 관계
model User {
  // ... 기존 필드들 ...

  // 커뮤니티 관계
  posts           Post[]
  comments        Comment[]
  postLikes       PostLike[]
  postReports     PostReport[]
  commentReports  CommentReport[]
  notifications   Notification[]
}
```

### 인덱스 전략
- `(category, createdAt)` - 카테고리별 최신글
- `(category, likesCount)` - 카테고리별 인기글
- `(authorId, createdAt)` - 사용자별 글 목록

---

## API 설계

### REST API 엔드포인트

#### 게시글 API
```typescript
// 게시글 목록
GET    /api/community/posts
Query: ?category=FREE&page=1&limit=20&sort=latest

// 게시글 상세
GET    /api/community/posts/[id]

// 게시글 작성
POST   /api/community/posts
Body: { title, content, category, images? }

// 게시글 수정
PUT    /api/community/posts/[id]
Body: { title?, content?, images? }

// 게시글 삭제
DELETE /api/community/posts/[id]

// 게시글 좋아요 토글
POST   /api/community/posts/[id]/like

// 게시글 신고
POST   /api/community/posts/[id]/report
Body: { reason, detail? }
```

#### 댓글 API
```typescript
// 댓글 목록
GET    /api/community/posts/[postId]/comments

// 댓글 작성
POST   /api/community/posts/[postId]/comments
Body: { content }

// 댓글 수정
PUT    /api/community/comments/[id]
Body: { content }

// 댓글 삭제
DELETE /api/community/comments/[id]

// 댓글 채택 (Q&A만)
POST   /api/community/comments/[id]/accept

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

// 알림 목록
GET    /api/community/notifications
Query: ?unreadOnly=true

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

// 게시글 관리 (삭제, 공지 고정)
PUT    /api/admin/community/posts/[id]/manage
Body: { isPinned?, isDeleted? }
```

---

## UI/UX 설계

### 페이지 구조 (단순화)

```
/community
├── index - 커뮤니티 메인 (3개 카테고리 탭)
├── post/[id] - 게시글 상세
├── write - 글쓰기
└── my - 내 활동 (게시글, 댓글)
```

### 주요 컴포넌트

#### 1. 커뮤니티 메인
```tsx
<CommunityMain>
  <Tabs>
    - 자유게시판
    - Q&A
    - 공지사항
  </Tabs>

  <PostList>
    {공지 고정글}
    {일반 게시글 목록}
  </PostList>
</CommunityMain>
```

#### 2. 게시글 카드
```tsx
<PostCard>
  - 카테고리 뱃지
  - 제목
  - 작성자, 작성일
  - 👍 좋아요 수
  - 💬 댓글 수
  - 👁️ 조회수
  - [Q&A] ✅ 해결됨 표시
</PostCard>
```

#### 3. 게시글 상세
```tsx
<PostDetail>
  <PostHeader>
    - 카테고리 뱃지
    - 제목
    - 작성자 (아바타, 닉네임)
    - 작성일, 조회수
  </PostHeader>

  <PostContent>
    - 본문
    - 이미지 (있을 경우)
  </PostContent>

  <PostActions>
    - 👍 좋아요 ({count})
    - 🚨 신고
    - 수정/삭제 (작성자만)
  </PostActions>

  <CommentSection>
    - 댓글 목록
    - 댓글 작성 폼
    - [Q&A] 채택 버튼 (작성자만)
  </CommentSection>
</PostDetail>
```

#### 4. 글쓰기
```tsx
<PostEditor>
  <CategorySelect>
    - 자유게시판
    - Q&A
  </CategorySelect>

  <TitleInput placeholder="제목을 입력하세요" />

  <ContentEditor placeholder="내용을 입력하세요" />

  <ImageUpload>
    - 이미지 첨부 (선택, 최대 3장)
  </ImageUpload>

  <SubmitButton>작성하기</SubmitButton>
</PostEditor>
```

### 반응형 디자인

#### 데스크톱
```
┌────────────────────────────────────────┐
│  Navigation                             │
├──────┬─────────────────────────────────┤
│ 탭   │  게시글 목록                     │
│ ┌──┐ │  ┌──────────────────────────┐   │
│ │자│ │  │ 📌 [공지] 이용규칙      │   │
│ │유│ │  ├──────────────────────────┤   │
│ └──┘ │  │ [자유] 제목...          │   │
│ ┌──┐ │  │ 작성자 · 1시간 전        │   │
│ │Q │ │  │ 👍3 💬2 👁50            │   │
│ │&│ │  ├──────────────────────────┤   │
│ │A │ │  │ [Q&A] ✅ 질문입니다...  │   │
│ └──┘ │  │ 작성자 · 2시간 전        │   │
│ ┌──┐ │  │ 👍12 💬8 👁120          │   │
│ │공│ │  └──────────────────────────┘   │
│ │지│ │                                 │
│ └──┘ │  [페이지네이션]                 │
└──────┴─────────────────────────────────┘
```

#### 모바일
```
┌────────────────────────┐
│  🏘️ 커뮤니티           │
│  [자유] [Q&A] [공지]    │
│  [검색] [글쓰기]        │
├────────────────────────┤
│  📌 [공지] 이용규칙     │
│  👍12 💬5 👁200        │
├────────────────────────┤
│  [자유] 제목...        │
│  작성자 · 1시간 전      │
│  👍3 💬2 👁50          │
├────────────────────────┤
│  [Q&A] ✅ 질문입니다... │
│  작성자 · 2시간 전      │
│  👍12 💬8 👁120        │
└────────────────────────┘
```

---

## 구현 단계

### Phase 1: 기본 게시판 (1주)

#### Day 1-2: 데이터베이스
- ✅ Prisma 스키마 작성
- ✅ 마이그레이션 실행
- ✅ 시드 데이터 (샘플 게시글)

#### Day 3-4: 게시글 API
- ✅ 게시글 CRUD API
- ✅ 좋아요 API
- ✅ 신고 API

#### Day 5-7: 게시판 UI
- ✅ 커뮤니티 메인 페이지
- ✅ 게시글 목록 (3개 탭)
- ✅ 게시글 상세 페이지
- ✅ 글쓰기 페이지

### Phase 2: 댓글 시스템 (3일)

#### Day 1: 댓글 API
- ✅ 댓글 CRUD API
- ✅ 채택 API (Q&A용)

#### Day 2-3: 댓글 UI
- ✅ 댓글 목록 컴포넌트
- ✅ 댓글 작성 폼
- ✅ 채택 버튼 (Q&A)

### Phase 3: 알림 시스템 (2일)

#### Day 1: 알림 백엔드
- ✅ 알림 생성 로직
- ✅ 알림 API

#### Day 2: 알림 UI
- ✅ 알림 목록 페이지
- ✅ 알림 뱃지 (헤더)

### Phase 4: 관리자 기능 (2일)

#### Day 1: 관리자 API
- ✅ 신고 관리 API
- ✅ 게시글 관리 API

#### Day 2: 관리자 UI
- ✅ 신고 목록 페이지
- ✅ 게시글 관리 기능

---

## 보안 및 권한

### 권한 체크

```typescript
// 게시글 작성: 로그인 필요
export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('로그인이 필요합니다.');
  return session;
}

// 작성자 확인
export async function requireOwner(postId: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post?.authorId !== userId) throw new Error('권한이 없습니다.');
  return post;
}

// 관리자 확인
export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role !== 'ADMIN') throw new Error('관리자 권한이 필요합니다.');
  return user;
}
```

### XSS 방어
- 게시글 내용 sanitize (DOMPurify)
- HTML 이스케이프

### Rate Limiting
```typescript
// 게시글 작성: 1분에 3개
// 댓글 작성: 1분에 10개
// 좋아요: 1분에 30개
```

---

## 성능 최적화

### 1. 데이터베이스
```sql
-- 인덱스
CREATE INDEX idx_posts_category_created ON posts(category, created_at DESC);
CREATE INDEX idx_posts_likes ON posts(likes_count DESC);
```

### 2. 캐싱
```typescript
// 인기 게시글 캐싱 (1시간)
const cacheKey = 'community:popular:1h';
await redis.setex(cacheKey, 3600, JSON.stringify(posts));
```

### 3. 페이지네이션
```typescript
// Cursor 기반 페이지네이션
const posts = await prisma.post.findMany({
  take: 20,
  cursor: { id: lastPostId },
  orderBy: { createdAt: 'desc' }
});
```

---

## 추정 작업 시간

| Phase | 내용 | 예상 시간 |
|-------|------|-----------|
| Phase 1 | 기본 게시판 (DB, API, UI) | 1주 |
| Phase 2 | 댓글 시스템 | 3일 |
| Phase 3 | 알림 시스템 | 2일 |
| Phase 4 | 관리자 기능 | 2일 |
| **Total** | | **약 2주** |

---

## 향후 확장 가능성

필요시 추가할 수 있는 기능들:
- 🔲 단지별 게시판 (복잡도 높음)
- 🔲 거래 후기 (검증 시스템 필요)
- 🔲 대댓글 (1단계 → 2단계)
- 🔲 북마크 기능
- 🔲 댓글 좋아요
- 🔲 등급/뱃지 시스템

---

**마지막 업데이트**: 2025-10-17
**버전**: 2.0 (단순화)
