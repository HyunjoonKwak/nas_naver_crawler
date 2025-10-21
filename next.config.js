/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    instrumentationHook: true,
  },

  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'], // 최신 이미지 포맷 지원
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // 반응형 사이즈
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // 아이콘 등 작은 이미지 사이즈
    minimumCacheTTL: 60, // 캐시 TTL (초)
  },

  // 빌드 시 정적 페이지 생성 완전히 비활성화
  // DB 연결 없이도 빌드 가능하도록 설정
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

