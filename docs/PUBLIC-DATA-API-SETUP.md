# 공공데이터 실거래가 API 설정 가이드

실거래가 조회 기능을 사용하기 위해서는 공공데이터포털에서 API 키를 발급받아야 합니다.

## 🔑 API 키 발급받기

### 1. 공공데이터포털 접속
https://www.data.go.kr/

### 2. 회원가입 및 로그인
- 우측 상단 "로그인" 클릭
- 회원가입 진행 (일반/간편 인증)

### 3. 아파트 실거래가 API 신청

#### 방법 A: 직접 검색
1. 검색창에 "**아파트매매 실거래가**" 검색
2. "**아파트매매 실거래 상세 자료**" 선택
3. "활용신청" 버튼 클릭

#### 방법 B: 직접 URL 접속
https://www.data.go.kr/data/15057511/openapi.do

### 4. 활용 신청 정보 입력
1. **활용목적**: 개인 프로젝트 - 부동산 정보 수집 및 분석
2. **활용 분야**: 기타
3. **상세 기능**: 아파트 실거래가 조회 및 분석
4. **기간**: 1년 (최대 기간 선택 권장)

### 5. 즉시 승인 및 키 발급
- 대부분 즉시 승인됩니다
- "마이페이지 > 오픈API > 개발계정 상세보기"에서 키 확인

### 6. 인코딩 키 확인
**중요**: 반드시 **Decoding된 인증키**가 아닌 **Encoding된 인증키**를 사용해야 합니다!

```
❌ Decoding 키: abcd1234== (사용 불가)
✅ Encoding 키: abcd1234%3D%3D (사용)
```

---

## 🔧 NAS 서버 설정 방법

### 방법 1: sed로 한 줄에 수정 (권장 ⭐)

SSH로 NAS 접속 후 다음 명령어를 실행하세요:

```bash
cd /volume1/code_work/nas_naver_crawler

# 발급받은 인코딩 키로 YOUR_API_KEY_HERE 부분을 교체하세요
sed -i 's/PUBLIC_DATA_SERVICE_KEY=your_public_data_service_key_here/PUBLIC_DATA_SERVICE_KEY=YOUR_API_KEY_HERE/' config.env

# 확인
grep PUBLIC_DATA_SERVICE_KEY config.env

# Docker 재시작
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

**실제 예시 (발급받은 키로 변경하세요):**
```bash
sed -i 's/PUBLIC_DATA_SERVICE_KEY=your_public_data_service_key_here/PUBLIC_DATA_SERVICE_KEY=abcd1234%3D%3D/' config.env
```

### 방법 2: 직접 편집

```bash
cd /volume1/code_work/nas_naver_crawler
vi config.env
```

다음 줄을 찾아서 수정:
```env
# 수정 전
PUBLIC_DATA_SERVICE_KEY=your_public_data_service_key_here

# 수정 후 (발급받은 인코딩 키로 교체)
PUBLIC_DATA_SERVICE_KEY=abcd1234%3D%3D
```

저장 후 Docker 재시작:
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

---

## ✅ 설정 확인

### 1. 환경변수 확인
```bash
docker-compose -f docker-compose.dev.yml exec web printenv | grep PUBLIC_DATA
```

출력 예시:
```
PUBLIC_DATA_SERVICE_KEY=abcd1234%3D%3D
```

### 2. 로그 확인
```bash
docker-compose -f docker-compose.dev.yml logs -f web | grep "Real Price"
```

성공 시 로그:
```
[Real Price] Using SGIS lawdCd: 31240 for 동탄시범다은마을월드메르디앙반도유보라
✅ Fetched 15 real price records
```

### 3. 웹 UI에서 확인
1. 단지 목록에서 아무 단지 클릭
2. "실거래가" 탭 클릭
3. 실거래가 데이터가 표시되는지 확인

---

## 🚨 문제 해결

### 문제 1: "PUBLIC_DATA_SERVICE_KEY is not configured"
**원인**: 환경변수가 설정되지 않음

**해결**:
1. `config.env` 파일 확인
2. Docker 컨테이너 재시작
3. 환경변수 확인 명령어 실행

### 문제 2: "SERVICE_KEY_IS_NOT_REGISTERED_ERROR"
**원인**:
- Decoding 키를 사용함 (잘못된 키)
- API 신청이 승인되지 않음

**해결**:
1. 공공데이터포털에서 **Encoding 키** 다시 확인
2. 마이페이지에서 API 승인 상태 확인
3. 키 재발급 시도

### 문제 3: "LIMIT_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR"
**원인**: 트래픽 제한 초과 (일일 1,000건)

**해결**:
- 내일 다시 시도
- 여러 개월 데이터를 한번에 조회하지 말고 나눠서 조회
- Rate limiting 기능이 자동으로 적용됨 (500ms 대기)

### 문제 4: 실거래가 데이터가 없음
**원인**:
- 최근 거래가 없는 단지
- 법정동코드가 정확하지 않음

**해결**:
1. 다른 단지에서 테스트
2. 단지 상세페이지를 열어서 자동 역지오코딩 실행
3. 배치 스크립트로 모든 단지 역지오코딩:
   ```bash
   docker-compose -f docker-compose.dev.yml exec web npx tsx scripts/geocode-existing-complexes.ts
   ```

---

## 📚 참고 자료

- [공공데이터포털](https://www.data.go.kr/)
- [아파트매매 실거래 상세 자료 API](https://www.data.go.kr/data/15057511/openapi.do)
- [SGIS API 설정 가이드](./SGIS-SETUP.md)

---

## 💡 추가 정보

### API 호출 제한
- **일일 트래픽**: 1,000건
- **Rate limiting**: 자동으로 500ms 대기 적용됨

### 지원 데이터
- 아파트 매매 실거래가
- 최근 12개월 데이터 조회 가능
- 법정동 코드 기반 검색

### 자동화 기능
- ✅ 크롤링 시 자동 역지오코딩 (좌표 → 법정동코드)
- ✅ 단지 상세페이지 로드 시 자동 역지오코딩
- ✅ 실거래가 탭에서 자동 조회
- ✅ Rate limiting으로 API 제한 방지
