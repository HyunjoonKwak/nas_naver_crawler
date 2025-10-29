/**
 * 환경 변수 템플릿 시스템
 *
 * 사용자가 쉽게 환경 변수를 입력할 수 있도록 미리 정의된 템플릿 제공
 */

export interface EnvTemplate {
  key: string;
  displayName: string;
  category: string;
  isSecret: boolean;
  description: string;
  inputGuide: string;  // 마크다운 형식
  placeholder: string;
  validation: string;  // 정규식
  helpUrl?: string;
  testable: boolean;   // 테스트 가능 여부
}

export const ENV_TEMPLATES: EnvTemplate[] = [
  // ============================================
  // 웹훅 템플릿
  // ============================================
  {
    key: 'SLACK_WEBHOOK_URL',
    displayName: 'Slack 웹훅 URL',
    category: 'webhook',
    isSecret: true,
    description: 'Slack으로 매물 알림을 받기 위한 웹훅 URL',
    inputGuide: `
## Slack 웹훅 URL 발급 방법

### 1단계: Incoming Webhooks 앱 추가
1. Slack 워크스페이스 접속
2. 왼쪽 사이드바에서 **Apps** 클릭
3. **Incoming Webhooks** 검색
4. **Add to Slack** 버튼 클릭

### 2단계: 채널 선택 및 생성
1. 알림을 받을 채널 선택 (예: #부동산-알림)
2. **Add Incoming WebHooks integration** 클릭

### 3단계: Webhook URL 복사
1. **Webhook URL** 섹션에서 URL 복사
2. 아래 입력란에 붙여넣기

### URL 형식 예시
\`\`\`
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
\`\`\`

### 주의사항
⚠️ Webhook URL은 외부에 노출되지 않도록 주의하세요
✅ 각 채널마다 별도의 웹훅을 생성할 수 있습니다
✅ 저장 전 **연결 테스트**를 권장합니다
    `,
    placeholder: 'https://hooks.slack.com/services/...',
    validation: '^https://hooks\\.slack\\.com/services/[A-Z0-9]+/[A-Z0-9]+/[a-zA-Z0-9]+$',
    helpUrl: 'https://api.slack.com/messaging/webhooks',
    testable: true,
  },
  {
    key: 'DISCORD_WEBHOOK_URL',
    displayName: 'Discord 웹훅 URL',
    category: 'webhook',
    isSecret: true,
    description: 'Discord로 매물 알림을 받기 위한 웹훅 URL',
    inputGuide: `
## Discord 웹훅 URL 발급 방법

### 1단계: 서버 설정 열기
1. Discord 서버에서 채널 목록 확인
2. 알림 받을 채널 우클릭
3. **채널 편집** 선택

### 2단계: 웹훅 생성
1. 왼쪽 메뉴에서 **통합** 선택
2. **웹훅** 섹션에서 **새 웹훅** 버튼 클릭
3. 웹훅 이름 설정 (예: 부동산 크롤러)
4. 필요시 아바타 이미지 설정

### 3단계: URL 복사
1. 생성된 웹훅에서 **웹훅 URL 복사** 클릭
2. 아래 입력란에 붙여넣기

### URL 형식 예시
\`\`\`
https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
\`\`\`

### 참고
✅ 웹훅 생성 후 **변경 사항 저장** 꼭 클릭하세요
✅ 저장 전 **연결 테스트**로 메시지 수신 확인
    `,
    placeholder: 'https://discord.com/api/webhooks/...',
    validation: '^https://discord\\.com/api/webhooks/[0-9]+/[a-zA-Z0-9_-]+$',
    helpUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
    testable: true,
  },

  // ============================================
  // 이메일 알림 템플릿
  // ============================================
  {
    key: 'NOTIFICATION_EMAIL',
    displayName: '알림 받을 이메일',
    category: 'notification',
    isSecret: false,
    description: '매물 알림을 받을 이메일 주소',
    inputGuide: `
## 이메일 주소 입력

매물 알림을 받을 이메일 주소를 입력하세요.

### 입력 예시
- \`user@gmail.com\`
- \`myname@naver.com\`
- \`admin@company.co.kr\`

### 참고사항
✅ 여러 이메일로 받으려면 SMTP 설정에서 추가 수신자 설정 가능
✅ 이메일 발송을 위해서는 **SMTP 설정**도 함께 필요합니다
    `,
    placeholder: 'user@example.com',
    validation: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    testable: false,
  },
  {
    key: 'SMTP_SERVER',
    displayName: 'SMTP 서버',
    category: 'notification',
    isSecret: false,
    description: '이메일 발송에 사용할 SMTP 서버 주소',
    inputGuide: `
## SMTP 서버 설정

이메일 발송을 위한 SMTP 서버를 설정합니다.

### 주요 이메일 서비스별 SMTP 설정

| 이메일 서비스 | SMTP 서버 | 포트 | 보안 |
|--------------|-----------|------|------|
| **Gmail** | \`smtp.gmail.com\` | 587 | STARTTLS |
| **Naver** | \`smtp.naver.com\` | 587 | STARTTLS |
| **Daum/Kakao** | \`smtp.daum.net\` | 465 | SSL/TLS |
| **Outlook** | \`smtp-mail.outlook.com\` | 587 | STARTTLS |

### Gmail 사용 시 주의사항
Gmail을 사용하려면 **앱 비밀번호**를 발급받아야 합니다.

#### 앱 비밀번호 발급 방법
1. Google 계정 관리 → **보안** 메뉴
2. **2단계 인증** 활성화 (필수)
3. **앱 비밀번호** 메뉴 선택
4. "메일" 앱 + "기타" 기기 선택
5. 생성된 16자리 비밀번호를 **SMTP_PASSWORD**에 입력

### 권장 설정
대부분의 이메일 서비스는 **587번 포트(STARTTLS)**를 권장합니다.
    `,
    placeholder: 'smtp.gmail.com',
    validation: '^smtp\\.[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    testable: true,
  },
  {
    key: 'SMTP_PORT',
    displayName: 'SMTP 포트',
    category: 'notification',
    isSecret: false,
    description: 'SMTP 서버 포트 번호',
    inputGuide: `
## SMTP 포트 번호 선택

### 일반적인 포트 번호

| 포트 | 보안 방식 | 설명 |
|------|----------|------|
| **587** | STARTTLS | 가장 권장되는 포트 (대부분의 서비스 지원) |
| **465** | SSL/TLS | 암호화된 연결 (일부 서비스 사용) |
| **25** | 없음 | 암호화 없음 (사용 비권장) |
| **2525** | STARTTLS | 587 대체 포트 (일부 ISP에서 차단 시) |

### 권장 설정
- **Gmail, Naver, Outlook**: 587번 포트 사용
- **Daum/Kakao**: 465번 포트 사용

### 참고
587번 포트가 ISP에 의해 차단된 경우 2525번 포트를 시도해보세요.
    `,
    placeholder: '587',
    validation: '^(25|465|587|2525)$',
    testable: false,
  },
  {
    key: 'SMTP_USERNAME',
    displayName: 'SMTP 사용자명',
    category: 'notification',
    isSecret: false,
    description: 'SMTP 인증에 사용할 이메일 주소',
    inputGuide: `
## SMTP 사용자명 입력

대부분의 이메일 서비스는 **이메일 주소 전체**를 사용자명으로 사용합니다.

### 서비스별 사용자명 형식

| 서비스 | 사용자명 형식 | 예시 |
|--------|-------------|------|
| Gmail | 이메일 전체 | \`yourname@gmail.com\` |
| Naver | 이메일 전체 | \`yourname@naver.com\` |
| Daum | 이메일 전체 | \`yourname@daum.net\` |
| Outlook | 이메일 전체 | \`yourname@outlook.com\` |

### 참고
✅ 일부 서비스는 "@" 앞부분만 사용하기도 하지만, **전체 이메일 주소**를 입력하는 것이 안전합니다.
    `,
    placeholder: 'your-email@gmail.com',
    validation: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    testable: false,
  },
  {
    key: 'SMTP_PASSWORD',
    displayName: 'SMTP 비밀번호',
    category: 'notification',
    isSecret: true,
    description: 'SMTP 인증에 사용할 비밀번호 (Gmail의 경우 앱 비밀번호)',
    inputGuide: `
## SMTP 비밀번호 입력

### Gmail 사용 시 (⚠️ 중요)
Gmail은 일반 계정 비밀번호가 아닌 **앱 비밀번호**를 사용해야 합니다.

#### 앱 비밀번호 발급 단계
1. [Google 계정 관리](https://myaccount.google.com/) 접속
2. **보안** 메뉴 선택
3. **2단계 인증** 활성화 (아직 안 했다면)
4. **앱 비밀번호** 검색 또는 선택
5. 앱 선택: "메일", 기기 선택: "기타" → 이름 입력
6. **생성** 버튼 클릭
7. 생성된 **16자리 비밀번호** 복사 (공백 제거)

#### 예시
\`\`\`
abcd efgh ijkl mnop  ← 생성된 비밀번호
abcdefghijklmnop     ← 공백 제거하여 입력
\`\`\`

### 다른 이메일 서비스 사용 시
- **Naver**: 계정 비밀번호 사용
- **Daum**: 계정 비밀번호 사용
- **Outlook**: 계정 비밀번호 또는 앱 비밀번호

### 보안 주의사항
⚠️ 비밀번호는 암호화되어 저장됩니다
⚠️ 절대 다른 사람과 공유하지 마세요
    `,
    placeholder: '16자리 앱 비밀번호 (Gmail) 또는 계정 비밀번호',
    validation: '^.{8,}$',  // 최소 8자 이상
    helpUrl: 'https://support.google.com/accounts/answer/185833',
    testable: true,
  },

  // ============================================
  // 네트워크/프록시 템플릿
  // ============================================
  {
    key: 'USE_PROXY',
    displayName: '프록시 사용 여부',
    category: 'network',
    isSecret: false,
    description: '크롤링 시 프록시 서버 사용 여부',
    inputGuide: `
## 프록시 사용 설정

프록시 서버를 통해 크롤링하려면 \`true\`로 설정하세요.

### 설정 값
- \`true\`: 프록시 서버 사용
- \`false\`: 직접 연결 (기본값)

### 프록시가 필요한 경우
✅ 회사 네트워크에서 방화벽이 있는 경우
✅ 특정 IP 차단을 우회해야 하는 경우
✅ 여러 IP로 분산하여 크롤링하는 경우

### 참고
프록시 사용 시 **PROXY_URL** 설정도 함께 필요합니다.
    `,
    placeholder: 'false',
    validation: '^(true|false)$',
    testable: false,
  },
  {
    key: 'PROXY_URL',
    displayName: '프록시 서버 URL',
    category: 'network',
    isSecret: false,
    description: '프록시 서버 주소 (USE_PROXY가 true일 때만 필요)',
    inputGuide: `
## 프록시 URL 입력

### HTTP 프록시
\`\`\`
http://proxy-server.com:8080
\`\`\`

### HTTPS 프록시
\`\`\`
https://proxy-server.com:8443
\`\`\`

### 인증이 필요한 프록시
\`\`\`
http://username:password@proxy-server.com:8080
\`\`\`

### SOCKS5 프록시
\`\`\`
socks5://proxy-server.com:1080
\`\`\`

### 주의사항
⚠️ 프로토콜(http://, https://, socks5://)을 반드시 포함해야 합니다
⚠️ 포트 번호(:8080)를 정확히 입력하세요
✅ 저장 전 **연결 테스트**를 권장합니다
    `,
    placeholder: 'http://proxy-server.com:8080',
    validation: '^(https?|socks5)://.*:[0-9]+$',
    testable: true,
  },
  {
    key: 'PROXY_USERNAME',
    displayName: '프록시 사용자명',
    category: 'network',
    isSecret: false,
    description: '프록시 서버 인증에 사용할 사용자명',
    inputGuide: `
## 프록시 사용자명

프록시 서버가 인증을 요구하는 경우 사용자명을 입력하세요.

### 참고
인증이 없는 프록시는 이 설정이 필요 없습니다.
    `,
    placeholder: 'proxy-user',
    validation: '^.{1,}$',
    testable: false,
  },
  {
    key: 'PROXY_PASSWORD',
    displayName: '프록시 비밀번호',
    category: 'network',
    isSecret: true,
    description: '프록시 서버 인증에 사용할 비밀번호',
    inputGuide: `
## 프록시 비밀번호

프록시 서버가 인증을 요구하는 경우 비밀번호를 입력하세요.

### 보안
비밀번호는 암호화되어 저장됩니다.
    `,
    placeholder: '프록시 비밀번호',
    validation: '^.{1,}$',
    testable: false,
  },
];

/**
 * 특정 키의 템플릿 검색
 */
export function getTemplate(key: string): EnvTemplate | undefined {
  return ENV_TEMPLATES.find(t => t.key === key);
}

/**
 * 카테고리별 템플릿 목록
 */
export function getTemplatesByCategory(category: string): EnvTemplate[] {
  return ENV_TEMPLATES.filter(t => t.category === category);
}

/**
 * 모든 카테고리 목록
 */
export function getAllCategories(): Array<{value: string; label: string; icon: string}> {
  return [
    { value: 'webhook', label: '웹훅', icon: 'Webhook' },
    { value: 'notification', label: '이메일 알림', icon: 'Mail' },
    { value: 'network', label: '네트워크/프록시', icon: 'Network' },
  ];
}
