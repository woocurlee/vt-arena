# Virtual Thread vs Coroutine 벤치마크

VT-Arena : Virtual Thread Arena

> Spring Boot 3.2+ 환경에서 Virtual Thread와 Kotlin Coroutine의 성능을 직접 비교하는 3시간 실습

---

## 1. 프로젝트 세팅 (0:00 ~ 0:30)

- [ ] Spring Boot 3.2+ / Java 21 / Kotlin 프로젝트 생성
- [ ] 의존성 추가: spring-web, spring-webflux, kotlinx-coroutines-core, kotlinx-coroutines-reactor
- [ ] application.yml에서 Virtual Thread 활성화 옵션 설정
- [ ] 앱 기동 확인

💡 **포인트**: MVC(web)와 WebFlux(webflux)를 동시에 쓸 때 어떤 서버가 뜨는지 확인해볼 것. 기본 동작이 예상과 다를 수 있음.

---

## 2. API 구현 (0:30 ~ 1:15)

### 시나리오

외부 API 호출(200ms) + DB 조회(100ms)를 시뮬레이션하는 동일 로직을 두 방식으로 구현.

### Virtual Thread (MVC)

- [ ] `/api/virtual-thread` 엔드포인트 생성
- [ ] blocking 방식으로 지연 구현 (`Thread.sleep`)
- [ ] 응답에 현재 스레드 정보 포함 → 나중에 Virtual Thread인지 확인용

### Coroutine (WebFlux)

- [ ] `/api/coroutine` 엔드포인트 생성 (suspend fun)
- [ ] non-blocking 방식으로 지연 구현 (`delay`)
- [ ] 동일하게 스레드 정보 포함

💡 **포인트**: `Thread.sleep` vs `delay`의 차이가 핵심. 하나는 스레드를 blocking하고, 하나는 suspend한다. 응답의 스레드 이름을 보면 차이가 보임.

---

## 3. 부하 테스트 (1:15 ~ 2:00)

- [ ] k6 설치 (`brew install k6`)
- [ ] 테스트 스크립트 작성 — stages로 VU를 100 → 500 → 1000 단계별 ramp-up
- [ ] Virtual Thread 엔드포인트 테스트 실행
- [ ] Coroutine 엔드포인트 테스트 실행 (동일 스크립트, URL만 변경)
- [ ] 각 결과의 평균/p95/p99/TPS 기록

💡 **포인트**: 두 테스트 사이에 앱을 재시작해서 JVM 상태를 초기화할 것. 안 하면 GC 영향으로 결과가 왜곡될 수 있음.

---

## 4. JVM 모니터링

테스트 중 별도 터미널에서 확인할 것들:

- [ ] `jps`로 PID 확인
- [ ] `jcmd`로 스레드 수 실시간 추적
- [ ] VisualVM 또는 JConsole로 힙 메모리, 라이브 스레드 수 모니터링

💡 **포인트**: Virtual Thread는 스레드 수가 수천 개까지 올라가도 메모리를 거의 안 먹음. 반면 Coroutine은 스레드 수 자체가 적게 유지됨. 이 차이를 눈으로 확인.

---

## 5. 비교 분석 (2:00 ~ 2:30)

| 항목 | Virtual Thread | Coroutine |
|------|---------------|-----------|
| 100 VUs 평균 응답시간 | | |
| 500 VUs 평균 응답시간 | | |
| 1000 VUs 평균 응답시간 | | |
| 1000 VUs p99 | | |
| 최대 TPS | | |
| 최대 스레드 수 | | |
| 힙 메모리 피크 | | |

스스로 답해볼 질문:
- 동시성이 올라갈수록 어느 쪽이 더 안정적인가?
- 스레드 수와 메모리 사용량은 어떤 관계인가?
- 실무에서 어떤 상황에 어떤 모델을 선택할 것인가?

---

## 6. 추가 실험 — Pinning (2:30 ~ 3:00)

- [ ] Virtual Thread 엔드포인트에 `synchronized` 블록으로 감싼 sleep 추가
- [ ] 부하 걸어서 성능 저하 확인
- [ ] `ReentrantLock`으로 교체 후 동일 테스트
- [ ] JVM 옵션 `-Djdk.tracePinnedThreads=short`로 pinning 로그 확인

💡 **포인트**: 실무에서 JDBC 드라이버, 라이브러리 내부에 `synchronized`가 숨어있는 경우가 많음. pinning이 성능을 얼마나 깎는지 체감해두면 나중에 트러블슈팅할 때 바로 떠오름.

---

## 삽질 예상 포인트

- MVC + WebFlux 동시 의존성 시 서버 타입 충돌
- Virtual Thread 활성화 안 되어 있으면 일반 platform thread로 동작 → 스레드 이름으로 꼭 확인
- k6 stages에서 VU가 너무 빠르게 올라가면 connection refused 발생 가능 → ramp-up 구간 여유 두기
- Coroutine 엔드포인트에서 실수로 `Thread.sleep` 쓰면 의미 없어짐