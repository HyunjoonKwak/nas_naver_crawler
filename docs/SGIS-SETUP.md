# SGIS API 설정 가이드

역지오코딩 기능(좌표 → 법정동 변환)을 사용하기 위해서는 SGIS API 키가 필요합니다.

## 🔑 API 키 발급받기

### 1. SGIS 홈페이지 접속
https://sgis.kostat.go.kr/

### 2. 회원가입 및 로그인
- 우측 상단 "로그인" 클릭
- 회원가입 진행 (이메일 인증 필요)

### 3. 인증키 신청
1. 로그인 후 우측 상단 "마이페이지" 클릭
2. "인증키" 메뉴 클릭
3. "인증키 신청" 버튼 클릭
4. 서비스 정보 입력:
   - **서비스명**: 네이버 부동산 크롤러 (자유롭게 작성)
   - **서비스 URL**: http://localhost:3000 또는 실제 배포 URL
   - **서비스 설명**: 아파트 단지 법정동 정보 수집용
5. 신청 완료 후 즉시 발급됨

### 4. 키 확인
- **서비스 ID**: 예) `1fda8e6202ad463d91aa`
- **보안키**: 예) `b2b879daf06c47e8b500`

---

## 🔧 NAS 서버 설정 방법

### 방법 1: sed로 한 줄에 수정 (권장 ⭐)

SSH로 NAS 접속 후 다음 명령어를 복사-붙여넣기하세요:

```bash
cd /volume1/code_work/nas_naver_crawler
sed -i 's/SGIS_SERVICE_ID=your_service_id_here/SGIS_SERVICE_ID=YOUR_SERVICE_ID_HERE/' config.env
sed -i 's/SGIS_SECURITY_KEY=your_security_key_here/SGIS_SECURITY_KEY=YOUR_SECURITY_KEY_HERE/' config.env
grep SGIS config.env
docker-compose down && docker-compose up -d
```

**실제 예시 (발급받은 키로 변경하세요):**
```bash
cd /volume1/code_work/nas_naver_crawler
sed -i 's/SGIS_SERVICE_ID=your_service_id_here/SGIS_SERVICE_ID=1fda8e6202ad463d91aa/' config.env
sed -i 's/SGIS_SECURITY_KEY=your_security_key_here/SGIS_SECURITY_KEY=b2b879daf06c47e8b500/' config.env
grep SGIS config.env
docker-compose down && docker-compose up -d
```

> ⚠️ **중요**: NAS 환경에서는 `.env`가 아닌 **`config.env`** 파일을 수정해야 합니다!
> ⚠️ **주의**: `docker-compose restart`가 아닌 **`down` 후 `up`** 해야 환경 변수가 반영됩니다!

### 방법 2: 텍스트 에디터로 수정

```bash
# SSH로 NAS 접속
ssh your-nas-user@your-nas-ip

# 프로젝트 디렉토리로 이동
cd /volume1/code_work/nas_naver_crawler

# config.env 파일 편집
nano config.env
# 또는
vi config.env
```

33-34번 줄을 다음과 같이 수정:
```bash
SGIS_SERVICE_ID=1fda8e6202ad463d91aa
SGIS_SECURITY_KEY=b2b879daf06c47e8b500
```

저장 후:
```bash
docker-compose down
docker-compose up -d
```

---

## ✅ 설정 확인

### 1. 환경 변수 확인
```bash
docker-compose exec web printenv | grep SGIS
```

다음과 같이 출력되어야 합니다:
```
SGIS_SERVICE_ID=1fda8e6202ad463d91aa
SGIS_SECURITY_KEY=b2b879daf06c47e8b500
```

### 2. 로그 확인
```bash
docker-compose logs -f web | grep SGIS
```

**성공하면 이런 로그가 보입니다:**
```
[SGIS Auth] 🔑 새 AccessToken 발급 시작
[SGIS Auth] ✅ AccessToken 발급 성공
```

**실패하면 이런 로그가 보입니다:**
```
[SGIS Auth] ❌ 인증 실패: SGIS 인증 오류: 인증정보가 존재하지 않습니다 (코드: -401)
```

### 3. 크롤링 테스트
단지를 크롤링하고 로그에서 다음 메시지 확인:
```
✅ Geocoded: 래미안아파트 → 분당구 서현동
```

### 4. 상세 페이지 확인
단지 상세 페이지에서 "법정동" 정보가 표시되는지 확인

---

## 🚨 문제 해결

### 인증 실패 (-401)
1. **config.env 파일 확인**:
   ```bash
   grep SGIS /volume1/code_work/nas_naver_crawler/config.env
   ```

2. **환경 변수가 컨테이너에 로드되었는지 확인**:
   ```bash
   docker-compose exec web printenv | grep SGIS
   ```

3. **Docker 완전히 재시작**:
   ```bash
   cd /volume1/code_work/nas_naver_crawler
   docker-compose down
   docker-compose up -d
   ```

4. **SGIS 홈페이지에서 발급받은 키가 활성화되었는지 확인**

### your_service_id_here가 그대로 남아있음
- config.env 파일 수정이 제대로 되지 않았습니다
- 방법 2(텍스트 에디터)를 사용하여 수동으로 수정하세요

### 토큰 만료 (기존 토큰이 만료됨)
- 자동으로 재발급되므로 별도 조치 불필요
- 로그에 `[SGIS Auth] 🔑 새 AccessToken 발급 시작` 메시지 표시됨

### 할당량 초과
- SGIS API는 일일 호출 제한이 있을 수 있음
- 제한에 걸리면 다음 날 자동으로 복구
- 배치 스크립트는 300ms 간격으로 호출하여 제한 방지

---

## 📝 파일 구조 참고

```
nas_naver_crawler/
├── .env                    # 로컬 개발용 (Git 무시됨)
├── .env.example            # 환경 변수 템플릿
├── config.env              # NAS Docker용 (Git 추적됨) ⭐ 이것을 수정!
├── docker-compose.yml      # 프로덕션용
└── docker-compose.dev.yml  # 개발용
```

**중요**:
- 로컬 개발: `.env` 파일 사용
- NAS Docker: **`config.env`** 파일 사용 ⭐

---

## 📚 참고 자료

- **SGIS 홈페이지**: https://sgis.kostat.go.kr/
- **SGIS API 문서**: https://sgis.kostat.go.kr/developer/html/newOpenApi/api/dataApi/addressBoundary.html
- **역지오코딩 API**: `rgeocodewgs84` (WGS84 좌표계 → 주소 변환)

---

## 💡 추가 정보

### 역지오코딩이 사용되는 곳

1. **크롤링 시 자동 수행** (v2.12.2)
   - 신규 크롤링 시 자동으로 법정동 정보 수집
   - 파일: `app/api/crawl/route.ts`

2. **배치 스크립트** (v2.12.3)
   - 기존 단지 일괄 처리
   - 실행: `npx tsx scripts/geocode-existing-complexes.ts`

3. **상세 페이지 자동 처리** (v2.12.3)
   - 법정동이 없으면 페이지 로드 시 자동 수행
   - 파일: `app/complex/[complexNo]/page.tsx`

### 왜 필요한가?

실거래가 조회 API(공공데이터포털)는 **법정동 코드**를 필수로 요구합니다.
- 네이버 API는 법정동 코드를 제공하지 않음
- 좌표(위도/경도)만 제공됨
- SGIS API로 좌표 → 법정동 변환 필요

### 환경 변수 이름

코드에서 사용하는 환경 변수:
- `SGIS_SERVICE_ID` (서비스 ID)
- `SGIS_SECURITY_KEY` (보안키)

파일: `app/api/geocode/route.ts`

---

**작성일**: 2025-10-26
**버전**: v2.12.3
**업데이트**: config.env 파일 사용 명시
