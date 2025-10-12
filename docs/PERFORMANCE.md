# ⚡ 성능 최적화 가이드

> **버전**: v1.1.0
> **최종 업데이트**: 2025-10-12
> **달성 목표**: 크롤링 속도 51.3% 개선 ✅

---

## 📊 성능 개선 요약

### 최종 결과
```
원본 (Quick Fix 이전):  516,854ms (8분 37초)
현재 (v1.1.0):          251,633ms (4분 12초)
개선률:                 -51.3% ✅
```

### 처리 속도
```
매물 수집 속도:  0.48 → 0.99 매물/초 (+106%)
스크롤 효율:     2.34 → 3.57 매물/스크롤 (+53%)
성공률:          100% (5/5 단지)
데이터 무결성:   100% (250개 매물)
```

---

## 🔧 적용된 최적화

### 1. domcontentloaded 전환 (-32.5%)

**변경 전**:
```python
await self.page.goto(url, wait_until='networkidle')
# networkidle: 모든 네트워크 요청 완료까지 대기
# 평균 10-15초 소요
```

**변경 후**:
```python
await self.page.goto(url, wait_until='domcontentloaded', timeout=15000)
# domcontentloaded: DOM 로딩 완료 즉시 진행
# 평균 2-3초 소요
```

**효과**:
- 초기 페이지 로딩 시간 5-10초 단축
- "Execution context was destroyed" 에러 해결
- 첫 번째 단지 크롤링 성공률 100%

**파일**: `logic/nas_playwright_crawler.py` (Line 162, 184, 258)

---

### 2. API 대기 시간 단축

**변경 전**:
```python
await asyncio.sleep(2.5)  # API 응답 대기
```

**변경 후**:
```python
await asyncio.sleep(1.5)  # 1초 단축
```

**효과**:
- 단지당 평균 5-10초 절약
- API 응답은 보통 0.5-1초 내 완료되므로 안전

**파일**: `logic/nas_playwright_crawler.py` (Line 444)

---

### 3. 빠른 종료 조건 (-77% 종료 시간)

**변경 전**:
```python
max_scroll_end = 8  # 8회 연속 스크롤 실패 시 종료
```

**변경 후**:
```python
max_scroll_end = 3  # 3회 연속 스크롤 실패 시 종료
```

**효과**:
- 종료 감지 시간 77% 단축 (8초 → 2초)
- 스크롤 끝 도달 시 빠른 종료
- 데이터 수집에는 영향 없음

**파일**: `logic/nas_playwright_crawler.py` (Line 378)

---

### 4. 동적 대기 시간 시스템 (-20.4%)

**핵심 아이디어**:
- API가 최근에 감지되었다면 → 곧 또 올 것 (짧게 대기)
- API가 한동안 없었다면 → 더 기다려야 함 (길게 대기)

**구현**:
```python
# API 감지 시간 추적
last_api_time = [0]

# API 응답 시 시간 기록
if f'/api/articles/complex/{complex_no}' in response.url:
    last_api_time[0] = time.time()

# 동적 대기 시간 계산
time_since_last_api = time.time() - last_api_time[0]

if time_since_last_api < 0.5:  # 최근 0.5초 이내 감지
    wait_time = 0.3  # 짧게 대기
else:
    wait_time = 1.0  # 길게 대기

await asyncio.sleep(wait_time)
```

**효과**:
- 평균 대기 시간 47% 감소 (1.5s → 0.8s)
- 처리 속도 87% 향상 (0.48 → 0.90 매물/초)
- 277,649ms (4분 38초) 달성

**파일**: `logic/nas_playwright_crawler.py` (Line 204, 211, 447-459)

---

### 5. 스크롤 거리 증가 (-9.4%)

**변경 전**:
```python
container.scrollTop += 500;  # 500px씩 스크롤
```

**변경 후**:
```python
container.scrollTop += 800;  # 800px씩 스크롤 (60% 증가)
```

**효과**:
- 스크롤 시도 횟수 35% 감소 (107회 → 70회)
- 단지당 평균 5-7회 스크롤 절약
- 251,633ms (4분 12초) 달성

**상세 비교** (5개 단지):
```
단지 109208 (47개):  19회 → 14회 (-26%)
단지 1482 (23개):    11회 → 8회  (-27%)
단지 22065 (64개):   28회 → 17회 (-39%)
단지 128001 (50개):  20회 → 14회 (-30%)
단지 122000 (66개):  29회 → 17회 (-41%)
```

**파일**: `logic/nas_playwright_crawler.py` (Line 417-420)

---

### 6. 성공/실패 카운팅 수정

**변경 전** (부정확):
```python
# 'overview' 키만 체크 (실제 데이터 확인 안 함)
success_count = len([r for r in results if 'overview' in r])
```

**변경 후** (정확):
```python
# 실제 articles 데이터 확인
success_count = len([
    r for r in results
    if 'articles' in r and r.get('articles', {}).get('articleList')
])
error_count = len(results) - success_count
```

**효과**:
- 정확한 성공률 표시
- 디버깅 용이

**파일**: `logic/nas_playwright_crawler.py` (Line 708-712)

---

## 📈 최적화 타임라인

### Phase 1: Quick Fix (2025-10-12 오전)
```
적용: domcontentloaded + API 대기 단축 + 빠른 종료
결과: 516,854ms → 348,982ms (-32.5%)
```

### Phase 2: Dynamic Wait (2025-10-12 오후)
```
적용: 동적 대기 시간 시스템
결과: 348,982ms → 277,649ms (-46.3%, 추가 -20.4%)
```

### Phase 3: Scroll Optimization Failed (2025-10-12)
```
시도: clientHeight 기반 스크롤 (70%)
결과: 277,649ms → 290,804ms (+13초) ❌
문제: 스크롤 거리 감소 (500px → 400px)
롤백: 즉시 롤백
```

### Phase 4: Scroll Distance Increase (2025-10-12)
```
적용: 800px 고정 스크롤
결과: 277,649ms → 251,633ms (-51.3%, 추가 -9.4%)
성공: 최종 목표 달성 ✅
```

---

## 🚫 보류된 최적화

### 1. 병렬 처리 (Parallel Processing)

**예상 효과**: -50% (4분 12초 → 2분 6초)

**보류 이유**:
- 네이버 서버 차단 위험
- 동일 IP에서 2-3개 세션 동시 접속
- 명확한 자동화 패턴 노출

**위험도 평가**:
```
2개 병렬: ⚠️  중간 위험 (허용 가능)
3개 병렬: 🚨 높은 위험 (차단 가능성)
5개+ 병렬: 🔴 매우 높음 (차단 확실)
```

**향후 계획**:
- 테스트 환경에서 2개 병렬 시도
- 차단 발생 시 즉시 롤백
- 안전성 확인 후 프로덕션 적용

---

### 2. 더 공격적인 대기 시간

**현재**:
```python
API 감지: 0.3s
미감지: 1.0s
```

**제안**:
```python
API 감지: 0.2s  (-33%)
미감지: 0.7s    (-30%)
```

**예상 효과**: -10-15%

**보류 이유**:
- API 응답 놓칠 가능성
- 데이터 무결성 > 속도
- 현재 성능으로 충분

---

### 3. 스크롤 거리 1000px

**현재**: 800px
**제안**: 1000px (+25%)

**예상 효과**: -5-10%

**보류 이유**:
- 일부 API 호출 놓칠 가능성
- 800px에서 이미 충분한 개선
- 리스크 대비 효과 낮음

---

## 🧪 성능 측정 방법

### 로컬 테스트
```bash
# 5개 단지 크롤링 (표준 테스트)
docker-compose exec web python -m logic.nas_playwright_crawler \
  --complex-nos 109208,1482,22065,128001,122000

# 로그에서 총 시간 확인
grep "POST /api/crawl" logs/*.log | tail -1
```

### 지표 수집
```python
# 크롤링 시작 시간
start_time = time.time()

# 크롤링 종료 시간
end_time = time.time()

# 총 소요 시간 (ms)
total_time = (end_time - start_time) * 1000

# 처리 속도 (매물/초)
speed = total_articles / (total_time / 1000)

# 스크롤 효율 (매물/스크롤)
efficiency = total_articles / total_scroll_attempts
```

---

## 📊 벤치마크 결과

### 테스트 환경
- **단지 수**: 5개
- **총 매물**: 250개
- **평균 매물/단지**: 50개
- **Docker**: Desktop 4.x
- **시스템**: macOS (M-series)

### 결과 데이터

| 버전 | 시간 (ms) | 시간 (분:초) | 개선률 | 속도 (매물/초) | 스크롤 효율 |
|------|-----------|--------------|--------|---------------|------------|
| v1.0.0 (원본) | 516,854 | 8:37 | 0% | 0.48 | 2.34 |
| Quick Fix | 348,982 | 5:49 | -32.5% | 0.72 | 2.34 |
| Dynamic Wait | 277,649 | 4:38 | -46.3% | 0.90 | 2.34 |
| Failed Opt | 290,804 | 4:51 | -43.7% | 0.86 | 2.34 |
| **v1.1.0 (현재)** | **251,633** | **4:12** | **-51.3%** | **0.99** | **3.57** |

---

## 💡 최적화 팁

### 1. 스크롤 거리 조정
```python
# 매물이 많은 단지 (100+ 매물)
container.scrollTop += 1000;  # 더 빠르게

# 매물이 적은 단지 (< 50 매물)
container.scrollTop += 800;   # 현재 설정 유지
```

### 2. 대기 시간 프로파일
```python
# 프로덕션 (안정성 우선)
API_DETECTED_WAIT = 0.3
API_NOT_DETECTED_WAIT = 1.0

# 개발 환경 (속도 우선)
API_DETECTED_WAIT = 0.2
API_NOT_DETECTED_WAIT = 0.7
```

### 3. 종료 조건
```python
# 데이터 많은 단지
max_scroll_end = 5  # 더 기다림

# 데이터 적은 단지
max_scroll_end = 3  # 현재 설정
```

---

## 🔍 디버깅

### 성능 로그 확인
```bash
# 크롤링 시간 확인
grep "POST /api/crawl" docker-compose.log

# 스크롤 시도 횟수
grep "시도.*회" docker-compose.log | wc -l

# API 호출 횟수
grep "API 호출 감지" docker-compose.log | wc -l
```

### 병목 지점 분석
```python
# 각 단계별 시간 측정
import time

# 페이지 로딩
start = time.time()
await self.page.goto(url, wait_until='domcontentloaded')
print(f"페이지 로딩: {time.time() - start:.2f}초")

# 스크롤 시간
start = time.time()
# ... 스크롤 로직
print(f"스크롤 완료: {time.time() - start:.2f}초")

# 데이터 저장
start = time.time()
# ... 저장 로직
print(f"저장 완료: {time.time() - start:.2f}초")
```

---

## 📚 참고 자료

- [Playwright Performance](https://playwright.dev/docs/performance)
- [네이버 부동산 API 분석](docs/API_ANALYSIS.md)
- [최적화 실험 로그](logs/optimization_experiments.md)

---

## ✅ 체크리스트

성능 최적화 시 확인할 항목:

- [ ] 데이터 무결성 100% (누락 없음)
- [ ] 성공률 100% (모든 단지 완료)
- [ ] 에러 로그 없음
- [ ] 메모리 사용량 정상
- [ ] CPU 사용량 정상

---

**최적화 완료! 🎉**
