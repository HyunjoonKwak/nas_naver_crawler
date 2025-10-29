#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NAS 환경용 네이버 부동산 Playwright 크롤러
헤드리스 모드로 동작하여 스크린이 없는 NAS에서도 실행 가능
"""

import asyncio
import json
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import pandas as pd
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# 환경변수 로드
load_dotenv()

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """한국 시간으로 현재 시각 반환"""
    return datetime.now(KST)


class NASNaverRealEstateCrawler:
    """NAS 환경용 네이버 부동산 크롤러"""

    def __init__(self, crawl_id: Optional[str] = None):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.status_file = None  # 진행 상태 파일 (백업용)
        self.start_time = None  # 크롤링 시작 시간
        self.results = []
        self.output_dir = Path(os.getenv('OUTPUT_DIR', './crawled_data'))
        self.output_dir.mkdir(exist_ok=True)

        # 크롤링 설정
        self.request_delay = float(os.getenv('REQUEST_DELAY', '2.0'))  # 요청 간격 (초)
        self.timeout = int(os.getenv('TIMEOUT', '30000'))  # 타임아웃 (밀리초)
        self.headless = os.getenv('HEADLESS', 'true').lower() == 'true'

        # Retry 설정
        self.max_retries = int(os.getenv('MAX_RETRIES', '3'))  # 최대 재시도 횟수
        self.retry_delay = float(os.getenv('RETRY_DELAY', '5.0'))  # 재시도 간격 (초)

        # DB 연결 설정
        self.crawl_id = crawl_id  # API에서 전달받은 crawl ID
        self.db_conn = None
        self.db_enabled = self._init_db_connection()

        print(f"크롤러 초기화 완료:")
        print(f"- 출력 디렉토리: {self.output_dir}")
        print(f"- 요청 간격: {self.request_delay}초")
        print(f"- 헤드리스 모드: {self.headless}")
        print(f"- 타임아웃: {self.timeout}ms")
        print(f"- DB 연결: {'✅ 활성화' if self.db_enabled else '❌ 비활성화 (파일 모드)'}")
        if self.crawl_id:
            print(f"- Crawl ID: {self.crawl_id}")

    def _init_db_connection(self) -> bool:
        """DB 연결 초기화"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                print("[WARNING] DATABASE_URL이 설정되지 않았습니다. 파일 모드로 작동합니다.")
                return False

            # Docker 내부에서는 'db' 호스트 사용
            # DATABASE_URL이 localhost로 시작하면 docker 내부이므로 db로 변경
            if 'localhost' in database_url or '127.0.0.1' in database_url:
                # Docker 내부 환경 감지
                if os.path.exists('/.dockerenv'):
                    database_url = database_url.replace('localhost', 'db').replace('127.0.0.1', 'db')
                    print(f"[DB] Docker 환경 감지 - 호스트를 'db'로 변경")

            self.db_conn = psycopg2.connect(database_url)
            print(f"[DB] PostgreSQL 연결 성공")
            return True
        except Exception as e:
            print(f"[WARNING] DB 연결 실패: {e}")
            print("[WARNING] 파일 모드로 작동합니다.")
            return False

    def _close_db_connection(self):
        """DB 연결 종료"""
        if self.db_conn:
            try:
                self.db_conn.close()
                print("[DB] 연결 종료")
            except Exception as e:
                print(f"[WARNING] DB 연결 종료 실패: {e}")
    
    def update_status(self, status: str, progress: int, total: int, current_complex: str = "", message: str = "", items_collected: int = 0):
        """진행 상태를 DB 및 파일에 저장"""
        # 경과 시간 계산
        elapsed_seconds = 0
        speed = 0.0
        estimated_total_seconds = 0

        if self.start_time:
            elapsed_seconds = int((get_kst_now() - self.start_time).total_seconds())

            # 속도 계산 (매물/초)
            if elapsed_seconds > 0 and items_collected > 0:
                speed = round(items_collected / elapsed_seconds, 2)

            # 예상 총 소요 시간 계산 (단지 기준)
            if progress > 0 and total > 0:
                avg_time_per_complex = elapsed_seconds / progress
                estimated_total_seconds = int(avg_time_per_complex * total)

        status_data = {
            "status": status,  # "running", "completed", "error"
            "progress": progress,
            "total": total,
            "percent": round((progress / total * 100) if total > 0 else 0, 1),
            "current_complex": current_complex,
            "message": message,
            "timestamp": get_kst_now().isoformat(),
            # 시간 정보
            "elapsed_seconds": elapsed_seconds,
            "estimated_total_seconds": estimated_total_seconds,
            # 속도 정보
            "items_collected": items_collected,
            "speed": speed  # 매물/초
        }

        # 1. 파일에 저장 (백업용, 기존 방식 유지)
        if self.status_file:
            try:
                with open(self.status_file, 'w', encoding='utf-8') as f:
                    json.dump(status_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"[WARNING] 상태 파일 업데이트 실패: {e}")

        # 2. DB에 업데이트 (새로운 방식)
        if self.db_enabled and self.crawl_id:
            try:
                cursor = self.db_conn.cursor()

                # CrawlHistory 테이블 업데이트
                # status: 'crawling' | 'saving' | 'success' | 'partial' | 'failed'
                db_status = 'crawling' if status == 'running' else status
                if status == 'completed':
                    db_status = 'success'
                elif status == 'error':
                    db_status = 'failed'

                cursor.execute("""
                    UPDATE crawl_history
                    SET current_step = %s,
                        processed_complexes = %s,
                        processed_articles = %s,
                        duration = %s,
                        status = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    message,
                    progress,
                    items_collected,
                    elapsed_seconds,
                    db_status,
                    self.crawl_id
                ))

                self.db_conn.commit()
                cursor.close()

                # 디버그 로그 (너무 자주 출력하지 않도록 10% 단위로만)
                if progress % max(1, total // 10) == 0 or status in ['completed', 'error']:
                    print(f"[DB] 상태 업데이트: {message} ({progress}/{total}, {items_collected}개 매물)")

            except Exception as e:
                print(f"[WARNING] DB 상태 업데이트 실패: {e}")
                # DB 업데이트 실패는 크롤링 중단 사유가 아니므로 계속 진행

    async def setup_browser(self):
        """브라우저 설정 및 초기화"""
        try:
            import time

            # 1. Playwright 시작
            start = time.time()
            playwright = await async_playwright().start()
            print(f"⏱️  Playwright 시작: {time.time() - start:.2f}초")

            # 브라우저 옵션 설정 (NAS 환경에 최적화)
            browser_options = {
                'headless': self.headless,
                'args': [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',  # /dev/shm 사용 안 함 (NAS 메모리 절약)
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-software-rasterizer',  # GPU 소프트웨어 렌더링 비활성화
                    '--disable-extensions',  # 확장 프로그램 비활성화
                    '--disable-background-networking',  # 백그라운드 네트워킹 비활성화
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',  # 크래시 리포트 비활성화
                    '--disable-component-extensions-with-background-pages',
                    '--disable-ipc-flooding-protection',
                    '--disable-renderer-backgrounding',
                    '--memory-pressure-off',
                    '--js-flags=--max-old-space-size=512'  # V8 힙 크기 512MB로 제한 (메모리 절약)
                ]
            }

            # 2. Chrome 브라우저 실행
            start = time.time()
            self.browser = await playwright.chromium.launch(**browser_options)
            print(f"⏱️  Chromium 실행: {time.time() - start:.2f}초")

            # 3. 컨텍스트 생성 (쿠키, 세션 관리)
            start = time.time()
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                extra_http_headers={
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                }
            )
            print(f"⏱️  컨텍스트 생성: {time.time() - start:.2f}초")

            # 4. 페이지 생성
            start = time.time()
            self.page = await self.context.new_page()
            print(f"⏱️  페이지 생성: {time.time() - start:.2f}초")

            # 5. 타임아웃 설정
            self.page.set_default_timeout(self.timeout)

            print("✅ 브라우저 설정 완료")

        except Exception as e:
            print(f"❌ 브라우저 설정 실패: {e}")
            raise

    async def close_browser(self):
        """브라우저 및 DB 연결 종료"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            print("브라우저 종료 완료")
        except Exception as e:
            print(f"브라우저 종료 중 오류: {e}")

        # DB 연결 종료
        self._close_db_connection()

    async def fetch_complex_info_only(self, complex_no: str) -> Optional[Dict]:
        """단지 기본 정보만 가져오기 (매물 크롤링 없이)"""
        try:
            print(f"[INFO-ONLY] 단지 정보 조회 시작: {complex_no}", flush=True)

            # 네이버 부동산 단지 페이지 접속
            url = f"https://new.land.naver.com/complexes/{complex_no}"
            print(f"[INFO-ONLY] 페이지 이동 중: {url}", flush=True)

            # 네트워크가 안정될 때까지 대기
            await self.page.goto(url, wait_until='networkidle', timeout=30000)
            print(f"[INFO-ONLY] 페이지 로드 완료", flush=True)

            # 추가 대기 (JavaScript 실행 완료)
            await asyncio.sleep(2)

            # API 응답 데이터를 직접 fetch로 가져오기
            overview_data = None
            try:
                print(f"[INFO-ONLY] API 직접 호출 시도...", flush=True)
                api_url = f"https://new.land.naver.com/api/complexes/overview/{complex_no}?complexNo={complex_no}"

                # 페이지 컨텍스트에서 fetch 실행
                response = await self.page.evaluate(f'''
                    async () => {{
                        const response = await fetch('{api_url}');
                        return await response.json();
                    }}
                ''')

                if response:
                    overview_data = response
                    print(f"[INFO-ONLY] API 직접 호출 성공: {response.get('complexName', 'Unknown')}", flush=True)
            except Exception as e:
                print(f"[INFO-ONLY] API 직접 호출 실패: {e}", flush=True)

            if overview_data:
                print(f"[INFO-ONLY] ✅ 단지 정보 수집 성공: {overview_data.get('complexName', 'Unknown')}", flush=True)
                return {
                    'complexNo': complex_no,
                    'complexName': overview_data.get('complexName'),
                    'totalHousehold': overview_data.get('totalHouseholdCount'),
                    'totalDong': overview_data.get('totalDongCount'),
                    'address': overview_data.get('address'),
                    'roadAddress': overview_data.get('roadAddress'),
                }
            else:
                print(f"[INFO-ONLY] ⚠️ 단지 정보 수집 실패", flush=True)
                return None

        except Exception as e:
            print(f"[INFO-ONLY] 단지 정보 조회 실패: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return None

    async def recreate_page(self):
        """페이지 컨텍스트 재생성 (에러 복구용)"""
        try:
            if self.page:
                await self.page.close()
        except:
            pass

        # 새 페이지 생성
        self.page = await self.context.new_page()
        print("🔄 페이지 컨텍스트 재생성 완료")

    async def validate_complex_exists(self, complex_no: str) -> bool:
        """단지 번호가 유효한지 간단히 확인 (컨텍스트 에러 복구 포함)"""
        max_attempts = 2

        for attempt in range(1, max_attempts + 1):
            try:
                url = f"https://new.land.naver.com/complexes/{complex_no}"
                # wait_until='commit'으로 변경: 네트워크 응답만 기다림 (더 빠름)
                # domcontentloaded는 SPA에서 타임아웃 발생 가능
                response = await self.page.goto(url, wait_until='commit', timeout=self.timeout)

                # 잠시 대기 (페이지 초기 렌더링)
                await asyncio.sleep(1)

                # HTTP 상태 코드 확인
                if response and response.status >= 400:
                    print(f"❌ 단지 {complex_no}: HTTP {response.status} - 존재하지 않거나 접근 불가")
                    return False

                # 페이지 타이틀 확인 (타임아웃 추가)
                try:
                    title = await self.page.title()
                    if '오류' in title or 'error' in title.lower() or 'not found' in title.lower():
                        print(f"❌ 단지 {complex_no}: 페이지 오류 - {title}")
                        return False
                except Exception as title_error:
                    print(f"⚠️ 타이틀 확인 실패, 무시하고 계속: {title_error}")

                print(f"✅ 단지 {complex_no} 유효성 확인 완료")
                return True

            except Exception as e:
                error_msg = str(e)
                if "Execution context was destroyed" in error_msg or "Target page" in error_msg:
                    if attempt < max_attempts:
                        print(f"⚠️ 페이지 컨텍스트 에러 발생, 재생성 후 재시도 ({attempt}/{max_attempts})")
                        await self.recreate_page()
                        await asyncio.sleep(2)
                        continue

                print(f"❌ 단지 {complex_no} 검증 실패: {e}")
                return False

        return False

    async def crawl_complex_overview_with_retry(self, complex_no: str) -> Optional[Dict]:
        """재시도 로직이 포함된 단지 개요 크롤링"""
        for attempt in range(1, self.max_retries + 1):
            try:
                if attempt > 1:
                    print(f"[재시도 {attempt}/{self.max_retries}] 단지 개요 크롤링 시작: {complex_no}")

                overview_data = await self.crawl_complex_overview(complex_no)

                if overview_data:
                    return overview_data

                # 데이터가 없으면 재시도
                if attempt < self.max_retries:
                    wait_time = self.retry_delay * (2 ** (attempt - 1))  # 지수 백오프: 5s, 10s, 20s
                    print(f"⏳ Overview 데이터 없음. {wait_time}초 후 재시도...")
                    await asyncio.sleep(wait_time)

            except Exception as e:
                print(f"❌ 시도 {attempt}/{self.max_retries} 실패: {e}")

                if attempt < self.max_retries:
                    wait_time = self.retry_delay * (2 ** (attempt - 1))
                    print(f"⏳ {wait_time}초 후 재시도...")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"🚫 최대 재시도 횟수 {self.max_retries}회 도달, 포기")
                    import traceback
                    traceback.print_exc()

        return None

    async def crawl_complex_overview(self, complex_no: str) -> Optional[Dict]:
        """단지 개요 정보 크롤링 (명시적 API 대기 방식)"""
        try:
            print(f"단지 개요 정보 크롤링 시작: {complex_no}")

            # 네이버 부동산 단지 페이지 접속
            url = f"https://new.land.naver.com/complexes/{complex_no}"
            overview_data = None

            try:
                try:
                    # 명시적으로 Overview API 응답을 기다림 (최대 30초)
                    print(f"[대기] Overview API 응답 대기 중...")
                    async with self.page.expect_response(
                        lambda response: f'/api/complexes/overview/{complex_no}' in response.url,
                        timeout=self.timeout
                    ) as response_info:
                        # 페이지 접속과 동시에 API 응답 대기
                        await self.page.goto(url, wait_until='commit', timeout=self.timeout)

                    # API 응답 받기
                    response = await response_info.value

                    # Protocol Error 재시도 로직
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            overview_data = await response.json()
                            print(f"✅ 단지 개요 API 응답 수신 성공: {overview_data.get('complexName', 'Unknown')}")
                            break
                        except Exception as e:
                            if attempt < max_retries - 1:
                                print(f"API 응답 파싱 실패 (재시도 {attempt + 1}/{max_retries}): {e}")
                                await asyncio.sleep(0.5)
                            else:
                                print(f"API 응답 파싱 최종 실패: {e}")
                                raise

                except Exception as api_wait_error:
                    # API 응답 대기 실패 (타임아웃 등)
                    print(f"⚠️ Overview API 응답 대기 실패: {api_wait_error}")

                    # 스크린샷 저장 시도
                    screenshot_path = self.output_dir / f"api_timeout_{complex_no}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    try:
                        await self.page.screenshot(path=str(screenshot_path), full_page=True, timeout=5000)
                        print(f"📸 타임아웃 스크린샷 저장: {screenshot_path}")
                    except Exception as ss_error:
                        print(f"[WARNING] 스크린샷 저장 실패: {ss_error}")

                    # URL 확인
                    current_url = self.page.url
                    print(f"현재 URL: {current_url}")

                    # 봇 탐지 패턴 분석
                    if '/404' in current_url:
                        print(f"⚠️ 404 페이지로 리다이렉트 감지! {url} → {current_url}")
                    elif f'/complexes/{complex_no}' not in current_url:
                        print(f"⚠️ 봇 탐지로 인한 리다이렉트 감지! {url} → {current_url}")
                        print(f"   단지 ID가 URL에서 제거되었습니다.")
                    elif current_url.startswith(f'https://new.land.naver.com/complexes/{complex_no}'):
                        if '?' in current_url:
                            print(f"✅ URL은 정상이나 API 응답 없음: {current_url}")
                        else:
                            print(f"✅ URL은 정상이나 API 응답 없음: {current_url}")

            except Exception as e:
                print(f"단지 개요 크롤링 중 오류: {e}")
                raise

            if overview_data:
                print(f"✅ Overview 수집 성공: {overview_data.get('complexName', 'Unknown')}")
                # 상세 정보 추출
                result = {
                    # 기본 정보
                    'complexName': overview_data.get('complexName', ''),
                    'complexType': overview_data.get('complexTypeName', ''),
                    'complexNo': overview_data.get('complexNo', ''),
                    'totalHousehold': overview_data.get('totalHouseHoldCount'),
                    'totalDong': overview_data.get('totalDongCount'),
                    'useApproveYmd': overview_data.get('useApproveYmd', ''),

                    # 좌표 정보
                    'latitude': overview_data.get('latitude'),
                    'longitude': overview_data.get('longitude'),

                    # 면적 정보
                    'minArea': overview_data.get('minArea'),
                    'maxArea': overview_data.get('maxArea'),

                    # 가격 정보
                    'minPrice': overview_data.get('minPrice'),
                    'maxPrice': overview_data.get('maxPrice'),
                    'minPriceByLetter': overview_data.get('minPriceByLetter', ''),
                    'maxPriceByLetter': overview_data.get('maxPriceByLetter', ''),
                    'minLeasePrice': overview_data.get('minLeasePrice'),
                    'maxLeasePrice': overview_data.get('maxLeasePrice'),
                    'minLeasePriceByLetter': overview_data.get('minLeasePriceByLetter', ''),
                    'maxLeasePriceByLetter': overview_data.get('maxLeasePriceByLetter', ''),

                    # 최근 실거래가
                    'realPrice': overview_data.get('realPrice'),

                    # 평형 정보
                    'pyeongs': overview_data.get('pyeongs', []),

                    # 동 정보
                    'dongs': overview_data.get('dongs', []),
                }
                return result
            else:
                print(f"⚠️ Overview 수집 실패")
                return None

        except Exception as e:
            print(f"단지 개요 크롤링 실패: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def crawl_complex_articles_with_scroll(self, complex_no: str) -> Optional[Dict]:
        """무한 스크롤 방식으로 모든 매물 목록 크롤링"""
        try:
            print(f"매물 목록 크롤링 시작 (무한 스크롤): {complex_no}")
            
            # 모든 매물을 저장할 리스트
            all_articles = []
            collected_article_ids = set()  # 중복 제거용
            last_api_time = [0]  # API 마지막 감지 시간 (리스트로 클로저 회피)

            # API 응답 수집
            async def handle_articles_response(response):
                # 매물 목록 API 응답 감지
                if f'/api/articles/complex/{complex_no}' in response.url:
                    # API 감지 시간 기록
                    last_api_time[0] = time.time()

                    # 동일매물 묶기 적용 여부 확인
                    same_group = 'sameAddressGroup=true' in response.url or 'sameAddressGroup=Y' in response.url
                    group_status = "✅ ON" if same_group else "❌ OFF"

                    print(f"[API] 호출 감지 #{len(all_articles)//20 + 1} (동일매물묶기: {group_status})")
                    if len(all_articles) == 0:  # 첫 API 호출만 전체 URL 로그
                        print(f"[API] URL: {response.url[:120]}...")

                    # Protocol Error 재시도 로직
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            data = await response.json()
                            article_list = data.get('articleList', [])
                            total_count = data.get('totalCount', 0)

                            # 중복 제거하며 추가
                            new_count = 0
                            for article in article_list:
                                article_id = article.get('articleNo') or article.get('id')
                                if article_id and article_id not in collected_article_ids:
                                    collected_article_ids.add(article_id)
                                    all_articles.append(article)
                                    new_count += 1

                            if new_count > 0:
                                total_info = f", 전체: {total_count}건" if total_count > 0 else ""
                                print(f"  → {new_count}개 새 매물 추가 (총 {len(all_articles)}개{total_info})")
                            break  # 성공하면 루프 종료
                        except Exception as e:
                            if attempt < max_retries - 1:
                                print(f"매물 API 응답 파싱 실패 (재시도 {attempt + 1}/{max_retries}): {e}")
                                await asyncio.sleep(0.5)  # 0.5초 대기 후 재시도
                            else:
                                print(f"매물 API 응답 파싱 최종 실패: {e}")
            
            # 응답 핸들러 등록
            self.page.on('response', handle_articles_response)

            try:
                # 1. 메인 페이지에서 localStorage 설정 (중요!)
                print("🔧 동일매물 묶기 설정 준비 중...")
                await self.page.goto("https://new.land.naver.com", wait_until='domcontentloaded')
                
                await self.page.evaluate('''
                    () => {
                        localStorage.setItem('sameAddrYn', 'true');
                        localStorage.setItem('sameAddressGroup', 'true');
                        console.log('[LocalStorage] 동일매물 묶기 설정 완료');
                    }
                ''')
                print("✅ localStorage 설정 완료")
                await asyncio.sleep(1)
                
                # 2. 단지 페이지로 이동 (localStorage 값이 자동 적용됨)
                url = f"https://new.land.naver.com/complexes/{complex_no}"
                print(f"URL 접속: {url}")
                await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)  # Increased to 30s
                await asyncio.sleep(2)
                
                # 2. 매물 탭 클릭
                print("매물 탭 찾는 중...")
                try:
                    selectors = [
                        'a[href*="article"]',
                        'button:has-text("매물")',
                        '[class*="article"]',
                    ]
                    
                    for selector in selectors:
                        try:
                            element = await self.page.wait_for_selector(selector, timeout=5000)
                            if element:
                                await element.click()
                                print(f"매물 탭 클릭 성공")
                                await asyncio.sleep(3)
                                break
                        except:
                            continue
                except Exception as e:
                    print(f"매물 탭 클릭 중 오류: {e}")
                
                # 3. localStorage 및 체크박스 상태 검증
                print("동일매물 묶기 상태 검증 중...")
                storage_check = await self.page.evaluate('''
                    () => {
                        const sameAddrYn = localStorage.getItem('sameAddrYn');
                        const sameAddressGroup = localStorage.getItem('sameAddressGroup');
                        
                        // 체크박스 상태 확인
                        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                        let checkboxState = null;
                        
                        for (const checkbox of checkboxes) {
                            const label = checkbox.closest('label') || checkbox.nextElementSibling;
                            const text = label ? (label.textContent || label.innerText || '') : '';
                            if (text.includes('동일매물')) {
                                checkboxState = {
                                    checked: checkbox.checked,
                                    labelText: text
                                };
                                break;
                            }
                        }
                        
                        return {
                            sameAddrYn,
                            sameAddressGroup,
                            checkboxState
                        };
                    }
                ''')
                print(f"[DEBUG] localStorage 상태: sameAddrYn={storage_check.get('sameAddrYn')}, sameAddressGroup={storage_check.get('sameAddressGroup')}")
                if storage_check.get('checkboxState'):
                    print(f"[DEBUG] 체크박스 상태: checked={storage_check['checkboxState'].get('checked')}")
                
                # 4. 체크박스가 체크되지 않았으면 클릭
                if storage_check.get('checkboxState') and not storage_check['checkboxState'].get('checked'):
                    print("🔘 체크박스 클릭 중...")
                    clicked = await self.page.evaluate('''
                        () => {
                            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                            for (const checkbox of checkboxes) {
                                const label = checkbox.closest('label') || checkbox.nextElementSibling;
                                const text = label ? (label.textContent || label.innerText || '') : '';
                                if (text.includes('동일매물')) {
                                    checkbox.click();
                                    console.log('[Checkbox] 클릭 완료');
                                    return true;
                                }
                            }
                            return false;
                        }
                    ''')
                    
                    if clicked:
                        print("[DEBUG] 체크박스 클릭 완료, 데이터 재로딩 대기...")
                        await asyncio.sleep(3)
                        print("✅ 동일매물 묶기 활성화 완료")
                    else:
                        print("[DEBUG] 체크박스를 찾지 못함")
                else:
                    print("✅ 동일매물 묶기 이미 활성화됨")
                
                # 5. 매물 목록 컨테이너 찾기 (재시도 로직 포함)
                print("매물 목록 컨테이너 찾는 중...")
                list_container = None
                # 더 구체적인 셀렉터부터 시도 (일반적인 것은 나중에)
                container_selectors = [
                    '.item_list--article',  # 가장 구체적
                    '[class*="article"]',   # 매물 관련
                    '.item_list',           # 일반 리스트
                    '[class*="list"]',      # 가장 일반적 (마지막)
                ]

                # 최대 3회 재시도
                container_retry_count = 0
                max_container_retries = 3

                while not list_container and container_retry_count < max_container_retries:
                    if container_retry_count > 0:
                        print(f"⚠️  컨테이너를 찾지 못했습니다. 페이지 새로고침 후 재시도 ({container_retry_count}/{max_container_retries})...")
                        await self.page.reload(wait_until='domcontentloaded', timeout=30000)
                        await asyncio.sleep(3)

                        # 매물 탭 다시 클릭
                        try:
                            tab_selectors = [
                                'a[href*="article"]',
                                'button:has-text("매물")',
                                '[class*="article"]',
                            ]

                            for tab_selector in tab_selectors:
                                try:
                                    element = await self.page.wait_for_selector(tab_selector, timeout=5000)
                                    if element:
                                        await element.click()
                                        print(f"매물 탭 다시 클릭 성공")
                                        await asyncio.sleep(2)
                                        break
                                except:
                                    continue
                        except Exception as e:
                            print(f"매물 탭 재클릭 중 오류: {e}")

                    for selector in container_selectors:
                        try:
                            list_container = await self.page.wait_for_selector(selector, timeout=5000)
                            if list_container:
                                print(f"✅ 매물 목록 컨테이너 발견: {selector}")
                                break
                        except:
                            continue

                    if not list_container:
                        container_retry_count += 1

                if not list_container:
                    print(f"❌ {max_container_retries}회 재시도 후에도 컨테이너를 찾지 못했습니다.")
                    print(f"   → 이 단지는 매물이 없거나, 네이버 페이지 구조가 변경되었을 수 있습니다.")
                    return None
                
                # 4. 초기 데이터 수집 대기
                await asyncio.sleep(3)
                initial_count = len(all_articles)
                print(f"초기 매물 수: {initial_count}개")

                # 초기 매물이 0개인 경우 추가 대기 (API 응답 대기)
                if initial_count == 0:
                    print("⚠️ 초기 매물이 0개입니다. API 응답 대기 중... (5초)")
                    await asyncio.sleep(5)
                    initial_count = len(all_articles)
                    print(f"재확인 매물 수: {initial_count}개")

                    if initial_count == 0:
                        print("❌ 여전히 매물이 없습니다. 이 단지는 매물이 없거나 페이지 로딩에 실패했습니다.")
                        return None
                
                # 5. 점진적 스크롤로 데이터 수집 (crawler_service.py 방식)
                print("추가 매물 수집 시작 (점진적 스크롤)...")
                print(f"[설정] 최대 시도: 100회, 스크롤: 800px, 동적 대기(API감지:0.3초/미감지:1.0초), 종료: 3회 연속 변화 없음")
                scroll_attempts = 0
                max_scroll_attempts = 100  # 최대 100회
                scroll_end_count = 0  # 스크롤이 안 움직이는 횟수
                max_scroll_end = 3  # 3회 연속 스크롤 안 되면 종료 (속도 개선)
                
                while scroll_attempts < max_scroll_attempts:
                    prev_count = len(all_articles)
                    
                    # 매물 스크롤 진행 상태 업데이트
                    if scroll_attempts % 3 == 0:  # 3회마다 업데이트 (너무 자주 업데이트하면 부하)
                        self.update_status(
                            status="running",
                            progress=len(all_articles),
                            total=100,  # 예상 총 매물 수 (실제는 알 수 없음)
                            current_complex=complex_no,
                            message=f"🔄 매물 스크롤 중... (시도 {scroll_attempts}회, 수집 {len(all_articles)}개)",
                            items_collected=len(all_articles)
                        )
                    
                    # 네이버 실제 컨테이너로 스크롤 (800px 고정)
                    scroll_result = await self.page.evaluate('''
                        () => {
                            // 네이버가 실제로 사용하는 셀렉터들
                            const selectors = [
                                '.item_list',  // ✅ crawler_service.py에서 사용
                                'div[class*="list_contents"]',
                                'div[class*="item_list"]',
                                'div[class*="article_list"]'
                            ];

                            let container = null;
                            for (const selector of selectors) {
                                container = document.querySelector(selector);
                                if (container && container.scrollHeight > container.clientHeight) {
                                    break;
                                }
                            }

                            if (!container) {
                                return { found: false, reason: 'container not found' };
                            }

                            // 점진적 스크롤 (800px씩 - 이전 500px에서 증가)
                            const before = container.scrollTop;
                            container.scrollTop += 800;  // ✅ 한 번에 끝까지 가지 않음
                            const after = container.scrollTop;

                            const items = container.querySelectorAll('.item_link, .item_inner, [class*="item"]');

                            return {
                                found: true,
                                moved: after > before,  // ✅ 실제로 스크롤되었는지
                                scrollBefore: before,
                                scrollAfter: after,
                                scrollDelta: after - before,
                                scrollHeight: container.scrollHeight,
                                clientHeight: container.clientHeight,
                                itemCount: items.length,
                                containerClass: container.className
                            };
                        }
                    ''')
                        
                    if scroll_attempts == 0:
                        if scroll_result.get('found'):
                            print(f"[DEBUG] 컨테이너 발견: .{scroll_result.get('containerClass', 'unknown')}")
                            print(f"  DOM 아이템: {scroll_result.get('itemCount', 0)}개 (동일매물묶기 이전, 참고용)")
                            print(f"  스크롤 높이: {scroll_result.get('scrollHeight')} / {scroll_result.get('clientHeight')}")
                            print(f"  💡 실제 수집 개수는 API 응답 기준 (동일매물묶기 이후)")
                        else:
                            print(f"[DEBUG] 컨테이너를 찾지 못함: {scroll_result.get('reason', 'unknown')}")

                    # 동적 대기 시간 (API 감지 여부에 따라)
                    time_since_last_api = time.time() - last_api_time[0]

                    if time_since_last_api < 0.5:  # 최근 0.5초 이내에 API 감지됨
                        wait_time = 0.3
                        # print(f"  [대기] API 최근 감지 → {wait_time}초 대기")
                    else:  # API 감지 안됨
                        wait_time = 1.0
                        # print(f"  [대기] API 미감지 → {wait_time}초 대기")

                    await asyncio.sleep(wait_time)
                    
                    current_count = len(all_articles)
                    new_items = current_count - prev_count
                    
                    scroll_attempts += 1
                    
                    # 종료 조건: 스크롤 끝 + 데이터 증가 없음 (둘 다 충족해야 함)
                    scroll_ended = scroll_result.get('found') and not scroll_result.get('moved')
                    no_new_data = new_items == 0
                    
                    if scroll_ended and no_new_data:
                        scroll_end_count += 1
                        print(f"시도 {scroll_attempts}회: 스크롤 끝 & 데이터 없음 ({scroll_end_count}/{max_scroll_end}) - 총 {current_count}개")
                        print(f"  → 스크롤: {scroll_result.get('scrollAfter')} / {scroll_result.get('scrollHeight')}")
                        
                        if scroll_end_count >= max_scroll_end:
                            print(f"⏹️  수집 종료 ({max_scroll_end}회 연속 변화 없음)")
                            print(f"📊 최종: {current_count}개 수집 (DOM: {scroll_result.get('itemCount', 0)}개는 동일매물묶기 이전)")
                            break
                    else:
                        # 스크롤이 끝이어도 데이터가 증가하면 계속 시도
                        if new_items > 0:
                            scroll_end_count = 0  # 데이터 증가하면 리셋
                            print(f"시도 {scroll_attempts}회: +{scroll_result.get('scrollDelta', 0)}px 스크롤 → 🎉 {new_items}개 추가 (총 {current_count}개)")
                        elif scroll_ended:
                            # 스크롤 끝이지만 데이터 증가 대기 중
                            print(f"시도 {scroll_attempts}회: 스크롤 끝 도달, API 응답 대기 중... (총 {current_count}개)")
                        else:
                            scroll_end_count = 0  # 스크롤 중이면 리셋
                            print(f"시도 {scroll_attempts}회: +{scroll_result.get('scrollDelta', 0)}px 스크롤 중... (총 {current_count}개, 대기 중)")
                
                if len(all_articles) > initial_count:
                    print(f"🎉 수집 완료: 초기 {initial_count}개 → 최종 {len(all_articles)}개 (총 {scroll_attempts}회 시도)")
                else:
                    print(f"⚠️  추가 수집 실패: {initial_count}개에서 변화 없음 (총 {scroll_attempts}회 시도)")
                    print(f"   → 실제로 {initial_count}개만 있거나, 스크롤/버튼이 작동하지 않음")
                
            except Exception as e:
                error_msg = str(e)
                print(f"스크롤 크롤링 중 오류: {e}")

                # 에러 발생 시 스크린샷 저장 (별도 타임아웃 5초)
                screenshot_path = self.output_dir / f"scroll_error_screenshot_{complex_no}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                try:
                    await self.page.screenshot(path=str(screenshot_path), full_page=True, timeout=5000)
                    print(f"🖼️  에러 스크린샷 저장: {screenshot_path}")
                except Exception as ss_error:
                    print(f"[WARNING] 스크린샷 저장 실패: {ss_error}")

                # 컨텍스트 파괴 에러인 경우 페이지 재생성
                if "Execution context was destroyed" in error_msg or "Target page" in error_msg:
                    print("⚠️ 페이지 컨텍스트 에러 - 페이지 재생성")
                    await self.recreate_page()

                # 에러가 발생해도 이미 수집한 데이터가 있으면 반환
                if all_articles:
                    print(f"⚠️  에러 발생했지만 {len(all_articles)}개 매물은 수집 완료")
            finally:
                # 응답 핸들러 제거 (에러 발생해도 반드시 실행)
                try:
                    self.page.remove_listener('response', handle_articles_response)
                    print(f"[DEBUG] Articles 핸들러 제거 완료")
                except Exception as e:
                    print(f"[WARNING] 핸들러 제거 실패: {e}")

            if all_articles:
                return {
                    'articleList': all_articles,
                    'totalCount': len(all_articles),
                    'isMoreData': False
                }
            else:
                print("⚠️  매물 데이터를 수집하지 못했습니다.")
                return None
                
        except Exception as e:
            print(f"매물 목록 크롤링 실패: {e}")
            return None

    async def crawl_complex_articles(self, complex_no: str, page_num: int = 1) -> Optional[Dict]:
        """단지 매물 목록 크롤링"""
        # 무한 스크롤 방식으로 모든 매물 수집
        if page_num == 1:
            return await self.crawl_complex_articles_with_scroll(complex_no)
        else:
            return None

    async def crawl_complex_data(self, complex_no: str) -> Dict:
        """단지 전체 데이터 크롤링 (재시도 로직 및 에러 복구 포함)"""
        print(f"\n{'='*60}")
        print(f"단지 번호 {complex_no} 크롤링 시작")

        complex_data = {
            'crawling_info': {
                'complex_no': complex_no,
                'crawling_date': get_kst_now().isoformat(),
                'crawler_version': '1.0.2'  # 컨텍스트 복구 로직 추가
            }
        }

        max_attempts = 2  # 전체 크롤링 재시도 횟수

        for attempt in range(1, max_attempts + 1):
            try:
                if attempt > 1:
                    print(f"\n🔄 [{attempt}/{max_attempts}] 단지 {complex_no} 재시도")
                    await self.recreate_page()
                    await asyncio.sleep(3)

                # 0. 단지 번호 유효성 검사 (선택 사항)
                is_valid = await self.validate_complex_exists(complex_no)
                if not is_valid:
                    print(f"⚠️ 단지 {complex_no}이(가) 존재하지 않거나 접근할 수 없습니다.")
                    print(f"   → 크롤링을 건너뜁니다.")
                    complex_data['error'] = f'단지 {complex_no} 존재하지 않거나 접근 불가'
                    complex_data['skipped'] = True
                    return complex_data

                # 0.5. DB에서 기존 단지 확인 (Overview 스킵 판단)
                skip_overview = False
                if self.db_enabled and self.db_conn:
                    try:
                        cursor = self.db_conn.cursor()
                        cursor.execute("""
                            SELECT "complexNo", "complexName", "totalHousehold", "totalDong",
                                   latitude, longitude
                            FROM complexes
                            WHERE "complexNo" = %s
                            LIMIT 1
                        """, (complex_no,))

                        existing_complex = cursor.fetchone()
                        cursor.close()

                        if existing_complex:
                            complexNo, complexName, totalHousehold, totalDong, latitude, longitude = existing_complex
                            print(f"💾 단지 {complex_no} 이미 DB에 존재")
                            print(f"   단지명: {complexName}")
                            print(f"   → Overview 크롤링 스킵 (기존 데이터 사용)")
                            skip_overview = True
                            # 기존 데이터를 overview로 사용
                            complex_data['overview'] = {
                                'complexNo': complexNo,
                                'complexName': complexName,
                                'totalHousehold': totalHousehold,
                                'totalDong': totalDong,
                                'latitude': float(latitude) if latitude else None,
                                'longitude': float(longitude) if longitude else None,
                            }
                        else:
                            print(f"🆕 신규 단지 {complex_no} → Overview 수집 필요")
                    except Exception as e:
                        print(f"[WARNING] DB 체크 실패, Overview 수집 진행: {e}")
                        # 에러 발생 시에도 커서 닫기 시도
                        try:
                            cursor.close()
                        except:
                            pass

                # 1. 단지 개요 정보 (재시도 로직 포함) - 신규 단지만
                if not skip_overview:
                    overview = await self.crawl_complex_overview_with_retry(complex_no)
                    if overview:
                        complex_data['overview'] = overview
                else:
                    overview = complex_data.get('overview')  # 기존 데이터 사용

                if overview:
                    # 기본 정보
                    complex_name = overview.get('complexName', 'Unknown')
                    complex_type = overview.get('complexType', 'Unknown')
                    total_household = overview.get('totalHousehold', 'Unknown')
                    total_dong = overview.get('totalDong', 'Unknown')
                    use_approve_ymd = overview.get('useApproveYmd', '')

                    print(f"\n📋 단지 기본 정보")
                    print(f"  단지명: {complex_name}")
                    print(f"  유형: {complex_type}")
                    print(f"  세대수: {total_household}세대")
                    print(f"  동수: {total_dong}개동")
                    if use_approve_ymd:
                        formatted_date = f"{use_approve_ymd[:4]}.{use_approve_ymd[4:6]}.{use_approve_ymd[6:]}"
                        print(f"  사용승인일: {formatted_date}")

                    # 좌표 정보
                    latitude = overview.get('latitude')
                    longitude = overview.get('longitude')
                    if latitude and longitude:
                        print(f"\n📍 위치 정보")
                        print(f"  좌표: {latitude}, {longitude}")

                    # 면적 정보
                    min_area = overview.get('minArea')
                    max_area = overview.get('maxArea')
                    if min_area and max_area:
                        print(f"\n📐 면적 범위")
                        print(f"  {min_area}㎡ ~ {max_area}㎡")

                    # 가격 정보
                    min_price_letter = overview.get('minPriceByLetter')
                    max_price_letter = overview.get('maxPriceByLetter')
                    if min_price_letter and max_price_letter:
                        print(f"\n💰 매매가 범위")
                        print(f"  {min_price_letter} ~ {max_price_letter}")

                    min_lease_letter = overview.get('minLeasePriceByLetter')
                    max_lease_letter = overview.get('maxLeasePriceByLetter')
                    if min_lease_letter and max_lease_letter:
                        print(f"  전세: {min_lease_letter} ~ {max_lease_letter}")

                    # 최근 실거래가
                    real_price = overview.get('realPrice')
                    if real_price:
                        # 타입 안전하게 변환 (문자열/정수 모두 처리)
                        trade_year = str(real_price.get('tradeYear', ''))
                        trade_month = int(real_price.get('tradeMonth', 0)) if real_price.get('tradeMonth') else 0
                        trade_day = int(real_price.get('tradeDate', 0)) if real_price.get('tradeDate') else 0

                        trade_date = f"{trade_year}.{trade_month:02d}.{trade_day:02d}"
                        price = real_price.get('formattedPrice', '')
                        floor = real_price.get('floor', '')
                        area = real_price.get('representativeArea', '')
                        print(f"\n🏷️  최근 실거래가")
                        print(f"  {trade_date} | {price} | {floor}층 | {area}㎡")

                    # 평형 정보
                    pyeongs = overview.get('pyeongs', [])
                    if pyeongs:
                        print(f"\n🏠 평형 종류 ({len(pyeongs)}개)")
                        for pyeong in pyeongs:
                            supply_area = pyeong.get('supplyArea', '')
                            exclusive_area = pyeong.get('exclusiveArea', '')
                            pyeong_name = pyeong.get('pyeongName', '')
                            print(f"  {pyeong_name}㎡ (공급 {supply_area}㎡ / 전용 {exclusive_area}㎡)")

                    # 동 정보
                    dongs = overview.get('dongs', [])
                    if dongs:
                        dong_names = [d.get('bildName', '') for d in dongs[:10]]  # 최대 10개만
                        dong_display = ', '.join(dong_names)
                        if len(dongs) > 10:
                            dong_display += f" 외 {len(dongs) - 10}개동"
                        print(f"\n🏢 동 정보")
                        print(f"  {dong_display}")
                else:
                    print(f"⚠️ 단지 개요 정보를 가져오지 못했습니다.")
                    # 개요 없이도 매물은 시도

                # 요청 간격 조절
                await asyncio.sleep(self.request_delay)

                # 2. 매물 목록 (무한 스크롤 방식)
                articles = await self.crawl_complex_articles(complex_no, 1)
                if articles:
                    complex_data['articles'] = articles
                    article_count = len(articles.get('articleList', []))
                    print(f"매물 수: {article_count}개")
                else:
                    print(f"⚠️ 매물 정보를 가져오지 못했습니다.")

                print(f"단지 {complex_no} 크롤링 완료")
                return complex_data  # 성공 시 즉시 반환

            except Exception as e:
                error_msg = str(e)
                print(f"단지 {complex_no} 크롤링 중 오류: {e}")

                # 컨텍스트 파괴 에러이고 재시도 가능한 경우
                if "Execution context was destroyed" in error_msg or "Target page" in error_msg:
                    if attempt < max_attempts:
                        print(f"⚠️ 컨텍스트 에러 발생, 재시도 예정...")
                        continue
                    else:
                        print(f"❌ 최대 재시도 횟수 초과")

                # 재시도 불가능한 에러거나 마지막 시도
                import traceback
                traceback.print_exc()
                complex_data['error'] = str(e)
                return complex_data

        # 모든 재시도 실패
        complex_data['error'] = '모든 재시도 실패'
        return complex_data

    async def crawl_multiple_complexes(self, complex_numbers: List[str]) -> List[Dict]:
        """여러 단지 크롤링"""
        results = []
        total = len(complex_numbers)
        
        for i, complex_no in enumerate(complex_numbers, 1):
            print(f"\n진행률: {i}/{total}")
            
            # 현재까지 수집된 전체 매물 수 계산
            total_items_so_far = 0
            for r in results:
                if 'articles' in r and 'articleList' in r['articles']:
                    total_items_so_far += len(r['articles']['articleList'])
            
            # 단지 개요 수집 전 상태 업데이트
            self.update_status(
                status="running",
                progress=i - 1,
                total=total,
                current_complex=complex_no,
                message=f"📋 단지 정보 수집 중... ({i}/{total})",
                items_collected=total_items_so_far
            )
            
            try:
                complex_data = await self.crawl_complex_data(complex_no)
                results.append(complex_data)
                
                # 크롤링 완료 후 상태 업데이트
                article_count = 0
                if 'articles' in complex_data and 'articleList' in complex_data['articles']:
                    article_count = len(complex_data['articles']['articleList'])
                
                # 전체 매물 수 재계산
                total_items_so_far = 0
                for r in results:
                    if 'articles' in r and 'articleList' in r['articles']:
                        total_items_so_far += len(r['articles']['articleList'])
                
                self.update_status(
                    status="running",
                    progress=i,
                    total=total,
                    current_complex=complex_no,
                    message=f"✅ 완료: {complex_data.get('overview', {}).get('complexName', complex_no)} ({article_count}개 매물)",
                    items_collected=total_items_so_far
                )
                
                # 단지 간 요청 간격 조절
                if i < total:
                    await asyncio.sleep(self.request_delay * 2)
                    
            except Exception as e:
                print(f"단지 {complex_no} 크롤링 실패: {e}")
                results.append({
                    'complex_no': complex_no,
                    'error': str(e),
                    'crawling_date': get_kst_now().isoformat()
                })
                
                # 실패 시에도 전체 매물 수 계산
                total_items_so_far = 0
                for r in results:
                    if 'articles' in r and 'articleList' in r['articles']:
                        total_items_so_far += len(r['articles']['articleList'])
                
                # 실패 시에도 상태 업데이트
                self.update_status(
                    status="running",
                    progress=i,
                    total=total,
                    current_complex=complex_no,
                    message=f"❌ 실패: {complex_no} - {str(e)[:50]}",
                    items_collected=total_items_so_far
                )
        
        return results

    def save_data(self, data: Any, filename_prefix: str = "naver_complex"):
        """데이터 저장"""
        timestamp = get_kst_now().strftime("%Y%m%d_%H%M%S")

        try:
            # 단지번호 추출 (파일명에 포함하기 위해)
            complex_nos = []
            if isinstance(data, list):
                for item in data:
                    if 'crawling_info' in item and 'complex_no' in item['crawling_info']:
                        complex_nos.append(item['crawling_info']['complex_no'])
                    elif 'overview' in item and 'complexNo' in item['overview']:
                        complex_nos.append(item['overview']['complexNo'])

            # 파일명에 단지번호 포함 (예: complexes_3_22065-12345-67890_20251014_120000)
            complex_nos_str = '-'.join(complex_nos[:10]) if complex_nos else ''  # 최대 10개까지
            if complex_nos_str:
                filename = f"{filename_prefix}_{complex_nos_str}_{timestamp}"
            else:
                filename = f"{filename_prefix}_{timestamp}"

            # JSON 저장
            json_filename = self.output_dir / f"{filename}.json"
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"JSON 데이터 저장: {json_filename}")

            # CSV 저장 (리스트 데이터인 경우)
            if isinstance(data, list) and data and isinstance(data[0], dict):
                # 단지 개요 정보만 추출하여 CSV로 저장
                csv_data = []
                for item in data:
                    if 'overview' in item:
                        overview = item['overview']
                        csv_data.append({
                            '단지번호': overview.get('complexNo', ''),
                            '단지명': overview.get('complexName', ''),
                            '세대수': overview.get('totalHouseHoldCount', ''),
                            '동수': overview.get('totalDongCount', ''),
                            '사용승인일': overview.get('useApproveYmd', ''),
                            '최소면적': overview.get('minArea', ''),
                            '최대면적': overview.get('maxArea', ''),
                            '최소가격': overview.get('minPrice', ''),
                            '최대가격': overview.get('maxPrice', ''),
                            '위도': overview.get('latitude', ''),
                            '경도': overview.get('longitude', ''),
                            '크롤링일시': item.get('crawling_info', {}).get('crawling_date', '')
                        })

                if csv_data:
                    df = pd.DataFrame(csv_data)
                    csv_filename = self.output_dir / f"{filename}.csv"
                    df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
                    print(f"CSV 데이터 저장: {csv_filename}")

        except Exception as e:
            print(f"데이터 저장 중 오류: {e}")

    async def run_crawling(self, complex_numbers: List[str]):
        """크롤링 실행"""
        import time

        # 상태 파일 및 시작 시간 설정
        timestamp = get_kst_now().strftime("%Y%m%d_%H%M%S")
        self.status_file = self.output_dir / f"crawl_status_{timestamp}.json"
        self.start_time = get_kst_now()  # 시작 시간 기록

        try:
            # 브라우저 설정
            setup_start = time.time()
            print("⏱️  브라우저 설정 시작...")
            await self.setup_browser()
            setup_duration = time.time() - setup_start
            print(f"⏱️  브라우저 설정 총 소요시간: {setup_duration:.2f}초")

            # 크롤링 시작 상태 업데이트
            self.update_status(
                status="running",
                progress=0,
                total=len(complex_numbers),
                message="🚀 크롤링 시작 중...",
                items_collected=0
            )
            
            # 크롤링 실행
            if len(complex_numbers) == 1:
                data = await self.crawl_complex_data(complex_numbers[0])
                results = [data]
            else:
                results = await self.crawl_multiple_complexes(complex_numbers)
            
            # 데이터 저장
            self.save_data(results, f"complexes_{len(complex_numbers)}")
            
            # 결과 요약
            print(f"\n{'='*60}")
            print("크롤링 완료")
            print(f"{'='*60}")
            print(f"총 {len(results)}개 단지 크롤링 완료")
            
            # 성공: articles가 있고 articleList에 매물이 있는 경우
            success_count = len([r for r in results if 'articles' in r and r.get('articles', {}).get('articleList')])
            # 실패: error가 있거나 매물이 없는 경우
            error_count = len(results) - success_count
            print(f"성공: {success_count}개, 실패: {error_count}개")
            
            # 전체 수집된 매물 수 계산
            total_items = 0
            for r in results:
                if 'articles' in r and 'articleList' in r['articles']:
                    total_items += len(r['articles']['articleList'])
            
            # 크롤링 완료 상태 업데이트
            self.update_status(
                status="completed",
                progress=len(complex_numbers),
                total=len(complex_numbers),
                message=f"✅ 크롤링 완료! 성공: {success_count}, 실패: {error_count}",
                items_collected=total_items
            )
            
            return results
            
        except Exception as e:
            print(f"크롤링 실행 중 오류: {e}")
            
            # 에러 상태 업데이트
            self.update_status(
                status="error",
                progress=0,
                total=len(complex_numbers),
                message=f"❌ 오류 발생: {str(e)[:100]}",
                items_collected=0
            )
            
            raise
        finally:
            await self.close_browser()


async def fetch_info_only(complex_no: str) -> Optional[Dict]:
    """단지 정보만 가져오는 독립 함수 (매물 크롤링 없이)"""
    print(f"[fetch_info_only] 크롤러 인스턴스 생성 중...", flush=True)
    crawler = NASNaverRealEstateCrawler()
    try:
        print(f"[fetch_info_only] 브라우저 설정 시작...", flush=True)
        await crawler.setup_browser()
        print(f"[fetch_info_only] 브라우저 설정 완료, 단지 정보 조회 시작...", flush=True)
        info = await crawler.fetch_complex_info_only(complex_no)
        print(f"[fetch_info_only] 단지 정보 조회 완료", flush=True)
        return info
    except Exception as e:
        print(f"[fetch_info_only] 오류 발생: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return None
    finally:
        print(f"[fetch_info_only] 브라우저 종료 중...", flush=True)
        await crawler.close_browser()
        print(f"[fetch_info_only] 브라우저 종료 완료", flush=True)


async def main():
    """메인 함수"""
    import sys

    # 명령행 인자 처리
    # Usage:
    #   - Full crawl: python nas_playwright_crawler.py "22065,12345" [crawl_id]
    #   - Info only: python nas_playwright_crawler.py --info-only 22065

    if len(sys.argv) > 1 and sys.argv[1] == '--info-only':
        # 정보만 가져오기 모드
        if len(sys.argv) < 3:
            print("Usage: python nas_playwright_crawler.py --info-only <complex_no>")
            sys.exit(1)

        complex_no = sys.argv[2].strip()
        print(f"📋 단지 정보만 조회: {complex_no}")

        info = await fetch_info_only(complex_no)
        if info:
            # JSON 형식으로 출력 (Node.js에서 파싱 가능)
            print("===INFO_START===")
            print(json.dumps(info, ensure_ascii=False))
            print("===INFO_END===")
        else:
            print("ERROR: Failed to fetch complex info")
            sys.exit(1)
        return

    # 일반 크롤링 모드
    crawl_id = None
    complex_numbers = ['22065']  # 기본값

    if len(sys.argv) > 1:
        complex_numbers = sys.argv[1].split(',')
        complex_numbers = [num.strip() for num in complex_numbers if num.strip()]

    if len(sys.argv) > 2:
        crawl_id = sys.argv[2].strip()
        print(f"🔗 Crawl ID: {crawl_id}")

    print(f"📋 크롤링 대상 단지: {complex_numbers}")

    # 크롤러 인스턴스 생성 (crawl_id 전달)
    crawler = NASNaverRealEstateCrawler(crawl_id=crawl_id)

    # 크롤링 실행
    await crawler.run_crawling(complex_numbers)


if __name__ == "__main__":
    asyncio.run(main())
