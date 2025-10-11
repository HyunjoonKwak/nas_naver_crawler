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
        self.status_file = None  # 진행 상태 파일
        self.start_time = None  # 크롤링 시작 시간
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
    
    def update_status(self, status: str, progress: int, total: int, current_complex: str = "", message: str = "", items_collected: int = 0):
        """진행 상태를 파일로 저장"""
        if not self.status_file:
            return
        
        # 경과 시간 계산
        elapsed_seconds = 0
        speed = 0.0
        estimated_total_seconds = 0
        
        if self.start_time:
            elapsed_seconds = int((datetime.now() - self.start_time).total_seconds())
            
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
            "timestamp": datetime.now().isoformat(),
            # 시간 정보
            "elapsed_seconds": elapsed_seconds,
            "estimated_total_seconds": estimated_total_seconds,
            # 속도 정보
            "items_collected": items_collected,
            "speed": speed  # 매물/초
        }
        
        try:
            with open(self.status_file, 'w', encoding='utf-8') as f:
                json.dump(status_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[WARNING] 상태 파일 업데이트 실패: {e}")

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
                    # 동일매물 묶기 적용 여부 확인
                    same_group = 'sameAddressGroup=true' in response.url or 'sameAddressGroup=Y' in response.url
                    group_status = "✅ ON" if same_group else "❌ OFF"
                    
                    print(f"[API] 호출 감지 #{len(all_articles)//20 + 1} (동일매물묶기: {group_status})")
                    if len(all_articles) == 0:  # 첫 API 호출만 전체 URL 로그
                        print(f"[API] URL: {response.url[:120]}...")
                    
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
                    except Exception as e:
                        print(f"매물 API 응답 파싱 실패: {e}")
            
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
                
                # 5. 매물 목록 컨테이너 찾기
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
                
                # 5. 점진적 스크롤로 데이터 수집 (crawler_service.py 방식)
                print("추가 매물 수집 시작 (점진적 스크롤)...")
                print(f"[설정] 최대 시도: 100회, API 대기: 2.5초, 종료 조건: 8회 연속 변화 없음")
                scroll_attempts = 0
                max_scroll_attempts = 100  # 최대 100회
                scroll_end_count = 0  # 스크롤이 안 움직이는 횟수
                max_scroll_end = 8  # 8회 연속 스크롤 안 되면 종료 (5→8 완화)
                
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
                    
                    # 네이버 실제 컨테이너로 점진적 스크롤 (500px씩)
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
                            
                            // 점진적 스크롤 (500px씩)
                            const before = container.scrollTop;
                            container.scrollTop += 500;  // ✅ 한 번에 끝까지 가지 않음
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
                    
                    # API 호출 대기 (1.5초 → 2.5초로 증가)
                    await asyncio.sleep(2.5)  # ✅ API 응답 충분히 대기
                    
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
                complex_name = overview.get('complexName', 'Unknown')
                print(f"단지명: {complex_name}")
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
                    'crawling_date': datetime.now().isoformat()
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
        # 상태 파일 및 시작 시간 설정
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.status_file = self.output_dir / f"crawl_status_{timestamp}.json"
        self.start_time = datetime.now()  # 시작 시간 기록
        
        try:
            # 브라우저 설정
            await self.setup_browser()
            
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
            
            success_count = len([r for r in results if 'overview' in r])
            error_count = len([r for r in results if 'error' in r])
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
