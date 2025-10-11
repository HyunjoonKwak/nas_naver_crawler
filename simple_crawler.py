#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
간단한 네이버 부동산 크롤러 (Playwright 없이 requests 사용)
NAS 환경에서 안정적으로 동작하는 버전
"""

import asyncio
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import aiohttp
import pandas as pd
from dotenv import load_dotenv
from loguru import logger

# 환경변수 로드
load_dotenv('config.env')

# 로그 설정
logger.add(
    "logs/simple_crawler_{time}.log",
    rotation="1 day",
    retention="30 days",
    level=os.getenv('LOG_LEVEL', 'INFO')
)


class SimpleNaverRealEstateCrawler:
    """간단한 네이버 부동산 크롤러 (Playwright 없이)"""
    
    def __init__(self):
        self.session = None
        self.output_dir = Path(os.getenv('OUTPUT_DIR', './crawled_data'))
        self.output_dir.mkdir(exist_ok=True)
        
        # 크롤링 설정
        self.request_delay = float(os.getenv('REQUEST_DELAY', '2.0'))
        self.timeout = int(os.getenv('TIMEOUT', '30000'))
        
        logger.info(f"간단한 크롤러 초기화 완료")
        logger.info(f"출력 디렉토리: {self.output_dir}")
        logger.info(f"요청 간격: {self.request_delay}초")

    async def setup_session(self):
        """HTTP 세션 설정"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://new.land.naver.com/',
                'Origin': 'https://new.land.naver.com',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Linux"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
            }
            
            timeout = aiohttp.ClientTimeout(total=self.timeout / 1000)
            self.session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout
            )
            
            logger.info("HTTP 세션 설정 완료")
            
        except Exception as e:
            logger.error(f"HTTP 세션 설정 실패: {e}")
            raise

    async def close_session(self):
        """HTTP 세션 종료"""
        if self.session:
            await self.session.close()
            logger.info("HTTP 세션 종료 완료")

    async def get_complex_overview(self, complex_no: str) -> Optional[Dict]:
        """단지 개요 정보 크롤링"""
        try:
            logger.info(f"단지 개요 정보 크롤링 시작: {complex_no}")
            
            url = f"https://new.land.naver.com/api/complexes/overview/{complex_no}"
            params = {"complexNo": complex_no}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"단지 개요 정보 조회 성공: {data.get('complexName', 'Unknown')}")
                    return data
                else:
                    logger.error(f"단지 개요 API 호출 실패: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"단지 개요 크롤링 실패: {e}")
            return None

    async def get_complex_articles(self, complex_no: str, page_num: int = 1) -> Optional[Dict]:
        """단지 매물 목록 크롤링"""
        try:
            logger.info(f"매물 목록 크롤링 시작: {complex_no}, 페이지 {page_num}")
            
            url = f"https://new.land.naver.com/api/articles/complex/{complex_no}"
            params = {
                'realEstateType': 'APT:PRE:ABYG:JGC',
                'tradeType': '',
                'tag': '::::::::',
                'rentPriceMin': '0',
                'rentPriceMax': '900000000',
                'priceMin': '0',
                'priceMax': '900000000',
                'areaMin': '0',
                'areaMax': '900000000',
                'oldBuildYears': '',
                'recentlyBuildYears': '',
                'minHouseHoldCount': '',
                'maxHouseHoldCount': '',
                'showArticle': 'false',
                'sameAddressGroup': 'false',
                'minMaintenanceCost': '',
                'maxMaintenanceCost': '',
                'priceType': 'RETAIL',
                'directions': '',
                'page': str(page_num),
                'complexNo': complex_no,
                'buildingNos': '',
                'areaNos': '',
                'type': 'list',
                'order': 'rank'
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    article_count = len(data.get('articleList', []))
                    logger.info(f"매물 목록 API 호출 성공: {article_count}개 매물")
                    return data
                else:
                    logger.error(f"매물 목록 API 호출 실패: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"매물 목록 크롤링 실패: {e}")
            return None

    async def crawl_complex_data(self, complex_no: str) -> Dict:
        """단지 전체 데이터 크롤링"""
        logger.info(f"\n{'='*60}")
        logger.info(f"단지 번호 {complex_no} 크롤링 시작")
        logger.info(f"{'='*60}")
        
        complex_data = {
            'crawling_info': {
                'complex_no': complex_no,
                'crawling_date': datetime.now().isoformat(),
                'crawler_version': 'simple-1.0.0'
            }
        }
        
        try:
            # 1. 단지 개요 정보
            overview = await self.get_complex_overview(complex_no)
            if overview:
                complex_data['overview'] = overview
                logger.info(f"단지명: {overview.get('complexName', 'Unknown')}")
                logger.info(f"세대수: {overview.get('totalHouseHoldCount', 'Unknown')}")
                logger.info(f"동수: {overview.get('totalDongCount', 'Unknown')}")
            
            # 요청 간격 조절
            await asyncio.sleep(self.request_delay)
            
            # 2. 매물 목록
            articles = await self.get_complex_articles(complex_no, 1)
            if articles:
                complex_data['articles'] = articles
                article_count = len(articles.get('articleList', []))
                logger.info(f"매물 수: {article_count}개")
            
            logger.info(f"단지 {complex_no} 크롤링 완료")
            
        except Exception as e:
            logger.error(f"단지 {complex_no} 크롤링 중 오류: {e}")
            complex_data['error'] = str(e)
        
        return complex_data

    async def crawl_multiple_complexes(self, complex_numbers: List[str]) -> List[Dict]:
        """여러 단지 크롤링"""
        results = []
        
        for i, complex_no in enumerate(complex_numbers, 1):
            logger.info(f"\n진행률: {i}/{len(complex_numbers)}")
            
            try:
                complex_data = await self.crawl_complex_data(complex_no)
                results.append(complex_data)
                
                # 단지 간 요청 간격 조절
                if i < len(complex_numbers):
                    await asyncio.sleep(self.request_delay * 2)
                    
            except Exception as e:
                logger.error(f"단지 {complex_no} 크롤링 실패: {e}")
                results.append({
                    'complex_no': complex_no,
                    'error': str(e),
                    'crawling_date': datetime.now().isoformat()
                })
        
        return results

    def save_data(self, data: Any, filename_prefix: str = "simple_complex"):
        """데이터 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # JSON 저장
            json_filename = self.output_dir / f"{filename_prefix}_{timestamp}.json"
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"JSON 데이터 저장: {json_filename}")
            
            # CSV 저장 (리스트 데이터인 경우)
            if isinstance(data, list) and data and isinstance(data[0], dict):
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
                    logger.info(f"CSV 데이터 저장: {csv_filename}")
            
        except Exception as e:
            logger.error(f"데이터 저장 중 오류: {e}")

    async def run_crawling(self, complex_numbers: List[str]):
        """크롤링 실행"""
        try:
            # HTTP 세션 설정
            await self.setup_session()
            
            # 크롤링 실행
            if len(complex_numbers) == 1:
                data = await self.crawl_complex_data(complex_numbers[0])
                results = [data]
            else:
                results = await self.crawl_multiple_complexes(complex_numbers)
            
            # 데이터 저장
            self.save_data(results, f"simple_complexes_{len(complex_numbers)}")
            
            # 결과 요약
            logger.info(f"\n{'='*60}")
            logger.info("크롤링 완료")
            logger.info(f"{'='*60}")
            logger.info(f"총 {len(results)}개 단지 크롤링 완료")
            
            success_count = len([r for r in results if 'overview' in r])
            error_count = len([r for r in results if 'error' in r])
            logger.info(f"성공: {success_count}개, 실패: {error_count}개")
            
            return results
            
        except Exception as e:
            logger.error(f"크롤링 실행 중 오류: {e}")
            raise
        finally:
            await self.close_session()


async def main():
    """메인 함수"""
    import sys
    
    # 크롤러 인스턴스 생성
    crawler = SimpleNaverRealEstateCrawler()
    
    # 명령행 인자 처리
    if len(sys.argv) > 1 and sys.argv[1] not in ['--help', '-h']:
        complex_numbers = sys.argv[1].split(',')
        complex_numbers = [num.strip() for num in complex_numbers if num.strip()]
    elif len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("사용법: python simple_crawler.py [단지번호]")
        print("예시: python simple_crawler.py 22065")
        print("예시: python simple_crawler.py 22065,12345,67890")
        return
    else:
        # 기본값: 동탄시범다은마을월드메르디앙반도유보라
        complex_numbers = ['22065']
    
    logger.info(f"크롤링 대상 단지: {complex_numbers}")
    
    # 크롤링 실행
    await crawler.run_crawling(complex_numbers)


if __name__ == "__main__":
    asyncio.run(main())
