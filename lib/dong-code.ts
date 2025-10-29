/**
 * 법정동코드 조회 유틸리티
 *
 * 데이터 소스: dong_code_active.txt (행정안전부 법정동코드 전체자료)
 * 형식: 10자리 법정동코드 + 법정동명
 *
 * 공공데이터 API는 5자리 시군구코드를 사용하므로 앞 5자리만 추출
 */

import fs from 'fs';
import path from 'path';

export interface DongCodeEntry {
  fullCode: string;      // 10자리 전체 법정동코드
  sidoCode: string;      // 2자리 시도코드
  sggCode: string;       // 5자리 시군구코드 (API에서 사용)
  dongCode: string;      // 8자리 읍면동코드
  dongName: string;      // 법정동명 (전체 주소)
  sido: string;          // 시도명만
  sigungu: string;       // 시군구명만
  dongOnly: string;      // 동명만
}

/**
 * 법정동코드 데이터 캐시
 */
let dongCodeCache: DongCodeEntry[] | null = null;

/**
 * dong_code_active.txt 파일 로드 및 파싱
 */
export function loadDongCodeData(): DongCodeEntry[] {
  if (dongCodeCache) {
    return dongCodeCache;
  }

  const filePath = path.join(process.cwd(), 'dong_code_active.txt');

  if (!fs.existsSync(filePath)) {
    console.warn('[DongCode] dong_code_active.txt 파일을 찾을 수 없습니다.');
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    dongCodeCache = lines
      .slice(1) // 헤더 제외
      .filter(line => line.trim())
      .map(line => {
        const [fullCode, dongName] = line.split('\t').map(s => s.trim());

        if (!fullCode || !dongName || fullCode.length !== 10) {
          return null;
        }

        // 주소 파싱 (예: "서울특별시 종로구 청운동", "경기도 수원시 장안구 파장동")
        const parts = dongName.split(' ');
        const sido = parts[0] || '';
        const sigungu = parts[1] || '';

        // dongOnly 추출: 마지막 토큰만 (동/읍/면 이름)
        // 예: "경기도 수원시 장안구 파장동" → "파장동"
        // 예: "경기도 광명시 광명동" → "광명동"
        const dongOnly = parts[parts.length - 1] || '';

        return {
          fullCode,
          sidoCode: fullCode.substring(0, 2),
          sggCode: fullCode.substring(0, 5),
          dongCode: fullCode.substring(0, 8),
          dongName,
          sido,
          sigungu,
          dongOnly,
        };
      })
      .filter((entry): entry is DongCodeEntry => entry !== null);

    console.log(`[DongCode] 법정동코드 ${dongCodeCache.length}개 로드 완료`);
    return dongCodeCache;
  } catch (error) {
    console.error('[DongCode] 파일 로드 실패:', error);
    return [];
  }
}

/**
 * 법정동명으로 코드 검색 (시군구까지만)
 * 예: "서울특별시 강남구" -> "11680"
 */
export function findSggCodeByName(dongName: string): string | null {
  const data = loadDongCodeData();

  if (!dongName) return null;

  // 공백 제거하고 정규화
  const normalized = dongName.replace(/\s+/g, '').toLowerCase();

  // 정확히 일치하는 항목 찾기 (시군구까지)
  const exact = data.find(entry => {
    const entryNormalized = `${entry.sido}${entry.sigungu}`.replace(/\s+/g, '').toLowerCase();
    return entryNormalized === normalized;
  });

  if (exact) {
    return exact.sggCode;
  }

  // 부분 일치 (시도 + 시군구 포함)
  const partial = data.find(entry => {
    const entryNormalized = entry.dongName.replace(/\s+/g, '').toLowerCase();
    return entryNormalized.includes(normalized) || normalized.includes(entryNormalized);
  });

  return partial ? partial.sggCode : null;
}

/**
 * 법정동명으로 코드 검색 (읍면동까지)
 * 예: "서울특별시 강남구 역삼동" -> "11680105"
 */
export function findDongCodeByName(dongName: string): string | null {
  const data = loadDongCodeData();

  if (!dongName) return null;

  // 공백 제거하고 정규화
  const normalized = dongName.replace(/\s+/g, '').toLowerCase();

  // 정확히 일치하는 항목 찾기
  const exact = data.find(entry => {
    const entryNormalized = entry.dongName.replace(/\s+/g, '').toLowerCase();
    return entryNormalized === normalized;
  });

  if (exact) {
    return exact.dongCode;
  }

  // 부분 일치
  const partial = data.find(entry => {
    const entryNormalized = entry.dongName.replace(/\s+/g, '').toLowerCase();
    return entryNormalized.includes(normalized);
  });

  return partial ? partial.dongCode : null;
}

/**
 * 주소 문자열에서 법정동코드 추출 (스마트 검색)
 *
 * 우선순위:
 * 1. "시도 + 시군구 + 읍면동" 모두 일치
 * 2. "시도 + 시군구" 일치
 * 3. "시군구" 일치
 *
 * @param address 전체 주소 (예: "서울 강남구 역삼동 123-45")
 * @returns 5자리 시군구코드 (API 호출용)
 */
export function extractSggCodeFromAddress(address: string): string | null {
  if (!address) return null;

  const data = loadDongCodeData();
  const normalized = address.replace(/\s+/g, '').toLowerCase();

  // 1순위: 읍면동까지 포함된 가장 구체적인 주소
  for (const entry of data) {
    const fullAddr = entry.dongName.replace(/\s+/g, '').toLowerCase();
    if (normalized.includes(fullAddr)) {
      return entry.sggCode;
    }
  }

  // 2순위: 시군구까지만
  for (const entry of data) {
    const sggAddr = `${entry.sido}${entry.sigungu}`.replace(/\s+/g, '').toLowerCase();
    if (normalized.includes(sggAddr)) {
      return entry.sggCode;
    }
  }

  // 3순위: 시군구명만으로 검색
  for (const entry of data) {
    const sggOnly = entry.sigungu.replace(/\s+/g, '').toLowerCase();
    if (sggOnly && normalized.includes(sggOnly)) {
      return entry.sggCode;
    }
  }

  return null;
}

/**
 * 좌표 기반 지오코딩 API 응답에서 법정동코드 추출
 *
 * @param geocodeResult Kakao/Naver 지오코딩 API 응답
 * @returns 5자리 시군구코드
 */
export interface GeocodeAddressComponents {
  sido?: string;
  sigungu?: string;
  dong?: string;
  fullAddress?: string;
}

export function extractSggCodeFromGeocode(
  components: GeocodeAddressComponents
): string | null {
  // 전체 주소가 있으면 우선 사용
  if (components.fullAddress) {
    const code = extractSggCodeFromAddress(components.fullAddress);
    if (code) return code;
  }

  // 컴포넌트 조합으로 검색
  if (components.sido && components.sigungu) {
    const searchQuery = components.dong
      ? `${components.sido} ${components.sigungu} ${components.dong}`
      : `${components.sido} ${components.sigungu}`;

    return findSggCodeByName(searchQuery);
  }

  return null;
}

/**
 * 법정동코드 유효성 검증
 */
export function isValidSggCode(code: string): boolean {
  if (!code || code.length !== 5) return false;
  if (!/^\d{5}$/.test(code)) return false;

  const data = loadDongCodeData();
  return data.some(entry => entry.sggCode === code);
}

/**
 * 법정동코드로 지역명 조회
 */
export function getDongNameByCode(sggCode: string): string | null {
  const data = loadDongCodeData();
  const entry = data.find(e => e.sggCode === sggCode);

  if (!entry) return null;

  // 시군구명만 반환 (예: "서울특별시 강남구")
  return `${entry.sido} ${entry.sigungu}`;
}

/**
 * 사용 예시:
 *
 * ```typescript
 * // 1. 주소에서 법정동코드 추출
 * const code = extractSggCodeFromAddress("서울 강남구 역삼동 테헤란로 123");
 * console.log(code); // "11680"
 *
 * // 2. 법정동명으로 검색
 * const code2 = findSggCodeByName("서울특별시 강남구");
 * console.log(code2); // "11680"
 *
 * // 3. 지오코딩 결과에서 추출
 * const geocodeResult = {
 *   sido: "서울특별시",
 *   sigungu: "강남구",
 *   dong: "역삼동",
 *   fullAddress: "서울 강남구 역삼동"
 * };
 * const code3 = extractSggCodeFromGeocode(geocodeResult);
 *
 * // 4. 유효성 검증
 * const isValid = isValidSggCode("11680"); // true
 *
 * // 5. 코드로 지역명 조회
 * const name = getDongNameByCode("11680"); // "서울특별시 강남구"
 * ```
 */
