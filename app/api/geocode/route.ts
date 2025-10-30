import { NextRequest, NextResponse } from 'next/server';

// Naver Reverse Geocoding 응답 구조
interface NaverReverseGeocodeResponse {
  status: {
    code: number;
    name: string;
    message: string;
  };
  results: Array<{
    name: string;           // 지역 이름
    code: {
      id: string;           // 법정동코드 (10자리)
      type: string;         // 'L' (법정동) 또는 'A' (행정동)
      mappingId: string;    // 매핑 ID
    };
    region: {
      area0: { name: string; coords: { center: { x: string; y: string } } }; // 국가
      area1: { name: string; coords: { center: { x: string; y: string } }; alias?: string }; // 시도
      area2: { name: string; coords: { center: { x: string; y: string } }; alias?: string }; // 시군구
      area3: { name: string; coords: { center: { x: string; y: string } }; alias?: string }; // 읍면동
      area4: { name: string; coords: { center: { x: string; y: string } }; alias?: string }; // 리
    };
    land?: {
      type: string;         // 토지 유형
      number1: string;      // 본번
      number2: string;      // 부번
      addition0?: { type: string; value: string }; // 추가 정보
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

    // 환경 변수에서 Naver API 키 가져오기
    const clientId = process.env.NAVER_MAPS_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Naver Maps API 키가 설정되지 않았습니다.',
          message: 'config.env 파일에서 NAVER_MAPS_CLIENT_ID와 NAVER_MAPS_CLIENT_SECRET를 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // Naver Reverse Geocoding API 호출
    // orders=legalcode: 법정동 코드 우선 반환
    const apiUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${longitude},${latitude}&output=json&orders=legalcode,addr`;

    console.log(`[Naver Geocoding] 🗺️  Reverse Geocoding 호출 시작`);
    console.log(`[Naver Geocoding]   좌표: ${latitude}, ${longitude}`);

    const response = await fetch(apiUrl, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Naver Geocoding] ❌ API 오류:', response.status);
      console.error('[Naver Geocoding]   응답:', errorText);
      return NextResponse.json(
        {
          error: 'Naver Reverse Geocoding API 호출 실패',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: NaverReverseGeocodeResponse = await response.json();

    // 상태 코드 체크
    if (data.status.code !== 0) {
      console.error('[Naver Geocoding] ❌ API 응답 오류:', data.status.message);
      return NextResponse.json(
        {
          error: 'Naver Reverse Geocoding 실패',
          details: data.status.message,
          code: data.status.code
        },
        { status: 400 }
      );
    }

    console.log(`[Naver Geocoding] ✅ API 응답 수신`);
    console.log(`[Naver Geocoding]   결과 개수: ${data.results?.length || 0}`);

    // 결과 파싱 (첫 번째 법정동 결과 사용)
    const addressInfo: AddressInfo = {};

    if (data.results && data.results.length > 0) {
      // 법정동 결과 찾기 (code.type === 'L')
      const legalResult = data.results.find(r => r.code.type === 'L');
      const adminResult = data.results.find(r => r.code.type === 'A');

      const result = legalResult || data.results[0]; // 법정동 우선, 없으면 첫 번째

      // 법정동 코드 (10자리)
      const fullLawdCd = result.code.id; // 예: "4117310300"
      const lawdCd = fullLawdCd.substring(0, 5); // 시군구 5자리: "41173"

      // 주소 정보
      addressInfo.sido = result.region.area1.name;
      addressInfo.sigungu = result.region.area2.name;
      addressInfo.dong = result.region.area3.name; // 법정동명!
      addressInfo.ri = result.region.area4.name;

      // 법정동코드
      addressInfo.lawdCd = lawdCd;
      addressInfo.sidoCode = fullLawdCd.substring(0, 2);
      addressInfo.sigunguCode = fullLawdCd.substring(2, 5);
      addressInfo.dongCode = fullLawdCd.substring(5, 8);

      // 법정동/행정동
      addressInfo.beopjungdong = result.region.area3.name; // 법정동명

      // 행정동은 별도 결과에서 추출 (있으면)
      if (adminResult) {
        addressInfo.haengjeongdong = adminResult.region.area3.name;
      } else {
        addressInfo.haengjeongdong = result.region.area3.name;
      }

      // 전체 주소 조합
      let fullAddr = `${addressInfo.sido} ${addressInfo.sigungu} ${addressInfo.dong}`;
      if (addressInfo.ri && addressInfo.ri.trim()) {
        fullAddr += ` ${addressInfo.ri}`;
      }
      if (result.land) {
        fullAddr += ` ${result.land.number1}`;
        if (result.land.number2 && result.land.number2 !== '0') {
          fullAddr += `-${result.land.number2}`;
        }
      }

      addressInfo.fullAddress = fullAddr;
      addressInfo.jibunAddress = fullAddr;
      addressInfo.roadAddress = fullAddr; // 도로명은 별도 API 필요

      console.log('[Naver Geocoding] 🎯 변환 성공:');
      console.log('[Naver Geocoding]   시도:', addressInfo.sido, `(${addressInfo.sidoCode})`);
      console.log('[Naver Geocoding]   시군구:', addressInfo.sigungu, `(${addressInfo.sigunguCode})`);
      console.log('[Naver Geocoding]   법정동:', addressInfo.beopjungdong, `(${addressInfo.dongCode})`);
      console.log('[Naver Geocoding]   행정동:', addressInfo.haengjeongdong);
      console.log('[Naver Geocoding]   법정동코드(5자리):', addressInfo.lawdCd);
      console.log('[Naver Geocoding]   법정동코드(10자리):', fullLawdCd);
      console.log('[Naver Geocoding]   전체주소:', addressInfo.fullAddress);
    } else {
      console.warn('[Naver Geocoding] ⚠️  결과가 없습니다 (좌표에 해당하는 주소를 찾을 수 없음)');
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
    console.error('[Naver Geocoding] ❌ 오류:', error);
    return NextResponse.json(
      { error: '역지오코딩 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
