# 실거래가 검색 기능 가이드

## 📋 개요

공공데이터포털의 **국토교통부 아파트 실거래가 API**를 연동하여 아파트 거래 정보를 조회하는 기능입니다.

## 🎯 주요 기능

### 1. 실거래가 검색 페이지 (`/real-price`)
- 법정동코드와 거래년월 기반 검색
- 아파트명 필터링
- 실거래가 데이터 테이블 뷰
- 거래금액, 면적, 층수, 주소 등 상세 정보 표시

### 2. API 엔드포인트

#### `/api/real-price/search`
지역 및 기간 기반 실거래가 검색

**파라미터:**
- `lawdCd` (필수): 법정동코드 (5자리)
- `dealYmd` (필수): 거래년월 (YYYYMM)
- `aptName` (선택): 아파트명 필터
- `pageNo` (선택): 페이지 번호
- `numOfRows` (선택): 페이지당 결과 수

**예시:**
```bash
GET /api/real-price/search?lawdCd=11110&dealYmd=202501&aptName=래미안
```

#### `/api/real-price/complex`
특정 단지의 실거래가 조회 (최근 N개월)

**파라미터:**
- `complexNo` (필수): 네이버 단지 번호
- `months` (선택): 조회 개월 수 (기본: 3, 최대: 12)

**예시:**
```bash
GET /api/real-price/complex?complexNo=12345&months=6
```

## 🔧 설정 방법

### 1. 공공데이터포털 API 키 발급

1. [공공데이터포털](https://www.data.go.kr) 회원가입
2. **국토교통부 아파트매매 실거래 상세 자료** API 검색
   - URL: https://www.data.go.kr/data/15057511/openapi.do
3. **활용신청** 클릭
   - 활용목적: 개발
   - 인증키 발급 방식: **Decoding** (중요!)
4. 승인 완료 후 인증키 확인

### 2. 환경변수 설정

`.env` 파일에 API 키 추가:

```bash
PUBLIC_DATA_SERVICE_KEY="YOUR_API_KEY_HERE"
```

**주의사항:**
- API 키는 Decoding 방식으로 발급받은 키를 사용해야 합니다
- Encoding 방식 키는 URL 인코딩 문제가 발생할 수 있습니다

### 3. 법정동코드 확인

법정동코드는 [행정표준코드관리시스템](https://www.code.go.kr/stdcode/regCodeL.do)에서 확인할 수 있습니다.

**주요 서울시 법정동코드:**
- 종로구: 11110
- 중구: 11140
- 용산구: 11170
- 강남구: 11680
- 송파구: 11710
- 강동구: 11740

## 💻 사용 예시

### 프론트엔드에서 사용

```typescript
// 1. 지역 검색
const searchRealPrice = async () => {
  const params = new URLSearchParams({
    lawdCd: '11110',    // 종로구
    dealYmd: '202501',  // 2025년 1월
    aptName: '래미안',
  });

  const response = await fetch(`/api/real-price/search?${params}`);
  const data = await response.json();

  console.log(data.data.items); // 실거래가 목록
};

// 2. 단지별 조회
const getComplexRealPrice = async (complexNo: string) => {
  const params = new URLSearchParams({
    complexNo,
    months: '6',  // 최근 6개월
  });

  const response = await fetch(`/api/real-price/complex?${params}`);
  const data = await response.json();

  console.log(data.data.items); // 단지 실거래가 목록
};
```

### 백엔드 라이브러리 사용

```typescript
import { getRealPriceApiClient } from '@/lib/real-price-api';

// API 클라이언트 가져오기
const client = getRealPriceApiClient();

// 단일 월 조회
const result = await client.search({
  lawdCd: '11110',
  dealYmd: '202501',
  pageNo: 1,
  numOfRows: 100,
});

// 특정 아파트 검색
const items = await client.searchByAptName('11110', '202501', '래미안');

// 시계열 조회 (최근 6개월)
const timeSeriesData = await client.searchMultipleMonths(
  '11110',
  '202408',
  '202501'
);
```

## 📊 응답 데이터 구조

```typescript
interface ProcessedRealPrice {
  // 거래 정보
  aptName: string;              // 아파트명
  dealPrice: number;            // 거래금액 (원)
  dealPriceFormatted: string;   // 거래금액 (억/만원)
  dealDate: string;             // 거래일자 (YYYY-MM-DD)

  // 위치 정보
  address: string;              // 주소
  dong: string;                 // 동명
  jibun: string;                // 지번

  // 건물 정보
  area: number;                 // 전용면적 (㎡)
  areaPyeong: number;           // 전용면적 (평)
  floor: number;                // 층수
  buildYear: number;            // 건축년도

  // 기타
  dealType: string;             // 거래유형
  pricePerPyeong: number;       // 평당 가격
}
```

## ⚠️ 제한사항 및 주의사항

### API 제한
- **Rate Limiting**: 과도한 요청 시 제한될 수 있음
  - 권장: 요청 간 0.5초 대기
  - 대량 수집 시 sleep 필수

- **데이터 범위**: 약 14~18개월 치 데이터 조회 가능
  - 오래된 데이터는 다른 API 사용 필요

### 지역 코드 매핑
- **현재 서울시만 지원**
  - `app/api/real-price/complex/route.ts`의 `getBeopjungdongCode()` 함수 참조
  - 전국 확장 시 법정동코드 DB 구축 필요

### 데이터 정확성
- 실거래가는 국토교통부 신고 데이터 기반
- 실시간 매물과 차이가 있을 수 있음
- 참고 용도로 활용 권장

## 🚀 향후 개선 계획

### 단기 (1-2주)
- [ ] 단지 상세 페이지에 실거래가 탭 추가
- [ ] 가격 추이 차트 (Recharts)
- [ ] CSV/Excel 내보내기

### 중기 (3-4주)
- [ ] Redis 캐싱 (API 호출 최소화)
- [ ] 전국 법정동코드 DB 구축
- [ ] 실거래가 vs 매물가 비교 뷰

### 장기 (1-2개월)
- [ ] 실거래가 알림 기능
- [ ] 가격 예측 모델 (선택)
- [ ] 지도 기반 실거래가 히트맵

## 📚 참고 자료

- [공공데이터포털](https://www.data.go.kr)
- [국토교통부 아파트 실거래가 API](https://www.data.go.kr/data/15057511/openapi.do)
- [행정표준코드관리시스템](https://www.code.go.kr/stdcode/regCodeL.do)
- [법정동코드 다운로드](https://www.code.go.kr/stdcode/regCodeL.do)

## 🐛 문제 해결

### Q: API 키 오류가 발생합니다
A:
1. `.env` 파일에 `PUBLIC_DATA_SERVICE_KEY`가 올바르게 설정되었는지 확인
2. API 키가 **Decoding 방식**으로 발급받은 키인지 확인
3. 공공데이터포털에서 활용신청이 승인되었는지 확인

### Q: "지원되지 않는 지역" 오류
A:
1. 현재 서울시만 지원합니다
2. 다른 지역 추가는 `app/api/real-price/complex/route.ts`의 `getBeopjungdongCode()` 함수에 매핑 추가 필요

### Q: 데이터가 조회되지 않습니다
A:
1. 법정동코드가 올바른지 확인 (5자리 숫자)
2. 거래년월 형식이 YYYYMM인지 확인
3. 해당 지역/기간에 실거래 데이터가 존재하는지 확인

### Q: Rate Limit 오류
A:
1. 요청 간격을 0.5초 이상 두세요
2. 대량 조회 시 `searchMultipleMonths()` 메서드 사용 (자동 대기 포함)

---

**작성일**: 2025-10-25
**버전**: v1.0.0
**작성자**: Claude Code
