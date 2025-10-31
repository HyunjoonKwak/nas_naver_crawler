import { NextRequest, NextResponse } from 'next/server';
import { extractSggCodeFromGeocode } from '@/lib/dong-code';
import { ApiResponseHelper } from '@/lib/api-response';
import { ApiError, ErrorType } from '@/lib/api-error';
import { createLogger } from '@/lib/logger';

const logger = createLogger('API_GEOCODE');

// Kakao Reverse Geocoding 응답 구조
interface KakaoReverseGeocodeResponse {
  meta: {
    total_count: number;
  };
  documents: Array<{
    address: {
      address_name: string;         // 전체 지번 주소
      region_1depth_name: string;   // 시도
      region_2depth_name: string;   // 시군구
      region_3depth_name: string;   // 읍면동
      region_3depth_h_name: string; // 행정동명
      h_code: string;               // 행정동코드
      b_code: string;               // 법정동코드 (10자리)
      mountain_yn: string;          // 산 여부
      main_address_no: string;      // 지번 본번
      sub_address_no: string;       // 지번 부번
      x: string;                    // 경도
      y: string;                    // 위도
    };
    road_address?: {
      address_name: string;         // 전체 도로명 주소
      region_1depth_name: string;   // 시도
      region_2depth_name: string;   // 시군구
      region_3depth_name: string;   // 읍면동
      road_name: string;            // 도로명
      underground_yn: string;       // 지하 여부
      main_building_no: string;     // 건물 본번
      sub_building_no: string;      // 건물 부번
      building_name: string;        // 건물명
      zone_no: string;              // 우편번호
      x: string;                    // 경도
      y: string;                    // 위도
    };
  }>;
}

interface AddressInfo {
  roadAddress?: string;
  jibunAddress?: string;
  sido?: string;          // 시/도
  sigungu?: string;       // 시/군/구
  dong?: string;          // 동/읍/면
  ri?: string;            // 리
  beopjungdong?: string;  // 법정동명
  haengjeongdong?: string; // 행정동명
  fullAddress?: string;
  sidoCode?: string;      // 시도코드 (2자리)
  sigunguCode?: string;   // 시군구코드 (3자리)
  dongCode?: string;      // 읍면동코드 (3자리)
  lawdCd?: string | null; // 법정동코드 (시도+시군구 = 5자리)
}

export const dynamic = 'force-dynamic';

export const GET = ApiResponseHelper.handler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');

  if (!latitude || !longitude) {
    throw new ApiError(ErrorType.VALIDATION, '위도(latitude)와 경도(longitude)가 필요합니다.', 400);
  }

  // 환경 변수에서 Kakao REST API 키 가져오기
  const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    throw new ApiError(
      ErrorType.INTERNAL,
      'Kakao REST API 키가 설정되지 않았습니다. config.env 파일에서 KAKAO_REST_API_KEY를 설정해주세요.',
      500
    );
  }

  // Kakao Reverse Geocoding API 호출
  const apiUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`;

  logger.info('Reverse geocoding request', { latitude, longitude });

  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `KakaoAK ${kakaoApiKey}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Kakao API error', { status: response.status, response: errorText });
    throw new ApiError(
      ErrorType.EXTERNAL_API,
      `Kakao Reverse Geocoding API 호출 실패: ${errorText}`,
      response.status
    );
  }

  const data: KakaoReverseGeocodeResponse = await response.json();

  logger.info('Kakao API response received', { resultCount: data.documents?.length || 0 });

  // 결과 파싱
  const addressInfo: AddressInfo = {};

  if (data.documents && data.documents.length > 0) {
    const doc = data.documents[0];
    const addr = doc.address;
    const roadAddr = doc.road_address;

    logger.debug('Kakao response data', { document: doc });

    // Kakao API는 b_code를 제공하지 않으므로 dong-code.ts 유틸리티 사용
    const lawdCd = extractSggCodeFromGeocode({
      sido: addr.region_1depth_name,
      sigungu: addr.region_2depth_name,
      dong: addr.region_3depth_name,
      fullAddress: addr.address_name
    });

    if (!lawdCd) {
      logger.warn('Lawdong code matching failed', {
        sido: addr.region_1depth_name,
        sigungu: addr.region_2depth_name,
        dong: addr.region_3depth_name,
        fullAddress: addr.address_name
      });
    } else {
      logger.info('Lawdong code matched', { lawdCd });
    }

      const fullLawdCd = lawdCd ? `${lawdCd}00000` : '0000000000'; // 5자리 → 10자리 확장

      // 주소 정보
      addressInfo.sido = addr.region_1depth_name;
      addressInfo.sigungu = addr.region_2depth_name;
      addressInfo.dong = addr.region_3depth_name; // 법정동명

      // 법정동코드
      addressInfo.lawdCd = lawdCd;
      addressInfo.sidoCode = fullLawdCd.substring(0, 2);
      addressInfo.sigunguCode = fullLawdCd.substring(2, 5);
      addressInfo.dongCode = fullLawdCd.substring(5, 8);

      // 법정동/행정동
      addressInfo.beopjungdong = addr.region_3depth_name; // 법정동명
      addressInfo.haengjeongdong = addr.region_3depth_h_name; // 행정동명

      // 지번 주소
      addressInfo.jibunAddress = addr.address_name;

      // 도로명 주소
      if (roadAddr) {
        addressInfo.roadAddress = roadAddr.address_name;
      }

    // 전체 주소 (지번 주소 사용)
    addressInfo.fullAddress = addr.address_name;

    logger.info('Geocoding conversion successful', {
      sido: addressInfo.sido,
      sidoCode: addressInfo.sidoCode,
      sigungu: addressInfo.sigungu,
      sigunguCode: addressInfo.sigunguCode,
      beopjungdong: addressInfo.beopjungdong,
      dongCode: addressInfo.dongCode,
      haengjeongdong: addressInfo.haengjeongdong,
      lawdCd: addressInfo.lawdCd,
      jibunAddress: addressInfo.jibunAddress,
      roadAddress: addressInfo.roadAddress || '(없음)'
    });
  } else {
    logger.warn('No geocoding results found', { latitude, longitude });
    addressInfo.fullAddress = '주소 정보 없음';
  }

  return ApiResponseHelper.success({
    success: true,
    coordinates: {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    },
    data: addressInfo,
  });
});
