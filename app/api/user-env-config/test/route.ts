/**
 * 환경 변수 테스트 API
 *
 * POST: 웹훅/SMTP/프록시 연결 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - Type declaration issue with next-auth module resolution in this file
import { getServerSession } from 'next/auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user-env-config/test
 * 환경 변수 연결 테스트 (저장 전 검증)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { key, value, ...extraParams } = body;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: 'key와 value가 필요합니다' },
        { status: 400 }
      );
    }

    // 키에 따라 적절한 테스트 실행
    switch (key) {
      case 'SLACK_WEBHOOK_URL':
        return await testSlackWebhook(value);

      case 'DISCORD_WEBHOOK_URL':
        return await testDiscordWebhook(value);

      case 'SMTP_SERVER':
      case 'SMTP_PASSWORD':
        return await testSmtpConnection(extraParams);

      case 'PROXY_URL':
        return await testProxyConnection(value, extraParams);

      default:
        return NextResponse.json({
          success: false,
          error: '테스트를 지원하지 않는 설정입니다',
        });
    }
  } catch (error: any) {
    console.error('[POST /api/user-env-config/test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '테스트 실패',
    });
  }
}

/**
 * Slack 웹훅 테스트
 */
async function testSlackWebhook(webhookUrl: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🧪 네이버 부동산 크롤러 - 웹훅 연결 테스트',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Slack 웹훅 연결 테스트 성공!* ✅\n\n이제 매물 알림을 받을 수 있습니다.',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `테스트 시간: ${new Date().toLocaleString('ko-KR')}`,
              },
            ],
          },
        ],
      }),
    });

    if (response.ok || response.status === 200) {
      return NextResponse.json({
        success: true,
        message: '✅ Slack 웹훅 연결 성공!\n\n채널에서 테스트 메시지를 확인하세요.',
      });
    } else {
      const errorText = await response.text();
      throw new Error(`Slack API 오류: ${errorText}`);
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `❌ Slack 웹훅 연결 실패\n\n${error.message}\n\nURL을 확인해주세요.`,
    });
  }
}

/**
 * Discord 웹훅 테스트
 */
async function testDiscordWebhook(webhookUrl: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧪 **네이버 부동산 크롤러 - 웹훅 연결 테스트**',
        embeds: [
          {
            title: '✅ Discord 웹훅 연결 성공!',
            description: '이제 매물 알림을 받을 수 있습니다.',
            color: 5763719, // 파란색
            footer: {
              text: `테스트 시간: ${new Date().toLocaleString('ko-KR')}`,
            },
          },
        ],
      }),
    });

    if (response.ok || response.status === 204) {
      return NextResponse.json({
        success: true,
        message: '✅ Discord 웹훅 연결 성공!\n\n채널에서 테스트 메시지를 확인하세요.',
      });
    } else {
      const errorText = await response.text();
      throw new Error(`Discord API 오류: ${errorText}`);
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `❌ Discord 웹훅 연결 실패\n\n${error.message}\n\nURL을 확인해주세요.`,
    });
  }
}

/**
 * SMTP 연결 테스트
 */
async function testSmtpConnection(params: any) {
  try {
    const { SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD } = params;

    if (!SMTP_SERVER || !SMTP_PORT || !SMTP_USERNAME || !SMTP_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: '❌ SMTP 설정이 불완전합니다\n\nSMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD를 모두 입력해주세요.',
      });
    }

    // Note: nodemailer는 런타임에 동적으로 import
    // 실제 구현에서는 nodemailer를 사용하지만, 여기서는 간단한 연결 테스트만 수행
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransport({
      host: SMTP_SERVER,
      port: parseInt(SMTP_PORT, 10),
      secure: SMTP_PORT === '465', // SSL/TLS
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    });

    // 연결 검증
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: `✅ SMTP 서버 연결 성공!\n\n서버: ${SMTP_SERVER}:${SMTP_PORT}\n사용자: ${SMTP_USERNAME}`,
    });
  } catch (error: any) {
    let errorMessage = error.message || '알 수 없는 오류';

    // Gmail 앱 비밀번호 관련 에러 처리
    if (errorMessage.includes('Invalid login') || errorMessage.includes('Username and Password not accepted')) {
      errorMessage = 'Gmail 사용 시 일반 비밀번호가 아닌 "앱 비밀번호"를 사용해야 합니다.\n\n앱 비밀번호 발급: Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호';
    }

    return NextResponse.json({
      success: false,
      error: `❌ SMTP 연결 실패\n\n${errorMessage}`,
    });
  }
}

/**
 * 프록시 연결 테스트
 */
async function testProxyConnection(proxyUrl: string, params: any) {
  try {
    // Note: https-proxy-agent는 런타임에 동적으로 import
    const { HttpsProxyAgent } = await import('https-proxy-agent');

    const agent = new HttpsProxyAgent(proxyUrl);

    // httpbin.org를 통해 프록시 연결 테스트
    const response = await fetch('https://httpbin.org/ip', {
      // @ts-ignore
      agent,
      headers: {
        'User-Agent': 'Naver-RealEstate-Crawler-Test/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: `✅ 프록시 연결 성공!\n\n프록시 IP: ${data.origin}`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `❌ 프록시 연결 실패\n\n${error.message}\n\nURL과 인증 정보를 확인해주세요.`,
    });
  }
}
