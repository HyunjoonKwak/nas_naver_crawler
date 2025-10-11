#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NAS 환경용 네이버 부동산 크롤러 스케줄러
정기적으로 크롤링을 실행하는 스케줄링 서비스
"""

import asyncio
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv
from loguru import logger

# 환경변수 로드
load_dotenv('config.env')

# 로그 설정
logger.add(
    "logs/scheduler_{time}.log",
    rotation="1 day",
    retention="30 days",
    level=os.getenv('LOG_LEVEL', 'INFO')
)


class CrawlerScheduler:
    """크롤러 스케줄링 관리 클래스"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.crawler_module = None
        self.complex_numbers = self._parse_complex_numbers()
        self.schedule_cron = os.getenv('SCHEDULE', '0 9 * * *')  # 기본값: 매일 오전 9시
        
        # 로그 디렉토리 생성
        Path('logs').mkdir(exist_ok=True)
        
        logger.info(f"스케줄러 초기화 완료")
        logger.info(f"크롤링 대상 단지: {self.complex_numbers}")
        logger.info(f"스케줄 설정: {self.schedule_cron}")

    def _parse_complex_numbers(self) -> List[str]:
        """환경변수에서 단지 번호들 파싱"""
        complex_numbers_str = os.getenv('COMPLEX_NUMBERS', '22065')
        return [num.strip() for num in complex_numbers_str.split(',') if num.strip()]

    async def run_crawler(self):
        """크롤러 실행"""
        try:
            logger.info("스케줄된 크롤링 시작")
            
            # 크롤러 모듈 동적 임포트
            if not self.crawler_module:
                from nas_playwright_crawler import NASNaverRealEstateCrawler
                self.crawler_module = NASNaverRealEstateCrawler
            
            # 크롤러 인스턴스 생성 및 실행
            crawler = self.crawler_module()
            await crawler.run_crawling(self.complex_numbers)
            
            logger.info("스케줄된 크롤링 완료")
            
            # 알림 발송 (설정된 경우)
            await self.send_notification("크롤링 완료", f"{len(self.complex_numbers)}개 단지 크롤링이 완료되었습니다.")
            
        except Exception as e:
            logger.error(f"크롤링 실행 중 오류: {e}")
            await self.send_notification("크롤링 실패", f"크롤링 중 오류가 발생했습니다: {str(e)}")

    async def send_notification(self, title: str, message: str):
        """알림 발송"""
        try:
            # 이메일 알림
            if os.getenv('EMAIL_NOTIFICATIONS', 'false').lower() == 'true':
                await self.send_email_notification(title, message)
            
            # 웹훅 알림
            webhook_url = os.getenv('WEBHOOK_URL')
            if webhook_url:
                await self.send_webhook_notification(title, message)
                
        except Exception as e:
            logger.error(f"알림 발송 실패: {e}")

    async def send_email_notification(self, title: str, message: str):
        """이메일 알림 발송"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            smtp_server = os.getenv('SMTP_SERVER')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_username = os.getenv('SMTP_USERNAME')
            smtp_password = os.getenv('SMTP_PASSWORD')
            notification_email = os.getenv('NOTIFICATION_EMAIL')
            
            if not all([smtp_server, smtp_username, smtp_password, notification_email]):
                logger.warning("이메일 설정이 불완전합니다.")
                return
            
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = notification_email
            msg['Subject'] = f"[부동산 크롤러] {title}"
            
            body = f"""
            부동산 크롤러 알림
            
            제목: {title}
            메시지: {message}
            시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # SMTP 서버 연결 및 메일 발송
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info("이메일 알림 발송 완료")
            
        except Exception as e:
            logger.error(f"이메일 알림 발송 실패: {e}")

    async def send_webhook_notification(self, title: str, message: str):
        """웹훅 알림 발송"""
        try:
            import aiohttp
            
            webhook_url = os.getenv('WEBHOOK_URL')
            
            payload = {
                "text": f"[부동산 크롤러] {title}",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*{title}*\n{message}\n시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                        }
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info("웹훅 알림 발송 완료")
                    else:
                        logger.error(f"웹훅 알림 발송 실패: {response.status}")
                        
        except Exception as e:
            logger.error(f"웹훅 알림 발송 실패: {e}")

    def setup_schedule(self):
        """스케줄 설정"""
        try:
            # cron 형식 파싱
            cron_parts = self.schedule_cron.split()
            if len(cron_parts) != 5:
                logger.error(f"잘못된 cron 형식: {self.schedule_cron}")
                return
            
            minute, hour, day, month, day_of_week = cron_parts
            
            # 스케줄 추가
            self.scheduler.add_job(
                self.run_crawler,
                CronTrigger(
                    minute=minute,
                    hour=hour,
                    day=day,
                    month=month,
                    day_of_week=day_of_week
                ),
                id='naver_crawler_job',
                name='네이버 부동산 크롤러',
                replace_existing=True
            )
            
            logger.info(f"스케줄 설정 완료: {self.schedule_cron}")
            
        except Exception as e:
            logger.error(f"스케줄 설정 실패: {e}")

    async def run(self):
        """스케줄러 실행"""
        try:
            # 스케줄 설정
            self.setup_schedule()
            
            # 스케줄러 시작
            self.scheduler.start()
            logger.info("스케줄러 시작됨")
            
            # 즉시 실행 옵션 (환경변수로 제어)
            if os.getenv('RUN_IMMEDIATELY', 'false').lower() == 'true':
                logger.info("즉시 실행 모드")
                await self.run_crawler()
            
            # 스케줄러가 실행 중인 동안 대기
            while True:
                await asyncio.sleep(60)  # 1분마다 체크
                
                # 스케줄러 상태 확인
                if not self.scheduler.running:
                    logger.warning("스케줄러가 중지되었습니다. 재시작합니다.")
                    self.scheduler.start()
                    
        except KeyboardInterrupt:
            logger.info("스케줄러 종료 요청됨")
        except Exception as e:
            logger.error(f"스케줄러 실행 중 오류: {e}")
        finally:
            # 스케줄러 종료
            if self.scheduler.running:
                self.scheduler.shutdown()
            logger.info("스케줄러 종료됨")


async def main():
    """메인 함수"""
    logger.info("부동산 크롤러 스케줄러 시작")
    
    scheduler = CrawlerScheduler()
    await scheduler.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("프로그램이 중단되었습니다.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"프로그램 실행 중 오류: {e}")
        sys.exit(1)
