import { NextRequest, NextResponse } from 'next/server';

// SGIS API 인증 응답
interface SGISAuthResponse {
  errMsg: string;
  errCd: number;
  result: {
    accessToken: string;
    accessTimeout: string;
  };
}

// SGIS Reverse Geocoding 응답
interface SGISReverseGeocodeResponse {
  errMsg: string;
  errCd: number;
  id?: string;
  trId?: string;
  result?: Array<{
    addr_en?: string;      // 영문주소
    sido_cd: string;       // 시도코드
    sgg_cd: string;        // 시군구코드
    emdong_cd: string;     // 읍면동코드
    sido_nm: string;       // 시도명
    sgg_nm: string;        // 시군구명
    emdong_nm: string;     // 읍면동명
    full_addr: string;     // 전체주소
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
  lawdCd?: string;        // 법정동코드 (시도+시군구 = 5자리)
}

// AccessToken 캐시 (메모리 저장)
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

// AccessToken 발급 함수
async function getAccessToken(serviceId: string, securityKey: string): Promise<string> {
  const now = Date.now();

  // 캐시된 토큰이 유효하면 재사용 (만료 10분 전에 갱신)
  if (cachedAccessToken && tokenExpiryTime > now + 10 * 60 * 1000) {
    console.log('[SGIS Auth] ✅ 캐시된 AccessToken 사용');
    return cachedAccessToken;
  }

  // 새 AccessToken 발급
  console.log('[SGIS Auth] 🔑 새 AccessToken 발급 시작');
  const authUrl = `https://sgisapi.kostat.go.kr/OpenAPI3/auth/authentication.json?consumer_key=${serviceId}&consumer_secret=${securityKey}`;

  const response = await fetch(authUrl, {
    cache: 'no-store', // 브라우저/fetch 캐싱 방지
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  if (!response.ok) {
    throw new Error(`인증 실패: ${response.status} ${response.statusText}`);
  }

  const data: SGISAuthResponse = await response.json();

  // 디버깅: SGIS API 응답 전체 출력
  console.log('[SGIS Auth] 📋 API 응답:', JSON.stringify(data, null, 2));

  if (data.errCd !== 0) {
    throw new Error(`SGIS 인증 오류: ${data.errMsg} (코드: ${data.errCd})`);
  }

  // 토큰 캐시 저장 (API에서 제공하는 만료시간 사용)
  const newAccessToken = data.result.accessToken;
  // accessTimeout이 Unix timestamp(밀리초)로 제공됨
  const newTokenExpiryTime = parseInt(data.result.accessTimeout);

  console.log('[SGIS Auth] ✅ AccessToken 발급 완료');
  console.log('[SGIS Auth]   원본 accessTimeout:', data.result.accessTimeout);
  console.log('[SGIS Auth]   파싱된 tokenExpiryTime:', newTokenExpiryTime);
  console.log('[SGIS Auth]   현재 시간 (now):', now);
  console.log('[SGIS Auth]   만료시간:', new Date(newTokenExpiryTime).toLocaleString('ko-KR'));
  console.log('[SGIS Auth]   유효시간:', Math.floor((newTokenExpiryTime - now) / 1000 / 60), '분');

  // ⚠️ 중요: 만료된 토큰인지 확인 (SGIS API 캐싱 이슈 대응)
  if (newTokenExpiryTime <= now) {
    console.error('[SGIS Auth] ❌ 발급받은 토큰이 이미 만료됨! (SGIS API 서버 캐싱 문제)');
    console.error('[SGIS Auth]   이 문제는 SGIS API 서버 측 문제로, 클라이언트에서 해결 불가');
    console.error('[SGIS Auth]   실거래가 기능을 사용하려면 SGIS 고객센터에 문의 필요');

    // 만료된 토큰은 캐시하지 않음
    throw new Error(`SGIS API가 이미 만료된 토큰을 반환했습니다. 만료시간: ${new Date(newTokenExpiryTime).toLocaleString('ko-KR')}, 현재시간: ${new Date(now).toLocaleString('ko-KR')}`);
  }

  // 유효한 토큰만 캐시에 저장
  cachedAccessToken = newAccessToken;
  tokenExpiryTime = newTokenExpiryTime;

  return cachedAccessToken;
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

    // 환경 변수에서 SGIS API 키 가져오기
    const serviceId = process.env.SGIS_SERVICE_ID;
    const securityKey = process.env.SGIS_SECURITY_KEY;

    if (!serviceId || !securityKey) {
      return NextResponse.json(
        {
          error: 'SGIS API 키가 설정되지 않았습니다.',
          message: '.env 파일에서 SGIS_SERVICE_ID와 SGIS_SECURITY_KEY를 설정해주세요.'
        },
        { status: 500 }
      );
    }

    // AccessToken 발급 (캐시 사용)
    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceId, securityKey);
    } catch (authError: any) {
      console.error('[SGIS Auth] ❌ 인증 실패:', authError.message);
      return NextResponse.json(
        {
          error: 'SGIS API 인증 실패',
          details: authError.message
        },
        { status: 500 }
      );
    }

    // SGIS Reverse Geocoding API 호출 (WGS84 좌표계)
    const apiUrl = `https://sgisapi.kostat.go.kr/OpenAPI3/addr/rgeocodewgs84.json?accessToken=${accessToken}&x_coor=${longitude}&y_coor=${latitude}&addr_type=20`;

    console.log(`[SGIS Geocoding] 🗺️  Reverse Geocoding 호출 시작`);
    console.log(`[SGIS Geocoding]   좌표: ${latitude}, ${longitude}`);
    console.log(`[SGIS Geocoding]   URL: ${apiUrl.replace(accessToken, '***')}`);

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SGIS Geocoding] ❌ API 오류:', response.status);
      console.error('[SGIS Geocoding]   응답:', errorText);
      return NextResponse.json(
        {
          error: 'SGIS Reverse Geocoding API 호출 실패',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data: SGISReverseGeocodeResponse = await response.json();

    // errCd 체크
    if (data.errCd !== 0) {
      console.error('[SGIS Geocoding] ❌ API 응답 오류:', data.errMsg);
      return NextResponse.json(
        {
          error: 'SGIS Reverse Geocoding 실패',
          details: data.errMsg,
          code: data.errCd
        },
        { status: 400 }
      );
    }

    console.log(`[SGIS Geocoding] ✅ API 응답 수신`);
    console.log(`[SGIS Geocoding]   결과 개수: ${data.result?.length || 0}`);

    // 결과 파싱 (result 배열의 첫 번째 항목 사용)
    const addressInfo: AddressInfo = {};

    if (data.result && data.result.length > 0) {
      const addr = data.result[0];

      // 행정구역 정보
      addressInfo.sido = addr.sido_nm;
      addressInfo.sigungu = addr.sgg_nm;
      addressInfo.dong = addr.emdong_nm;

      // 행정구역 코드
      addressInfo.sidoCode = addr.sido_cd;
      addressInfo.sigunguCode = addr.sgg_cd;
      addressInfo.dongCode = addr.emdong_cd;

      // 법정동코드 생성 (시도 2자리 + 시군구 3자리 = 5자리)
      addressInfo.lawdCd = addr.sido_cd + addr.sgg_cd;

      // 법정동/행정동 (SGIS는 행정동 기준)
      addressInfo.beopjungdong = addr.emdong_nm;
      addressInfo.haengjeongdong = addr.emdong_nm;

      // 전체 주소
      addressInfo.fullAddress = addr.full_addr;

      // 지번 주소 (SGIS는 행정동 기준이므로 fullAddress 사용)
      addressInfo.jibunAddress = addr.full_addr;

      // 도로명 주소는 SGIS rgeocode에서 제공하지 않음
      addressInfo.roadAddress = addr.full_addr;

      console.log('[SGIS Geocoding] 🎯 변환 성공:');
      console.log('[SGIS Geocoding]   시도:', addressInfo.sido, `(${addressInfo.sidoCode})`);
      console.log('[SGIS Geocoding]   시군구:', addressInfo.sigungu, `(${addressInfo.sigunguCode})`);
      console.log('[SGIS Geocoding]   읍면동:', addressInfo.dong, `(${addressInfo.dongCode})`);
      console.log('[SGIS Geocoding]   법정동코드:', addressInfo.lawdCd);
      console.log('[SGIS Geocoding]   전체주소:', addressInfo.fullAddress);
    } else {
      console.warn('[SGIS Geocoding] ⚠️  결과가 없습니다 (좌표에 해당하는 주소를 찾을 수 없음)');
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
    console.error('[SGIS Geocoding] ❌ 오류:', error);
    return NextResponse.json(
      { error: '역지오코딩 처리 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

