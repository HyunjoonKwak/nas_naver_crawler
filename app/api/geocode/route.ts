import { NextRequest, NextResponse } from 'next/server';

interface NaverGeocodingResponse {
  status: {
    code: number;
    name: string;
    message: string;
  };
  results: Array<{
    name: string;
    code: {
      id: string;
      type: string;
      mappingId: string;
    };
    region: {
      area0: { name: string; coords: { center: { x: number; y: number } } };
      area1: { name: string; coords: { center: { x: number; y: number } }; alias?: string };
      area2: { name: string; coords: { center: { x: number; y: number } } };
      area3: { name: string; coords: { center: { x: number; y: number } } };
      area4: { name: string; coords: { center: { x: number; y: number } } };
    };
    land?: {
      type: string;
      number1: string;
      number2: string;
      addition0?: { type: string; value: string };
      addition1?: { type: string; value: string };
      addition2?: { type: string; value: string };
      addition3?: { type: string; value: string };
      addition4?: { type: string; value: string };
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
  beopjungdong?: string;  // 법정동
  haengjeongdong?: string; // 행정동
  fullAddress?: string;
}

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

    // 환경 변수에서 API 키 가져오기
    const clientId = process.env.NAVER_MAPS_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: 'Naver Maps API 키가 설정되지 않았습니다.',
          message: 'config.env 파일에서 NAVER_MAPS_CLIENT_ID와 NAVER_MAPS_CLIENT_SECRET을 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // 네이버 Maps Reverse Geocoding API 호출
    const coords = `${longitude},${latitude}`;
    const apiUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${coords}&output=json&orders=roadaddr,addr`;

    console.log(`[Geocoding] API 호출: ${coords}`);

    const response = await fetch(apiUrl, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geocoding] API 오류:', response.status, errorText);
      return NextResponse.json(
        { 
          error: 'Naver Maps API 호출 실패',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: NaverGeocodingResponse = await response.json();

    if (data.status.code !== 0) {
      console.error('[Geocoding] API 상태 오류:', data.status);
      return NextResponse.json(
        { error: 'Geocoding 실패', details: data.status },
        { status: 400 }
      );
    }

    // 결과 파싱
    const addressInfo: AddressInfo = {};

    if (data.results && data.results.length > 0) {
      // 도로명 주소 우선
      const roadAddr = data.results.find(r => r.name === 'roadaddr');
      const jibunAddr = data.results.find(r => r.name === 'addr');

      if (roadAddr) {
        const region = roadAddr.region;
        const land = roadAddr.land;
        
        addressInfo.sido = region.area1?.name || '';
        addressInfo.sigungu = region.area2?.name || '';
        addressInfo.dong = region.area3?.name || '';
        addressInfo.ri = region.area4?.name || '';
        
        // 도로명 주소 구성
        const roadParts = [
          region.area1?.name,
          region.area2?.name,
          region.area3?.name,
          land?.addition0?.value, // 도로명
          land?.number1 && land?.number2 
            ? `${land.number1}-${land.number2}`
            : land?.number1
        ].filter(Boolean);
        
        addressInfo.roadAddress = roadParts.join(' ');
      }

      if (jibunAddr) {
        const region = jibunAddr.region;
        const land = jibunAddr.land;
        
        // 법정동 정보
        addressInfo.beopjungdong = region.area3?.name || '';
        
        // 행정동 정보 (area2의 alias 또는 area3)
        addressInfo.haengjeongdong = region.area2?.alias || region.area3?.name || '';
        
        // 지번 주소 구성
        const jibunParts = [
          region.area1?.name,
          region.area2?.name,
          region.area3?.name,
          region.area4?.name,
          land?.number1 && land?.number2 
            ? `${land.number1}-${land.number2}`
            : land?.number1
        ].filter(Boolean);
        
        addressInfo.jibunAddress = jibunParts.join(' ');
      }

      // 전체 주소 (도로명 우선, 없으면 지번)
      addressInfo.fullAddress = addressInfo.roadAddress || addressInfo.jibunAddress;
    }

    console.log('[Geocoding] 변환 성공:', {
      coords,
      beopjungdong: addressInfo.beopjungdong,
      haengjeongdong: addressInfo.haengjeongdong,
    });

    return NextResponse.json({
      success: true,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      address: addressInfo,
    });

  } catch (error: any) {
    console.error('[Geocoding] 오류:', error);
    return NextResponse.json(
      { error: '역지오코딩 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

