/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    instrumentationHook: true,
  },
  // SSE (Server-Sent Events) 지원을 위한 설정
  serverRuntimeConfig: {
    // API 라우트 타임아웃 비활성화 (SSE 연결 유지)
    apiTimeout: 0,
  },
};

module.exports = nextConfig;

