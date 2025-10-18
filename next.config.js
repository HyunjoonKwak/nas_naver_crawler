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
};

module.exports = nextConfig;

