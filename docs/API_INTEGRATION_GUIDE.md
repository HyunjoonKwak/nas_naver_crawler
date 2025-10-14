# 국가 API 연동 가이드

## 📋 개요

이 문서는 **실거래가 크롤링**과 **위도/경도 기반 행정구역 추출** 기능을 위한 국가 API 연동 가이드입니다.

**현재 상태**: 코드 레벨 구현 완료, API 복구 대기 중

---

## 🔑 필요한 API 키

### 1. 통계청 SGIS API (역지오코딩)
- **용도**: 위도/경도 → 법정동/행정동 변환
- **발급 사이트**: https://sgis.kostat.go.kr/developer/
- **필요 정보**:
  - Service ID (Consumer Key)
  - Security Key (Consumer Secret)

### 2. 공공데이터포털 실거래가 API
- **용도**: 아파트 실거래가 조회
- **발급 사이트**: https://www.data.go.kr/
- **API 이름**: "아파트매매 실거래 상세 자료"
- **필요 정보**:
  - 일반 인증키 (Encoding)

---

## 📝 API 키 발급 방법

### ✅ SGIS API 키 발급

```
1. https://sgis.kostat.go.kr/developer/ 접속
2. 회원가입 (무료)
3. 로그인 후 "서비스 신청" 메뉴
4. "통계지리정보서비스" 선택
5. 신청서 작성 (사용 목적: 개인 연구/학습)
6. 승인 후 "내 서비스" 메뉴에서 키 확인
   - Consumer Key → SGIS_SERVICE_ID
   - Consumer Secret → SGIS_SECURITY_KEY
```

### ✅ 공공데이터포털 API 키 발급

```
1. https://www.data.go.kr/ 접속
2. 회원가입 (무료)
3. 검색: "아파트매매 실거래 상세 자료"
4. 데이터 상세 페이지에서 "활용신청" 클릭
5. 신청서 작성
   - 용도: 개인연구/학습
   - 상세목적: 네이버 부동산 크롤링 데이터와 실거래가 비교 분석
6. 신청 완료 후 승인 대기 (보통 1-2일 소요)
7. 승인 후 "마이페이지" → "오픈API" 메뉴에서 키 확인
   - 일반 인증키 (Encoding) → MOLIT_SERVICE_KEY
```

**주의**: 공공데이터포털은 승인이 필요하며, 시스템 점검이 잦습니다.

---

## ⚙️ 환경 변수 설정

### 1. config.env 파일 수정

```env
# ===== 국가 API 설정 =====

# 1. 통계청 SGIS API (역지오코딩)
SGIS_SERVICE_ID=your_actual_service_id
SGIS_SECURITY_KEY=your_actual_security_key

# 2. 공공데이터포털 실거래가 API
MOLIT_SERVICE_KEY=your_actual_service_key
```

### 2. .env 파일로 복사 (프로덕션)

```bash
cp config.env .env
```

### 3. Docker 환경인 경우

```bash
# Docker 컨테이너 재시작
docker-compose down
docker-compose up -d

# 환경 변수 확인
docker-compose exec web env | grep SGIS
docker-compose exec web env | grep MOLIT
```

---

## 🔍 기능별 상세 설명

### 1️⃣ 역지오코딩 (위도/경도 → 행정구역)

#### **API 엔드포인트**
```
GET /api/geocode?latitude=37.5665&longitude=126.9780
```

#### **요청 파라미터**
- `latitude` (필수): 위도
- `longitude` (필수): 경도

#### **응답 예시**
```json
{
  "success": true,
  "coordinates": {
    "latitude": 37.5665,
    "longitude": 126.9780
  },
  "address": {
    "sido": "서울특별시",
    "sigungu": "중구",
    "dong": "을지로동",
    "beopjungdong": "을지로동",
    "haengjeongdong": "을지로동",
    "fullAddress": "서울특별시 중구 을지로동",
    "sidoCode": "11",
    "sigunguCode": "110",
    "dongCode": "51500"
  }
}
```

#### **사용 예시**
```typescript
// 단지의 위도/경도로 행정구역 조회
const response = await fetch(
  `/api/geocode?latitude=${complex.latitude}&longitude=${complex.longitude}`
);
const data = await response.json();

if (data.success) {
  console.log('행정구역:', data.address.fullAddress);
  console.log('법정동코드:', data.address.dongCode);
}
```

#### **에러 케이스**
```json
// API 키 미설정
{
  "error": "SGIS API 키가 설정되지 않았습니다.",
  "message": ".env 파일에서 SGIS_SERVICE_ID와 SGIS_SECURITY_KEY를 설정해주세요."
}

// 좌표 오류
{
  "error": "위도(latitude)와 경도(longitude)가 필요합니다."
}
```

---

### 2️⃣ 실거래가 조회

#### **API 엔드포인트**
```
GET /api/real-price?complexNo=12345&complexName=래미안아파트&lawdCd=11110&period=6m
```

#### **요청 파라미터**
- `complexNo` (필수): 단지번호
- `complexName` (선택): 단지명 (필터링용)
- `lawdCd` (선택): 법정동코드 5자리
- `period` (선택): 조회 기간
  - `1m`: 최근 1개월
  - `3m`: 최근 3개월
  - `6m`: 최근 6개월 (기본값)
  - `1y`: 최근 1년
  - `all`: 최근 2년
- `mock` (선택): `true`로 설정 시 강제 Mock 모드

#### **응답 예시**
```json
{
  "success": true,
  "complexNo": "12345",
  "complexName": "래미안아파트",
  "lawdCd": "11110",
  "period": "6m",
  "dataSource": "api",  // 'api' 또는 'mock'
  "apiStatus": "공공데이터포털 연동 성공",
  "data": {
    "transactions": [
      {
        "transactionDate": "2024-01-15",
        "dong": "101동",
        "ho": "1001",
        "area": 84.9,
        "areaType": "25평형",
        "floor": 10,
        "price": 350000000,
        "pricePerArea": 4122109,
        "tradeType": "A1",
        "buildYear": 2021
      }
    ],
    "areaStats": [
      {
        "areaType": "25평형",
        "avgPrice": 350000000,
        "maxPrice": 380000000,
        "minPrice": 320000000,
        "transactionCount": 15
      }
    ],
    "chartData": [
      {
        "month": "2024.01",
        "avgPrice": 350000000,
        "maxPrice": 380000000,
        "minPrice": 320000000
      }
    ]
  }
}
```

#### **Mock 모드 (API 키 없을 때)**
```json
{
  "success": true,
  "complexNo": "12345",
  "period": "6m",
  "dataSource": "mock",
  "apiStatus": "MOLIT_SERVICE_KEY 환경변수 미설정 - config.env 확인 필요",
  "data": {
    // Mock 데이터 반환
  }
}
```

#### **사용 예시**
```typescript
// 실거래가 조회
const response = await fetch(
  `/api/real-price?` +
  `complexNo=${complexNo}&` +
  `complexName=${encodeURIComponent(complexName)}&` +
  `lawdCd=${lawdCode}&` +
  `period=6m`
);

const data = await response.json();

if (data.success) {
  console.log('데이터 소스:', data.dataSource);  // 'api' or 'mock'
  console.log('거래 건수:', data.data.transactions.length);

  if (data.dataSource === 'mock') {
    console.warn('⚠️ Mock 데이터 사용 중:', data.apiStatus);
  }
}
```

---

## 🔗 통합 시나리오

### 시나리오 1: 단지 상세 페이지에서 실거래가 표시

```typescript
// 1. 단지 정보 가져오기
const complex = await fetch(`/api/complexes/${complexNo}`);
const { latitude, longitude, complexName } = await complex.json();

// 2. 역지오코딩으로 법정동코드 가져오기
const geocode = await fetch(
  `/api/geocode?latitude=${latitude}&longitude=${longitude}`
);
const { address } = await geocode.json();
const lawdCd = address.dongCode?.substring(0, 5);  // 5자리만 사용

// 3. 실거래가 조회
const realPrice = await fetch(
  `/api/real-price?` +
  `complexNo=${complexNo}&` +
  `complexName=${encodeURIComponent(complexName)}&` +
  `lawdCd=${lawdCd}&` +
  `period=6m`
);

const priceData = await realPrice.json();

// 4. UI에 표시
if (priceData.dataSource === 'api') {
  // 실제 데이터 표시
  displayRealPriceChart(priceData.data);
} else {
  // Mock 데이터 표시 + 경고
  displayMockData(priceData.data, priceData.apiStatus);
}
```

### 시나리오 2: 크롤링 후 자동 지오코딩

```typescript
// /api/crawl/route.ts에서 크롤링 완료 후

// 각 단지마다 지오코딩 실행
for (const complex of complexes) {
  if (complex.latitude && complex.longitude) {
    try {
      const geocode = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/geocode?` +
        `latitude=${complex.latitude}&` +
        `longitude=${complex.longitude}`
      );

      const data = await geocode.json();

      if (data.success) {
        // DB 업데이트
        await prisma.complex.update({
          where: { id: complex.id },
          data: {
            beopjungdong: data.address.beopjungdong,
            haengjeongdong: data.address.haengjeongdong,
            sidoCode: data.address.sidoCode,
            sigunguCode: data.address.sigunguCode,
            dongCode: data.address.dongCode,
          }
        });

        console.log(`✅ ${complex.complexName} 지오코딩 완료`);
      }
    } catch (error) {
      console.error(`❌ ${complex.complexName} 지오코딩 실패:`, error);
    }
  }
}
```

---

## 🧪 테스트 방법

### 1. 역지오코딩 테스트

```bash
# 서울시청 좌표로 테스트
curl "http://localhost:3000/api/geocode?latitude=37.5665&longitude=126.9780"

# 예상 결과: 서울특별시 중구 태평로1가
```

### 2. 실거래가 API 테스트

```bash
# Mock 모드 (API 키 없어도 동작)
curl "http://localhost:3000/api/real-price?complexNo=22065&mock=true"

# 실제 API 모드 (API 키 필요)
curl "http://localhost:3000/api/real-price?complexNo=22065&complexName=래미안&lawdCd=11110"
```

### 3. 브라우저에서 테스트

```
1. 단지 상세 페이지 접속
2. 브라우저 개발자 도구 → 콘솔 탭
3. 실거래가 API 호출 로그 확인:
   [Real Price API] Mock 데이터 사용
   또는
   [Real Price API] 실제 API 조회 시작
```

---

## 🔧 트러블슈팅

### ❌ "SGIS API 키가 설정되지 않았습니다"

**원인**: 환경 변수 미설정

**해결**:
```bash
# 1. config.env 확인
cat config.env | grep SGIS

# 2. 키 설정 후 재시작
docker-compose restart

# 3. 환경 변수 확인
docker-compose exec web env | grep SGIS
```

### ❌ "SGIS 인증 오류: Invalid consumer_key"

**원인**: 잘못된 API 키

**해결**:
1. SGIS 개발자 센터에서 키 재확인
2. config.env에 정확히 복사
3. 공백이나 특수문자 확인

### ❌ "법정동코드 없음 - 지오코딩 먼저 실행 필요"

**원인**: DB에 법정동코드가 없음

**해결**:
1. 크롤링 먼저 실행 (위도/경도 수집)
2. 지오코딩 API 호출
3. DB 업데이트
4. 실거래가 API 재호출

### ❌ 공공데이터포털 API 응답 없음

**원인**: 시스템 점검 또는 서비스 장애

**해결**:
- Mock 모드로 전환 (자동 폴백됨)
- 공지사항 확인: https://www.data.go.kr/
- 나중에 재시도

---

## 📊 API 복구 후 체크리스트

### ✅ 복구 확인

- [ ] 1. SGIS 개발자 센터 접속 확인
- [ ] 2. API 키 발급/재발급
- [ ] 3. config.env 설정
- [ ] 4. 서버 재시작
- [ ] 5. 역지오코딩 테스트 (curl)
- [ ] 6. 실거래가 API 테스트 (curl)
- [ ] 7. 단지 상세 페이지에서 실거래가 표시 확인
- [ ] 8. 크롤링 후 자동 지오코딩 동작 확인

### ✅ 성능 모니터링

```bash
# API 호출 로그 확인
docker-compose logs -f web | grep "\[SGIS\|MOLIT\]"

# 성공/실패 카운트
docker-compose logs web | grep "SGIS.*✅" | wc -l
docker-compose logs web | grep "SGIS.*❌" | wc -l
```

---

## 💡 개발 팁

### 1. 개발 중에는 Mock 모드 사용

```typescript
// API 호출 시 mock=true 파라미터 추가
const url = `/api/real-price?complexNo=${complexNo}&mock=true`;
```

### 2. API 호출 제한 고려

```
- SGIS: 하루 1,000건 (무료)
- 공공데이터포털: 하루 10,000건 (일반 인증키)
```

### 3. 캐싱 활용

```typescript
// AccessToken 캐싱 (이미 구현됨)
// - SGIS: 4시간 캐시
// - 실거래가: 필요시 Redis 등 도입 고려
```

---

## 📚 참고 자료

- SGIS API 문서: https://sgis.kostat.go.kr/developer/html/newOpenApi/api/dataApi/addressBoundary.html
- 공공데이터포털: https://www.data.go.kr/
- 국토교통부 실거래가 API: https://www.data.go.kr/data/15058747/openapi.do

---

**작성일**: 2024-01-15
**최종 업데이트**: API 복구 대기 중
**상태**: 코드 구현 완료, 테스트 대기
