# Naver Maps API 설정 가이드

## 개요
지오코딩(좌표 → 주소 변환)을 정확히 수행하기 위해 Naver Maps Reverse Geocoding API를 사용합니다.
- SGIS API는 **행정동**을 반환하여 실거래가 API(법정동 기준)와 매칭이 안됨
- Naver API는 **법정동 코드와 법정동명**을 정확히 반환

## API 키 발급 방법

1. **Naver Cloud Platform 가입**
   - https://www.ncloud.com/ 접속
   - 회원가입 및 로그인

2. **Maps API 서비스 신청**
   - Console → AI·NAVER API → AI·Application Service → Maps 선택
   - "Reverse Geocoding" 서비스 활성화
   - Application 생성 시 인증 키 발급됨

3. **API 키 확인**
   - Application 목록에서 생성한 앱 선택
   - **Client ID**: X-NCP-APIGW-API-KEY-ID
   - **Client Secret**: X-NCP-APIGW-API-KEY

## 로컬 개발 환경 설정

`.env.local` 파일 생성 (Git에 올라가지 않음):

```bash
# .env.local
NAVER_MAPS_CLIENT_ID=your_actual_client_id
NAVER_MAPS_CLIENT_SECRET=your_actual_client_secret
```

개발 서버 재시작:
```bash
npm run dev
```

## NAS 배포 환경 설정

`docker-compose.dev.yml` 파일 수정:

```yaml
environment:
  # 기존 설정...
  - NAVER_MAPS_CLIENT_ID=실제_클라이언트_ID
  - NAVER_MAPS_CLIENT_SECRET=실제_시크릿_키
```

Docker 재시작:
```bash
docker-compose -f docker-compose.dev.yml restart web
```

## 확인 방법

1. 단지 상세 페이지 접속
2. 실거래가 탭 클릭
3. "🗺️ 지오코딩 재실행" 버튼 클릭
4. 로그 확인:
   ```
   [Naver Geocoding] ✅ API 응답 수신
   [Naver Geocoding]   법정동: 평촌동 (103)
   [Naver Geocoding]   행정동: 평안동
   [Naver Geocoding]   법정동코드(5자리): 41173
   ```

## 주의사항

- **API 키를 Git에 커밋하지 마세요!**
- `config.env`는 예시 파일이므로 실제 키를 입력하지 마세요
- `.env.local`은 `.gitignore`에 포함되어 있습니다
- NAS 배포 시 `docker-compose.dev.yml`을 직접 수정하세요 (Git push 금지)

## 최초 설정 (새로 클론한 경우)

저장소를 새로 클론한 경우:

```bash
# 1. 예시 파일을 복사하여 config.env 생성
cp config.env.example config.env

# 2. config.env 파일 편집하여 실제 API 키 입력
nano config.env  # 또는 vi, vim 등

# 3. 개발 서버 실행
npm run dev
```

**중요**: `config.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.
