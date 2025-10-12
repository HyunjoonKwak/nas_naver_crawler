# 🚀 시작 가이드

> **네이버 부동산 크롤러 - 완벽 시작 가이드**
>
> 초보자부터 고급 사용자까지, 이 문서 하나로 모든 것을 시작할 수 있습니다.

---

## 📑 목차

1. [빠른 시작](#-빠른-시작)
2. [웹 UI 사용법](#-웹-ui-사용법)
3. [관리 명령어](#-관리-명령어)
4. [외부 접속 설정](#-외부-접속-설정)
5. [문제 해결](#-문제-해결)

---

## 🚀 빠른 시작

### 방법 1: 한 줄로 시작 (가장 간단)

```bash
./start.sh
```

⏱️ 예상 시간: 10-20초

### 방법 2: 관리 메뉴 사용

```bash
./manage.sh
# → 1번 선택 (웹서버 시작)
```

### 브라우저에서 접속

**로컬 접속:**
```
http://localhost:3000
```

**NAS 접속:**
```
http://[NAS-IP주소]:3000
```

예시: `http://192.168.1.100:3000`

---

## 🌐 웹 UI 사용법

### 화면 구성

```
┌─────────────────────────────────────────────────────┐
│  🏠 네이버 부동산 크롤러                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [크롤링 폼]                    [시스템 상태]        │
│  - 단지 번호 입력                - Docker 상태       │
│  - 크롤링 시작 버튼              - 데이터 개수       │
│  - 진행 상태 표시                - 실행 중 작업      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [크롤링 히스토리]                                  │
│  - 과거 크롤링 결과                                 │
│  - 상세 보기                                        │
│  - 파일 삭제                                        │
└─────────────────────────────────────────────────────┘
```

---

### 1️⃣ 크롤링 실행

#### 단일 단지 크롤링
1. 단지 번호 입력 (예: `22065`)
2. "크롤링 시작" 버튼 클릭
3. 실시간 진행 상태 확인
4. 완료 후 히스토리에서 결과 확인

#### 여러 단지 동시 크롤링
```
입력: 22065,1482,109208
```
쉼표(,)로 구분하여 입력

#### 단지 번호 찾는 방법
1. 네이버 부동산 접속
2. 원하는 단지 검색
3. URL에서 번호 확인
   ```
   https://new.land.naver.com/complexes/22065
                                           ↑↑↑↑↑
                                         단지 번호
   ```

---

### 2️⃣ 시스템 상태 모니터링

우측 상단 카드에서 실시간 확인:

| 항목 | 설명 |
|------|------|
| **Docker 상태** | 이미지 존재 여부 |
| **실행 중인 작업** | 현재 크롤링 작업 수 |
| **크롤링 파일** | 저장된 결과 파일 개수 |

자동 업데이트: 10초마다

---

### 3️⃣ 크롤링 히스토리

하단 테이블에서 과거 결과 조회:

- **파일명**: 클릭하여 상세 보기
- **파일 크기**: MB 단위 표시
- **생성 일시**: YYYY-MM-DD HH:MM:SS
- **액션**:
  - 👁️ 상세 보기 (JSON 데이터)
  - 🗑️ 삭제

---

### 4️⃣ 상세 데이터 보기

"상세 보기" 클릭 시:

```json
{
  "complexNo": "22065",
  "complexName": "동탄시범다은마을...",
  "articles": {
    "articleList": [
      {
        "articleNo": "12345",
        "realEstateTypeName": "아파트",
        "tradeTypeName": "매매",
        "dealOrWarrantPrc": "65000",
        "area1": "84.9",
        "floorInfo": "5/15",
        ...
      }
    ]
  }
}
```

---

## 🎨 주요 기능

### ✨ 편의 기능
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- 🌙 **다크 모드**: 시스템 설정에 따라 자동 전환
- 🔄 **자동 새로고침**: 10초마다 상태 업데이트
- 📊 **실시간 진행률**: 크롤링 중 실시간 상태 표시

### 📊 데이터 관리
- **JSON 형식**: 완전한 데이터 구조 저장
- **CSV 형식**: 엑셀에서 바로 열기 가능
- **히스토리 관리**: 과거 결과 영구 보관
- **개별 삭제**: 불필요한 파일 정리

---

## 💻 관리 명령어

### 서비스 제어

**시작:**
```bash
./start.sh
# 또는
docker-compose up -d
```

**중지:**
```bash
./stop.sh
# 또는
docker-compose down
```

**재시작:**
```bash
docker-compose restart web
```

**로그 확인:**
```bash
docker-compose logs -f web
```

---

### 상태 확인

**컨테이너 상태:**
```bash
docker-compose ps
```

**리소스 사용량:**
```bash
docker stats naver-crawler-web
```

**디스크 사용량:**
```bash
du -sh crawled_data/ logs/
```

---

### CLI로 크롤링

웹 UI 대신 커맨드라인 사용:

**단일 단지:**
```bash
./scripts/crawl.sh 22065
```

**여러 단지:**
```bash
./scripts/crawl.sh 22065,12345,67890
```

**결과 확인:**
```bash
ls -lh crawled_data/
```

---

## 🌍 외부 접속 설정

### 방화벽 포트 열기

**Ubuntu/Debian:**
```bash
sudo ufw allow 3000
sudo ufw status
```

**CentOS/RHEL:**
```bash
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

---

### NAS별 포트 포워딩

#### Synology DSM
1. **제어판** → **외부 액세스** → **라우터 구성**
2. **포트 포워딩 규칙 추가**:
   - 외부 포트: `3000`
   - 내부 포트: `3000`
   - 내부 IP: NAS IP 주소

#### QNAP QTS
1. **myQNAPcloud** → **자동 라우터 구성**
2. **포트 포워딩**: `3000`
3. **서비스 활성화**

---

### 모바일 접속

1. **WiFi 연결**: NAS와 같은 네트워크
2. **브라우저 열기**: Safari, Chrome 등
3. **주소 입력**: `http://[NAS-IP]:3000`
4. **북마크 추가**: 홈 화면에 추가 가능

---

## 🔒 보안 설정

### 로컬 네트워크만 허용

`docker-compose.yml` 수정:
```yaml
services:
  web:
    ports:
      - "127.0.0.1:3000:3000"  # 로컬만 접속 가능
```

### 외부 접속 허용

```yaml
services:
  web:
    ports:
      - "3000:3000"  # 모든 인터페이스에서 접속 가능
```

---

## 📊 API 엔드포인트

웹 UI가 사용하는 API:

### POST /api/crawl
**크롤링 실행**

요청:
```json
{
  "complexNumbers": ["22065", "12345"]
}
```

응답:
```json
{
  "success": true,
  "message": "크롤링이 완료되었습니다.",
  "results": [...]
}
```

---

### GET /api/results
**결과 조회**

응답:
```json
{
  "results": [
    {
      "filename": "complexes_5_20251012_165039.json",
      "size": 1234567,
      "created": "2025-10-12T16:50:39Z"
    }
  ],
  "total": 10
}
```

---

### GET /api/status
**시스템 상태**

응답:
```json
{
  "docker": {
    "imageExists": true,
    "containers": 1
  },
  "data": {
    "fileCount": 10
  },
  "status": "ready"
}
```

---

## 🐛 문제 해결

### 1. 웹 페이지가 열리지 않음

**증상**: `http://localhost:3000`에 접속 안 됨

**해결 방법**:
```bash
# 1. 서비스 상태 확인
docker-compose ps

# 2. 로그 확인
docker-compose logs web

# 3. 포트 충돌 확인
netstat -tuln | grep 3000

# 4. 재시작
docker-compose restart web
```

---

### 2. 크롤링이 실행되지 않음

**증상**: "크롤링 시작" 버튼 클릭해도 무반응

**해결 방법**:
```bash
# 1. Docker 이미지 확인
docker images | grep naver-crawler

# 2. Docker 소켓 권한 확인
ls -la /var/run/docker.sock

# 3. 컨테이너에서 Docker 접근 테스트
docker exec -it naver-crawler-web docker ps

# 4. 이미지 재빌드
docker-compose build --no-cache
```

---

### 3. 데이터가 저장되지 않음

**증상**: 크롤링은 완료되었으나 히스토리에 없음

**해결 방법**:
```bash
# 1. 디렉토리 권한 확인
ls -la crawled_data/ logs/

# 2. 볼륨 마운트 확인
docker inspect naver-crawler-web | grep Mounts -A 10

# 3. 디렉토리 생성
mkdir -p crawled_data logs
chmod 777 crawled_data logs

# 4. 재시작
docker-compose restart
```

---

### 4. 429 에러 (Too Many Requests)

**증상**: 크롤링 중 429 에러 발생

**해결 방법**:
- 이미 해결됨! (Playwright 헤드리스 브라우저 사용)
- 대기 시간 증가: `logic/nas_playwright_crawler.py` 수정
  ```python
  # API 대기 시간 증가
  await asyncio.sleep(2.0)  # 1.5 → 2.0
  ```

---

### 5. Docker 메모리 부족

**증상**: 컨테이너가 자주 종료됨

**해결 방법**:
```bash
# 1. Docker 메모리 제한 확인
docker stats

# 2. docker-compose.yml에 메모리 제한 추가
services:
  web:
    mem_limit: 2g
    memswap_limit: 2g

# 3. 불필요한 이미지/컨테이너 정리
docker system prune -a
```

---

## 💡 유용한 팁

### 1. 북마크 추가
자주 사용한다면 브라우저 북마크에 추가:
- Chrome: ⭐ 버튼 클릭
- Safari: 공유 → 홈 화면에 추가

### 2. 정기 크롤링 설정
Cron으로 자동 크롤링:
```bash
# crontab -e
0 9 * * * cd /volume1/code_work/nas_naver_crawler && ./scripts/crawl.sh 22065 >> logs/cron.log 2>&1
```
→ 매일 오전 9시에 자동 크롤링

### 3. 알림 설정
크롤링 완료 시 이메일 알림:
```bash
# 스크립트에 추가
echo "크롤링 완료" | mail -s "네이버 크롤러 알림" your@email.com
```

### 4. 데이터 백업
주기적으로 크롤링 결과 백업:
```bash
# 백업 스크립트
tar -czf backup_$(date +%Y%m%d).tar.gz crawled_data/
```

---

## 📚 다음 단계

### 학습 순서
1. ✅ **현재**: 웹 UI로 크롤링 실행 및 결과 확인
2. 📖 **다음**: [README.md](../README.md) - 프로젝트 전체 개요
3. 🔧 **심화**: [PERFORMANCE.md](PERFORMANCE.md) - 성능 최적화
4. 🚀 **개발**: [TODO.md](../TODO.md) - 개발 로드맵

### 고급 사용법
- **CLI 크롤링**: `./scripts/crawl.sh` 활용
- **개발 모드**: [QUICK_DEPLOY.md](QUICK_DEPLOY.md) 참조
- **NAS 최적화**: [README_NAS.md](README_NAS.md) 참조
- **커스터마이징**: 코드 수정 및 기여

---

## 🆘 추가 도움말

### 문서 목록
- [README.md](../README.md) - 프로젝트 메인
- [TODO.md](../TODO.md) - 개발 로드맵
- [CHANGELOG.md](CHANGELOG.md) - 변경 이력
- [PERFORMANCE.md](PERFORMANCE.md) - 성능 최적화
- [README_NAS.md](README_NAS.md) - NAS 환경 설정
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - 빠른 배포

### 커뮤니티
- 이슈 제보: GitHub Issues
- 기능 제안: GitHub Discussions
- 코드 기여: Pull Requests

---

**즐거운 크롤링 되세요! 🚀**
