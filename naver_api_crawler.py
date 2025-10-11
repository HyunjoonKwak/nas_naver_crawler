#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 부동산 API 크롤링 스크립트
네트워크 탭에서 확인한 API 엔드포인트를 직접 호출하여 데이터를 수집합니다.
"""

import json
import time
from datetime import datetime

import pandas as pd
import requests


class NaverRealEstateAPIClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Referer": "https://new.land.naver.com/",
                "Origin": "https://new.land.naver.com",
                "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"macOS"',
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
            }
        )
        self.results = []

    def get_complex_markers(self, lat=37.5608493, lon=126.9888325, zoom=15):
        """단지 마커 정보 조회"""
        try:
            # 좌표 계산 (지도 영역)
            lat_offset = 0.01
            lon_offset = 0.02

            params = {
                "cortarNo": "1114014100",  # 서울 중구
                "zoom": zoom,
                "priceType": "RETAIL",
                "markerId": "",
                "markerType": "",
                "selectedComplexNo": "",
                "selectedComplexBuildingNo": "",
                "fakeComplexMarker": "",
                "realEstateType": "APT:PRE:ABYG:JGC",
                "tradeType": "",
                "tag": "::::::::",
                "rentPriceMin": "0",
                "rentPriceMax": "900000000",
                "priceMin": "0",
                "priceMax": "900000000",
                "areaMin": "0",
                "areaMax": "900000000",
                "oldBuildYears": "",
                "recentlyBuildYears": "",
                "minHouseHoldCount": "",
                "maxHouseHoldCount": "",
                "showArticle": "false",
                "sameAddressGroup": "false",
                "minMaintenanceCost": "",
                "maxMaintenanceCost": "",
                "directions": "",
                "leftLon": str(lon - lon_offset),
                "rightLon": str(lon + lon_offset),
                "topLat": str(lat + lat_offset),
                "bottomLat": str(lat - lat_offset),
                "isPresale": "true",
            }

            url = "https://new.land.naver.com/api/complexes/single-markers/2.0"

            print(f"단지 마커 API 호출: {url}")
            response = self.session.get(url, params=params)

            if response.status_code == 200:
                data = response.json()
                print(f"단지 마커 {len(data)} 개 조회됨")
                return data
            else:
                print(f"API 호출 실패: {response.status_code}")
                return []

        except Exception as e:
            print(f"단지 마커 조회 중 오류: {e}")
            return []

    def get_cortars_info(self, lat=37.5608493, lon=126.9888325, zoom=15):
        """코르타르(행정구역) 정보 조회"""
        try:
            params = {"zoom": zoom, "centerLat": lat, "centerLon": lon}

            url = "https://new.land.naver.com/api/cortars"

            print(f"코르타르 API 호출: {url}")
            response = self.session.get(url, params=params)

            if response.status_code == 200:
                data = response.json()
                print(f"코르타르 정보 조회됨: {len(data)} 개")
                return data
            else:
                print(f"코르타르 API 호출 실패: {response.status_code}")
                return []

        except Exception as e:
            print(f"코르타르 정보 조회 중 오류: {e}")
            return []

    def get_development_plans(self, lat=37.5608493, lon=126.9888325, zoom=15):
        """개발계획 정보 조회"""
        development_data = {}

        # 좌표 계산
        lat_offset = 0.01
        lon_offset = 0.02

        params = {
            "zoom": zoom,
            "leftLon": lon - lon_offset,
            "rightLon": lon + lon_offset,
            "topLat": lat + lat_offset,
            "bottomLat": lat - lat_offset,
        }

        # 각종 개발계획 정보 조회
        plan_types = ["road", "rail", "station", "jigu"]

        for plan_type in plan_types:
            try:
                url = f"https://new.land.naver.com/api/developmentplan/{plan_type}/list"

                print(f"개발계획 API 호출: {plan_type}")
                response = self.session.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    development_data[plan_type] = data
                    print(f"{plan_type} 개발계획: {len(data)} 개")
                else:
                    print(f"{plan_type} 개발계획 API 호출 실패: {response.status_code}")

                time.sleep(2)  # API 호출 간격을 2초로 늘림

            except Exception as e:
                print(f"{plan_type} 개발계획 조회 중 오류: {e}")

        return development_data

    def get_complex_overview(self, complex_no):
        """특정 단지의 개요 정보 조회"""
        try:
            url = f"https://new.land.naver.com/api/complexes/overview/{complex_no}"
            params = {"complexNo": complex_no}
            
            print(f"단지 개요 API 호출: {url}")
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"단지 개요 정보 조회 성공: {data.get('complexName', 'Unknown')}")
                return data
            else:
                print(f"단지 개요 API 호출 실패: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"단지 개요 조회 중 오류: {e}")
            return None

    def get_complex_articles(self, complex_no, page=1):
        """특정 단지의 매물 목록 조회"""
        try:
            params = {
                "realEstateType": "APT:PRE:ABYG:JGC",
                "tradeType": "",
                "tag": "::::::::",
                "rentPriceMin": "0",
                "rentPriceMax": "900000000",
                "priceMin": "0",
                "priceMax": "900000000",
                "areaMin": "0",
                "areaMax": "900000000",
                "oldBuildYears": "",
                "recentlyBuildYears": "",
                "minHouseHoldCount": "",
                "maxHouseHoldCount": "",
                "showArticle": "false",
                "sameAddressGroup": "false",
                "minMaintenanceCost": "",
                "maxMaintenanceCost": "",
                "priceType": "RETAIL",
                "directions": "",
                "page": page,
                "complexNo": complex_no,
                "buildingNos": "",
                "areaNos": "",
                "type": "list",
                "order": "rank"
            }
            
            url = f"https://new.land.naver.com/api/articles/complex/{complex_no}"
            
            print(f"매물 목록 API 호출: {url} (페이지 {page})")
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"매물 목록 조회 성공: {len(data.get('articleList', []))}개")
                return data
            else:
                print(f"매물 목록 API 호출 실패: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"매물 목록 조회 중 오류: {e}")
            return None

    def get_specific_complex_data(self, complex_no):
        """특정 단지의 상세 정보 수집"""
        print(f"\n단지 번호 {complex_no} 상세 정보 수집 시작...")
        
        complex_data = {}
        
        # 1. 단지 개요 정보
        print("단지 개요 정보 수집 중...")
        overview = self.get_complex_overview(complex_no)
        if overview:
            complex_data["overview"] = overview
            print("단지 개요 정보 수집 완료")
        else:
            print("단지 개요 정보 수집 실패")
        
        # 요청 간격 조절
        print("요청 간격 조절 중... (3초 대기)")
        time.sleep(3)
        
        # 2. 매물 목록 (첫 페이지)
        print("매물 목록 수집 중...")
        articles = self.get_complex_articles(complex_no, page=1)
        if articles:
            complex_data["articles"] = articles
            print("매물 목록 수집 완료")
        else:
            print("매물 목록 수집 실패")
        
        return complex_data

    def process_complex_data(self, complex_data):
        """단지 데이터 처리 및 정리"""
        processed_data = []

        for complex_item in complex_data:
            try:
                # 가격 정보 처리
                min_price = complex_item.get("minPreSalePrice", complex_item.get("minDealPrice", 0))
                max_price = complex_item.get("maxPreSalePrice", complex_item.get("maxDealPrice", 0))
                price_info = ""
                if min_price and max_price:
                    if min_price == max_price:
                        price_info = f"{min_price:,}만원"
                    else:
                        price_info = f"{min_price:,}~{max_price:,}만원"

                # 면적 정보 처리
                min_area = complex_item.get("minPreSaleArea", complex_item.get("minArea", 0))
                max_area = complex_item.get("maxPreSaleArea", complex_item.get("maxArea", 0))
                area_info = ""
                if min_area and max_area:
                    if min_area == max_area:
                        area_info = f"{min_area}㎡"
                    else:
                        area_info = f"{min_area}~{max_area}㎡"

                # 분양 상태 처리
                sale_status = ""
                if complex_item.get("isPresales"):
                    stage_code = complex_item.get("preSaleStageCode", "")
                    if stage_code == "C11":
                        sale_status = "분양예정"
                    elif stage_code == "C12":
                        sale_status = "분양중"
                    else:
                        sale_status = "분양"
                else:
                    sale_status = "일반매매"

                processed_item = {
                    "수집시간": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "단지명": complex_item.get("complexName", ""),
                    "단지번호": complex_item.get("markerId", ""),
                    "위도": complex_item.get("latitude", complex_item.get("yCoordinate", "")),
                    "경도": complex_item.get("longitude", complex_item.get("xCoordinate", "")),
                    "주소": complex_item.get("preSaleAddress", ""),
                    "가격정보": price_info,
                    "면적정보": area_info,
                    "세대수": complex_item.get(
                        "totalHouseholdsNumber",
                        complex_item.get(
                            "preSaleHouseholdsNumber", complex_item.get("totalHouseholdCount", "")
                        ),
                    ),
                    "분양상태": sale_status,
                    "건설사": complex_item.get("buildCompany", ""),
                    "분양일": complex_item.get("preSaleStageDetails", ""),
                    "입주일": complex_item.get("occupancyYearMonth", ""),
                    "타입": complex_item.get("realEstateTypeName", ""),
                    "완공년월": complex_item.get("completionYearMonth", ""),
                    "최소거래단가": complex_item.get("minDealUnitPrice", ""),
                    "최대거래단가": complex_item.get("maxDealUnitPrice", ""),
                    "중간거래단가": complex_item.get("medianDealUnitPrice", ""),
                    "대표면적": complex_item.get("representativeArea", ""),
                    "용적률": complex_item.get("floorAreaRatio", ""),
                    "총동수": complex_item.get("totalDongCount", ""),
                    "거래건수": complex_item.get("dealCount", 0),
                    "전세건수": complex_item.get("leaseCount", 0),
                    "월세건수": complex_item.get("rentCount", 0),
                    "상세페이지URL": complex_item.get("preSaleDetailsPageURL", ""),
                    "원본데이터": json.dumps(complex_item, ensure_ascii=False),
                }

                processed_data.append(processed_item)

            except Exception as e:
                print(f"단지 데이터 처리 중 오류: {e}")
                print(f"문제가 된 데이터: {complex_item}")
                continue

        return processed_data

    def save_data(self, data, filename_prefix="naver_real_estate_api"):
        """데이터 저장"""
        if not data:
            print("저장할 데이터가 없습니다.")
            return

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        try:
            # JSON 저장
            json_filename = f"{filename_prefix}_{timestamp}.json"
            with open(json_filename, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            # CSV 저장
            if isinstance(data, list) and data:
                df = pd.DataFrame(data)
                csv_filename = f"{filename_prefix}_{timestamp}.csv"
                df.to_csv(csv_filename, index=False, encoding="utf-8-sig")
                print(f"데이터 저장 완료: {json_filename}, {csv_filename}")
            else:
                print(f"JSON 데이터 저장 완료: {json_filename}")

        except Exception as e:
            print(f"데이터 저장 중 오류: {e}")

    def crawl_real_estate_data(self, lat=37.5608493, lon=126.9888325, zoom=15):
        """부동산 데이터 전체 크롤링"""
        print("=" * 60)
        print("네이버 부동산 API 크롤링 시작")
        print(f"위치: 위도 {lat}, 경도 {lon}, 줌 레벨 {zoom}")
        print("=" * 60)

        all_data = {}

        # 1. 단지 마커 정보 수집
        print("\n1. 단지 마커 정보 수집 중...")
        complex_data = self.get_complex_markers(lat, lon, zoom)
        if complex_data:
            processed_complex_data = self.process_complex_data(complex_data)
            all_data["complexes"] = processed_complex_data
            print(f"단지 정보 {len(processed_complex_data)}개 수집 완료")

        time.sleep(5)  # 요청 간격을 5초로 늘림

        # 2. 코르타르 정보 수집
        print("\n2. 행정구역 정보 수집 중...")
        cortars_data = self.get_cortars_info(lat, lon, zoom)
        if cortars_data:
            all_data["cortars"] = cortars_data
            print(f"행정구역 정보 {len(cortars_data)}개 수집 완료")

        time.sleep(5)  # 요청 간격을 5초로 늘림

        # 3. 개발계획 정보 수집
        print("\n3. 개발계획 정보 수집 중...")
        development_data = self.get_development_plans(lat, lon, zoom)
        if development_data:
            all_data["development_plans"] = development_data
            print("개발계획 정보 수집 완료")

        # 4. 데이터 저장
        print("\n4. 데이터 저장 중...")
        if all_data:
            self.save_data(all_data)

            # 단지 정보만 별도 저장
            if "complexes" in all_data:
                self.save_data(all_data["complexes"], "naver_complexes")

        print("\n=" * 60)
        print("크롤링 완료")
        print("=" * 60)

        return all_data


def main():
    """메인 함수"""
    import sys
    
    # API 클라이언트 생성
    client = NaverRealEstateAPIClient()

    # 명령행 인자로 단지 번호가 주어진 경우
    if len(sys.argv) > 1:
        complex_no = sys.argv[1]
        print(f"특정 단지 번호 {complex_no} 크롤링 시작...")
        
        # 특정 단지 정보 수집
        data = client.get_specific_complex_data(complex_no)
        
        if data:
            # 데이터 저장
            client.save_data(data, f"naver_complex_{complex_no}")
            
            # 결과 요약 출력
            print("\n=== 수집 결과 요약 ===")
            if "overview" in data:
                overview = data["overview"]
                print(f"단지명: {overview.get('complexName', 'Unknown')}")
                print(f"단지번호: {overview.get('complexNo', 'Unknown')}")
                print(f"세대수: {overview.get('totalHouseHoldCount', 'Unknown')}")
                print(f"동수: {overview.get('totalDongCount', 'Unknown')}")
                print(f"사용승인일: {overview.get('useApproveYmd', 'Unknown')}")
                print(f"최소면적: {overview.get('minArea', 'Unknown')}㎡")
                print(f"최대면적: {overview.get('maxArea', 'Unknown')}㎡")
                print(f"최소가격: {overview.get('minPrice', 'Unknown')}만원")
                print(f"최대가격: {overview.get('maxPrice', 'Unknown')}만원")
            
            if "articles" in data:
                articles = data["articles"]
                if "articleList" in articles:
                    print(f"매물 수: {len(articles['articleList'])}개")
        else:
            print("데이터 수집 실패")
    else:
        # 기본 크롤링 실행 (서울 강남구 테헤란로 주변)
        data = client.crawl_real_estate_data(
            lat=37.5665, lon=127.0780, zoom=15  # 위도  # 경도  # 줌 레벨
        )

        # 결과 요약 출력
        if data:
            print("\n=== 수집 결과 요약 ===")
            if "complexes" in data:
                print(f"단지 정보: {len(data['complexes'])}개")
            if "cortars" in data:
                print(f"행정구역 정보: {len(data['cortars'])}개")
            if "development_plans" in data:
                for plan_type, plan_data in data["development_plans"].items():
                    print(f"{plan_type} 개발계획: {len(plan_data)}개")


if __name__ == "__main__":
    main()
