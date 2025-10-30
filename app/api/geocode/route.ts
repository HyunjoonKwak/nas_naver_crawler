import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: '위도(latitude)와 경도(longitude)가 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경 변수에서 Kakao REST API 키 가져오기
    const kakaoApiKey = process.env.KAKAO_REST_API_KEY;

    if (!kakaoApiKey) {
      return NextResponse.json(
        {
          error: 'Kakao REST API 키가 설정되지 않았습니다.',
          message: 'config.env 파일에서 KAKAO_REST_API_KEY를 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // Kakao Reverse Geocoding API 호출
    const apiUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`;

    console.log(`[Kakao Geocoding] 🗺️  Reverse Geocoding 호출 시작`);
    console.log(`[Kakao Geocoding]   좌표: ${latitude}, ${longitude}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `KakaoAK ${kakaoApiKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Kakao Geocoding] ❌ API 오류:', response.status);
      console.error('[Kakao Geocoding]   응답:', errorText);
      return NextResponse.json(
        {
          error: 'Kakao Reverse Geocoding API 호출 실패',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: KakaoReverseGeocodeResponse = await response.json();

    console.log(`[Kakao Geocoding] ✅ API 응답 수신`);
    console.log(`[Kakao Geocoding]   결과 개수: ${data.documents?.length || 0}`);

    // 결과 파싱
    const addressInfo: AddressInfo = {};

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0];
      const addr = doc.address;
      const roadAddr = doc.road_address;

      // 디버깅: 응답 구조 확인
      console.log('[Kakao Geocoding] 📋 응답 데이터:', JSON.stringify(doc, null, 2));

      // 법정동 코드 (10자리 → 5자리로 변환)
      const fullLawdCd = addr.b_code || '0000000000'; // 기본값 제공

      if (!addr.b_code) {
        console.warn('[Kakao Geocoding] ⚠️  b_code가 없습니다. 응답 구조 확인 필요');
      }

      const lawdCd = fullLawdCd.substring(0, 5); // 시군구 5자리: "41173"

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

      console.log('[Kakao Geocoding] 🎯 변환 성공:');
      console.log('[Kakao Geocoding]   시도:', addressInfo.sido, `(${addressInfo.sidoCode})`);
      console.log('[Kakao Geocoding]   시군구:', addressInfo.sigungu, `(${addressInfo.sigunguCode})`);
      console.log('[Kakao Geocoding]   법정동:', addressInfo.beopjungdong, `(${addressInfo.dongCode})`);
      console.log('[Kakao Geocoding]   행정동:', addressInfo.haengjeongdong);
      console.log('[Kakao Geocoding]   법정동코드(5자리):', addressInfo.lawdCd);
      console.log('[Kakao Geocoding]   법정동코드(10자리):', fullLawdCd);
      console.log('[Kakao Geocoding]   지번주소:', addressInfo.jibunAddress);
      console.log('[Kakao Geocoding]   도로명주소:', addressInfo.roadAddress || '(없음)');
    } else {
      console.warn('[Kakao Geocoding] ⚠️  결과가 없습니다 (좌표에 해당하는 주소를 찾을 수 없음)');
      addressInfo.fullAddress = '주소 정보 없음';
    }

    return NextResponse.json({
      success: true,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      data: addressInfo,
    });

  } catch (error: any) {
    console.error('[Kakao Geocoding] ❌ 오류:', error);
    return NextResponse.json(
      { error: '역지오코딩 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
