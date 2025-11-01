/** @type {import('next').NextConfig} */

// 번들 분석 도구 (npm run analyze로 실행)
// devDependency이므로 ANALYZE=true일 때만 require (프로덕션 빌드에서는 skip)
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

const nextConfig = {
  // Strict Mode 활성화 (개발 시 문제 조기 발견)
  reactStrictMode: true,

  // SWC 최적화
  swcMinify: true,

  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60,
  },

  // 컴파일러 최적화
  compiler: {
    // 프로덕션에서 console.log 제거 (error, warn은 유지)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn', 'info'],
    } : false,
  },

  // 실험적 기능
  experimental: {
    // 서버 액션 활성화 (Next.js 14+)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 웹팩 설정
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서 서버 전용 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // 경로 별칭 명시적 설정 (Docker 환경 호환성)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };

    return config;
  },

  // 환경 변수 공개 (클라이언트에서 접근 가능)
  env: {
    APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // 헤더 설정
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
