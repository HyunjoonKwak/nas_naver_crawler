# 루트 폴더 관리 가이드

NAS 환경에서 루트 폴더를 효과적으로 관리하기 위한 가이드입니다.

---

## 🚨 주요 문제점

### 1. 빌드 캐시 누적
- **`.next/`** (185MB) - Next.js 빌드 캐시
- **`tsconfig.tsbuildinfo`** (300KB) - TypeScript 빌드 정보
- **문제**: Git에 추적되거나 NAS 동기화 시 불필요한 대역폭 소모
- **해결**: 정기적인 정리 + `.gitignore` 업데이트

### 2. 백업 파일 축적
- `*.backup` 파일들 (예: `TODO.md.backup`)
- `.production_backup/`, `*_backup/` 폴더들
- **문제**: Git 히스토리에 불필요하게 포함
- **해결**: `.gitignore`에 패턴 추가 + 정기 삭제

### 3. macOS 메타데이터
- `.DS_Store` 파일 산재
- **문제**: Windows/Linux 환경에서 불필요, Git 충돌 가능
- **해결**: `.gitignore`에 포함 + 자동 정리

### 4. 큰 데이터 파일
- `dong_code_active.txt` (1MB)
- `법정동코드 전체자료.txt` (2.1MB)
- **문제**: Git에 추적 시 저장소 비대화
- **검토**: 필요 시 `.gitignore` 또는 LFS 고려

---

## ✅ 해결 방법

### 1. `.gitignore` 업데이트 (완료)

**추가된 패턴**:
```gitignore
# TypeScript 빌드 정보
*.tsbuildinfo

# 백업 파일
*.backup
.production_backup/
.dev_backup/
*_backup/
```

### 2. 통합 정리 스크립트 사용

#### **NAS 통합 정리 스크립트**
```bash
./scripts/cleanup-nas.sh
```

**통합 기능**:
1. ✅ **프로젝트 폴더**: 빌드 캐시, 백업 파일, 임시 파일
2. ✅ **Docker 시스템**: 이미지, 컨테이너, 볼륨, 빌드 캐시
3. ✅ **시스템 로그**: 오래된 로그, 큰 로그 압축
4. ✅ **디스크 분석**: 전체 상태, Docker 상태, Top 5 프로젝트
5. ✅ **실행 로그**: `/tmp/cleanup-nas-YYYYMMDD-HHMMSS.log`

#### **정리 레벨**

**레벨 1 (안전)**:
- `.next/`, `tsconfig.tsbuildinfo`
- `*.backup`, `*_backup/` 폴더
- Dangling 이미지, 중지된 컨테이너

**레벨 2 (일반)** 🎯 **권장**:
- 레벨 1 항목 전체
- `.DS_Store`, `*.tmp`, `*~`, `*.swp`
- Docker 미사용 이미지, 빌드 캐시
- `/volume1/docker` 임시 파일

**레벨 3 (전체)** ⚠️ **주의**:
- 레벨 2 항목 전체
- Docker 미사용 볼륨 (데이터 손실 가능)
- 오래된 로그 (30일+)
- 큰 로그 압축 (100MB+)
- 빈 디렉토리

#### **사용 방법**

**대화형 모드** (권장):
```bash
./scripts/cleanup-nas.sh
```

**자동 모드** (레벨 2):
```bash
./scripts/cleanup-nas.sh --auto
```

**특정 레벨 실행**:
```bash
./scripts/cleanup-nas.sh --level 3
```

---

## 📅 정기 관리 스케줄

### 일일 (선택적)
개발 중 빌드 캐시가 쌓이면:
```bash
rm -rf .next
npm run build
```

### 주간 (권장) - 레벨 2
매주 금요일:
```bash
./scripts/cleanup-nas.sh --auto
# 또는 대화형 모드로 레벨 2 선택
```

### 월간 (필수) - 레벨 3
매월 1일:
```bash
# NAS 전체 정리 (레벨 3)
./scripts/cleanup-nas.sh --level 3

# Git 정리 (선택적)
git gc --aggressive
```

---

## 🛠️ 문제별 해결 방법

### 문제 1: `.next/` 폴더가 계속 Git에 추적됨

**원인**: 이미 Git에 추적된 상태

**해결**:
```bash
# Git 추적 제거 (파일은 유지)
git rm -r --cached .next

# Commit
git add .gitignore
git commit -m "fix: Remove .next from Git tracking"
```

### 문제 2: 백업 파일이 자동으로 생성됨

**원인**: 에디터 설정

**해결**:
```bash
# VSCode 설정 (.vscode/settings.json)
{
  "files.autoSave": "off"
}

# Vim 설정 (~/.vimrc)
set nobackup
set nowritebackup
```

### 문제 3: NAS 동기화가 느림

**원인**: `node_modules/`, `.next/` 동기화

**해결 (Synology NAS)**:
1. **제어판** → **파일 서비스** → **rsync**
2. **제외 목록**:
   ```
   node_modules
   .next
   .git
   .DS_Store
   ```

### 문제 4: 디스크 공간 부족 (`/dev/md0` 91%+)

**긴급 조치**:
```bash
# NAS 전체 정리 (레벨 3)
./scripts/cleanup-nas.sh --level 3

# 또는 수동으로
# 1. 빌드 캐시 삭제
rm -rf .next
rm -f tsconfig.tsbuildinfo

# 2. Docker 시스템 정리
docker system prune -a --volumes -f

# 3. 로그 정리
find /volume1/docker -name "*.log" -mtime +30 -delete
```

---

## 📊 루트 폴더 구조 권장안

### 현재 구조 (문제)
```
루트/
├── CLAUDE.md
├── DEPLOYMENT_ANALYSIS.md
├── DEPLOYMENT_SUMMARY_v2.11.0.md
├── DEV_ENVIRONMENT_SETUP.md
├── MODE_SWITCHING_ANALYSIS.md
├── PRODUCTION_MODE_GUIDE.md
├── README.md
├── SECURITY.md
├── SITEMAP.md
├── TODO.md
├── TODO.md.backup ❌
├── .production_backup/ ❌
├── .next/ (185MB) ⚠️
└── ... (기타 30+ 파일/폴더)
```

### 권장 구조
```
루트/
├── README.md ✅
├── CLAUDE.md ✅
├── SECURITY.md ✅
├── deploy-to-nas.sh ✅
├── manage.sh ✅
├── dc.sh ✅
├── docs/ ✅
│   ├── DEPLOYMENT_ANALYSIS.md
│   ├── MODE_SWITCHING_ANALYSIS.md
│   ├── PRODUCTION_MODE_GUIDE.md
│   ├── DEV_ENVIRONMENT_SETUP.md
│   ├── ROOT_FOLDER_MANAGEMENT.md
│   └── ... (모든 가이드 문서)
└── ... (소스 코드 폴더)
```

**이동 고려 대상**:
- `DEPLOYMENT_ANALYSIS.md` → `docs/`
- `DEPLOYMENT_SUMMARY_v2.11.0.md` → `docs/`
- `DEV_ENVIRONMENT_SETUP.md` → `docs/`
- `MODE_SWITCHING_ANALYSIS.md` → `docs/`
- `PRODUCTION_MODE_GUIDE.md` → `docs/`
- `SITEMAP.md` → `docs/`

---

## 🔍 모니터링

### 디스크 사용량 확인
```bash
# 전체
du -sh .

# 폴더별 Top 10
du -sh */ | sort -hr | head -10

# Git 추적 파일만
git ls-files | xargs du -sch

# Git 미추적 파일만
git ls-files --others --exclude-standard | xargs du -sch
```

### 큰 파일 찾기
```bash
# 10MB 이상
find . -type f -size +10M -exec ls -lh {} \;

# Git 추적되는 큰 파일
git ls-files | xargs du -h | sort -hr | head -20
```

---

## ⚙️ 자동화

### Git Hook (pre-commit)

**`.husky/pre-commit`**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 빌드 캐시 자동 제거 (선택적)
if [ -d ".next" ]; then
  echo "Removing .next cache..."
  rm -rf .next
fi

# .DS_Store 자동 제거
find . -name ".DS_Store" -delete 2>/dev/null || true
```

### Cron Job (NAS)

**매주 일요일 자동 정리**:
```bash
# Synology NAS: 제어판 → 작업 스케줄러
0 2 * * 0 cd /volume1/docker/naver-crawler && ./scripts/cleanup-root.sh --clean
```

---

## 📚 관련 문서

- **통합 정리 스크립트**: [scripts/cleanup-nas.sh](../scripts/cleanup-nas.sh)
- **스크립트 가이드**: [scripts/README.md](../scripts/README.md)
- **배포 가이드**: [DEPLOYMENT_ANALYSIS.md](DEPLOYMENT_ANALYSIS.md)

---

## 🎯 체크리스트

### 초기 설정 (1회)
- [ ] `.gitignore` 업데이트 적용 (`git add .gitignore && git commit`)
- [ ] Git에서 `.next` 제거 (`git rm -r --cached .next`)
- [ ] 백업 파일 수동 삭제 (`./scripts/cleanup-nas.sh --level 1`)
- [ ] NAS rsync 제외 목록 설정

### 정기 유지보수
- [ ] **주간** (금요일): `./scripts/cleanup-nas.sh --auto` (레벨 2)
- [ ] **월간** (1일): `./scripts/cleanup-nas.sh --level 3` (전체 정리)
- [ ] 디스크 사용량 모니터링 (`df -h`)

### 배포 전 (필수)
- [ ] Git 상태 확인 (`git status`)
- [ ] 빌드 캐시 정리 (레벨 1로 충분)
- [ ] 불필요한 파일 제외 확인

---

**Made with ❤️ for clean NAS environments**
