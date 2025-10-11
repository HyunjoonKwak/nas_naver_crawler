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
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import pandas as pd
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()


class NASNaverRealEstateCrawler:
    """NAS 환경용 네이버 부동산 크롤러"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.results = []
        self.output_dir = Path(os.getenv('OUTPUT_DIR', './crawled_data'))
        self.output_dir.mkdir(exist_ok=True)
        
        # 크롤링 설정
        self.request_delay = float(os.getenv('REQUEST_DELAY', '2.0'))  # 요청 간격 (초)
        self.timeout = int(os.getenv('TIMEOUT', '30000'))  # 타임아웃 (밀리초)
        self.headless = os.getenv('HEADLESS', 'true').lower() == 'true'
        
        print(f"크롤러 초기화 완료:")
        print(f"- 출력 디렉토리: {self.output_dir}")
        print(f"- 요청 간격: {self.request_delay}초")
        print(f"- 헤드리스 모드: {self.headless}")
        print(f"- 타임아웃: {self.timeout}ms")

    async def setup_browser(self):
        """브라우저 설정 및 초기화"""
        try:
            playwright = await async_playwright().start()
            
            # 브라우저 옵션 설정 (NAS 환경에 최적화)
            browser_options = {
                'headless': self.headless,
                'args': [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--memory-pressure-off',
                    '--max_old_space_size=4096'
                ]
            }
            
            # Chrome 브라우저 실행
            self.browser = await playwright.chromium.launch(**browser_options)
            
            # 컨텍스트 생성 (쿠키, 세션 관리)
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                extra_http_headers={
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                }
            )
            
            # 페이지 생성
            self.page = await self.context.new_page()
            
            # 타임아웃 설정
            self.page.set_default_timeout(self.timeout)
            
            print("브라우저 설정 완료")
            
        except Exception as e:
            print(f"브라우저 설정 실패: {e}")
            raise

    async def close_browser(self):
        """브라우저 종료"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            print("브라우저 종료 완료")
        except Exception as e:
            print(f"브라우저 종료 중 오류: {e}")

    async def crawl_complex_overview(self, complex_no: str) -> Optional[Dict]:
        """단지 개요 정보 크롤링"""
        try:
            print(f"단지 개요 정보 크롤링 시작: {complex_no}")
            
            # 네이버 부동산 단지 페이지 접속
            url = f"https://new.land.naver.com/complexes/{complex_no}"
            await self.page.goto(url, wait_until='networkidle')
            
            # 페이지 로딩 대기
            await asyncio.sleep(3)
            
            # 네트워크 요청 모니터링하여 API 응답 캐치
            overview_data = None
            
            async def handle_response(response):
                nonlocal overview_data
                if f'/api/complexes/overview/{complex_no}' in response.url:
                    try:
                        data = await response.json()
                        overview_data = data
                        print(f"단지 개요 API 응답 캐치됨")
                    except Exception as e:
                        print(f"API 응답 파싱 실패: {e}")
            
            # 응답 핸들러 등록
            self.page.on('response', handle_response)
            
            # 페이지 새로고침하여 API 호출 트리거
            await self.page.reload(wait_until='networkidle')
            await asyncio.sleep(2)
            
            # 응답 핸들러 제거
            self.page.remove_listener('response', handle_response)
            
            return overview_data
            
        except Exception as e:
            print(f"단지 개요 크롤링 실패: {e}")
            return None

    async def crawl_complex_articles_with_scroll(self, complex_no: str) -> Optional[Dict]:
        """무한 스크롤 방식으로 모든 매물 목록 크롤링"""
        try:
            print(f"매물 목록 크롤링 시작 (무한 스크롤): {complex_no}")
            
            # 모든 매물을 저장할 리스트
            all_articles = []
            collected_article_ids = set()  # 중복 제거용
            
            # API 응답 수집
            async def handle_articles_response(response):
                # 매물 목록 API 응답 감지
                if f'/api/articles/complex/{complex_no}' in response.url:
                    print(f"[DEBUG] API 호출 감지")
                    try:
                        data = await response.json()
                        article_list = data.get('articleList', [])
                        
                        # 중복 제거하며 추가
                        new_count = 0
                        for article in article_list:
                            article_id = article.get('articleNo') or article.get('id')
                            if article_id and article_id not in collected_article_ids:
                                collected_article_ids.add(article_id)
                                all_articles.append(article)
                                new_count += 1
                        
                        if new_count > 0:
                            print(f"  → {new_count}개 새 매물 추가 (총 {len(all_articles)}개)")
                    except Exception as e:
                        print(f"매물 API 응답 파싱 실패: {e}")
            
            # 응답 핸들러 등록
            self.page.on('response', handle_articles_response)
            
            try:
                # 1. 단지 페이지로 이동
                url = f"https://new.land.naver.com/complexes/{complex_no}"
                print(f"URL 접속: {url}")
                await self.page.goto(url, wait_until='networkidle')
                await asyncio.sleep(3)
                
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
                
                # 3. 매물 목록 컨테이너 찾기
                print("매물 목록 컨테이너 찾는 중...")
                list_container = None
                container_selectors = [
                    '[class*="list"]',
                    '[class*="article"]',
                    '[class*="item"]',
                ]
                
                for selector in container_selectors:
                    try:
                        list_container = await self.page.wait_for_selector(selector, timeout=5000)
                        if list_container:
                            print(f"매물 목록 컨테이너 발견: {selector}")
                            break
                    except:
                        continue
                
                # 4. 초기 데이터 수집 대기
                await asyncio.sleep(3)
                initial_count = len(all_articles)
                print(f"초기 매물 수: {initial_count}개")
                
                # 5. "더보기" 버튼 또는 스크롤로 데이터 수집
                print("추가 매물 수집 시작...")
                scroll_attempts = 0
                max_scroll_attempts = 50  # 최대 시도 횟수
                no_new_data_count = 0
                max_no_new_data = 3  # 3번 연속 새 데이터 없으면 중단
                
                while scroll_attempts < max_scroll_attempts:
                    prev_count = len(all_articles)
                    
                    # 좌측 매물 목록 패널 스크롤 - 리스트 아이템 기반
                    scroll_result = await self.page.evaluate('''
                        () => {
                            // 1. 매물 리스트 아이템 찾기
                            const itemSelectors = [
                                'div[class*="list_contents"] > div',
                                'div[class*="article_list"] > div',
                                'div[class*="item"]',
                                '[class*="list"] > div[class*="article"]'
                            ];
                            
                            let items = [];
                            for (const selector of itemSelectors) {
                                items = Array.from(document.querySelectorAll(selector));
                                if (items.length > 5) break;  // 충분한 아이템이 있으면 사용
                            }
                            
                            if (items.length === 0) {
                                return { scrolled: false, reason: 'no items found' };
                            }
                            
                            // 2. 마지막 아이템으로 스크롤
                            const lastItem = items[items.length - 1];
                            const beforeScroll = lastItem.getBoundingClientRect().top;
                            
                            // scrollIntoView 사용 (더 확실함)
                            lastItem.scrollIntoView({ behavior: 'auto', block: 'end' });
                            
                            const afterScroll = lastItem.getBoundingClientRect().top;
                            
                            // 3. 부모 컨테이너 정보
                            let container = lastItem.parentElement;
                            while (container && container.scrollHeight <= container.clientHeight) {
                                container = container.parentElement;
                            }
                            
                            return {
                                scrolled: true,
                                itemCount: items.length,
                                lastItemMoved: Math.abs(beforeScroll - afterScroll) > 10,
                                beforeTop: beforeScroll,
                                afterTop: afterScroll,
                                container: container ? {
                                    className: container.className.substring(0, 50),
                                    scrollHeight: container.scrollHeight,
                                    clientHeight: container.clientHeight,
                                    scrollTop: container.scrollTop
                                } : null
                            };
                        }
                    ''')
                        
                    if scroll_attempts == 0:
                        if scroll_result.get('scrolled'):
                            print(f"[DEBUG] 매물 아이템 {scroll_result.get('itemCount', 0)}개 발견")
                            print(f"  마지막 아이템 스크롤: {scroll_result.get('lastItemMoved', False)}")
                            if scroll_result.get('container'):
                                print(f"  컨테이너: {scroll_result['container']}")
                        else:
                            print(f"[DEBUG] 매물 아이템을 찾지 못함: {scroll_result.get('reason', 'unknown')}")
                    
                    await asyncio.sleep(5)  # API 호출 대기 (증가)
                    
                    current_count = len(all_articles)
                    new_items = current_count - prev_count
                    
                    scroll_attempts += 1
                    
                    if new_items > 0:
                        no_new_data_count = 0
                        print(f"시도 {scroll_attempts}회: {new_items}개 추가 (총 {current_count}개)")
                    else:
                        no_new_data_count += 1
                        print(f"시도 {scroll_attempts}회: 스크롤했지만 새 데이터 없음 ({no_new_data_count}/{max_no_new_data})")
                        
                        if no_new_data_count >= max_no_new_data:
                            print(f"✅ 수집 완료 - {max_no_new_data}회 연속 새 데이터 없음")
                            break
                
                if len(all_articles) > initial_count:
                    print(f"🎉 수집 완료: 초기 {initial_count}개 → 최종 {len(all_articles)}개 (총 {scroll_attempts}회 시도)")
                else:
                    print(f"⚠️  추가 수집 실패: {initial_count}개에서 변화 없음 (총 {scroll_attempts}회 시도)")
                    print(f"   → 실제로 {initial_count}개만 있거나, 스크롤/버튼이 작동하지 않음")
                
            except Exception as e:
                print(f"스크롤 크롤링 중 오류: {e}")
            
            # 응답 핸들러 제거
            self.page.remove_listener('response', handle_articles_response)
            
            if all_articles:
                return {
                    'articleList': all_articles,
                    'totalCount': len(all_articles),
                    'isMoreData': False
                }
            else:
                print("매물 데이터를 수집하지 못했습니다.")
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
        """단지 전체 데이터 크롤링"""
        print(f"\n{'='*60}")
        print(f"단지 번호 {complex_no} 크롤링 시작")
        print(f"{'='*60}")
        
        complex_data = {
            'crawling_info': {
                'complex_no': complex_no,
                'crawling_date': datetime.now().isoformat(),
                'crawler_version': '1.0.0'
            }
        }
        
        try:
            # 1. 단지 개요 정보
            overview = await self.crawl_complex_overview(complex_no)
            if overview:
                complex_data['overview'] = overview
                print(f"단지명: {overview.get('complexName', 'Unknown')}")
                print(f"세대수: {overview.get('totalHouseHoldCount', 'Unknown')}")
                print(f"동수: {overview.get('totalDongCount', 'Unknown')}")
            
            # 요청 간격 조절
            await asyncio.sleep(self.request_delay)
            
            # 2. 매물 목록 (무한 스크롤 방식)
            articles = await self.crawl_complex_articles(complex_no, 1)
            if articles:
                complex_data['articles'] = articles
                article_count = len(articles.get('articleList', []))
                print(f"매물 수: {article_count}개")
            
            print(f"단지 {complex_no} 크롤링 완료")
            
        except Exception as e:
            print(f"단지 {complex_no} 크롤링 중 오류: {e}")
            complex_data['error'] = str(e)
        
        return complex_data

    async def crawl_multiple_complexes(self, complex_numbers: List[str]) -> List[Dict]:
        """여러 단지 크롤링"""
        results = []
        
        for i, complex_no in enumerate(complex_numbers, 1):
            print(f"\n진행률: {i}/{len(complex_numbers)}")
            
            try:
                complex_data = await self.crawl_complex_data(complex_no)
                results.append(complex_data)
                
                # 단지 간 요청 간격 조절
                if i < len(complex_numbers):
                    await asyncio.sleep(self.request_delay * 2)
                    
            except Exception as e:
                print(f"단지 {complex_no} 크롤링 실패: {e}")
                results.append({
                    'complex_no': complex_no,
                    'error': str(e),
                    'crawling_date': datetime.now().isoformat()
                })
        
        return results

    def save_data(self, data: Any, filename_prefix: str = "naver_complex"):
        """데이터 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # JSON 저장
            json_filename = self.output_dir / f"{filename_prefix}_{timestamp}.json"
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
                    csv_filename = self.output_dir / f"{filename_prefix}_{timestamp}.csv"
                    df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
                    print(f"CSV 데이터 저장: {csv_filename}")
            
        except Exception as e:
            print(f"데이터 저장 중 오류: {e}")

    async def run_crawling(self, complex_numbers: List[str]):
        """크롤링 실행"""
        try:
            # 브라우저 설정
            await self.setup_browser()
            
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
            
            success_count = len([r for r in results if 'overview' in r])
            error_count = len([r for r in results if 'error' in r])
            print(f"성공: {success_count}개, 실패: {error_count}개")
            
            return results
            
        except Exception as e:
            print(f"크롤링 실행 중 오류: {e}")
            raise
        finally:
            await self.close_browser()


async def main():
    """메인 함수"""
    import sys
    
    # 크롤러 인스턴스 생성
    crawler = NASNaverRealEstateCrawler()
    
    # 명령행 인자 처리
    if len(sys.argv) > 1:
        complex_numbers = sys.argv[1].split(',')
        complex_numbers = [num.strip() for num in complex_numbers if num.strip()]
    else:
        # 기본값: 동탄시범다은마을월드메르디앙반도유보라
        complex_numbers = ['22065']
    
    print(f"크롤링 대상 단지: {complex_numbers}")
    
    # 크롤링 실행
    await crawler.run_crawling(complex_numbers)


if __name__ == "__main__":
    asyncio.run(main())
