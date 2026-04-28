# Virtual Thread vs Coroutine 벤치마크

VT Arena : Virtual Thread Arena

> Spring Boot 3.2+ 환경에서 Virtual Thread와 Kotlin Coroutine의 성능을 직접 비교하는 3시간짜리 실습 가이드

---

## 타임라인

| 시간 | 단계 | 내용 |
|------|------|------|
| 0:00 ~ 0:30 | 프로젝트 세팅 | Spring Boot 프로젝트 생성, 의존성 구성 |
| 0:30 ~ 1:15 | API 구현 | Virtual Thread / Coroutine 엔드포인트 각각 구현 |
| 1:15 ~ 2:00 | 부하 테스트 | k6로 단계별 동시 요청 테스트 |
| 2:00 ~ 2:30 | 비교 분석 | 응답시간, TPS, 스레드 수, 메모리 비교 |
| 2:30 ~ 3:00 | 추가 실험 | Virtual Thread pinning 이슈 확인 |

---

## 1. 프로젝트 세팅

### 의존성 (build.gradle.kts)

```kotlin
dependencies {
    // MVC + Virtual Thread
    implementation("org.springframework.boot:spring-boot-starter-web")

    // WebFlux + Coroutine
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor")
}
```

### Virtual Thread 활성화 (application.yml)

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

> Spring Boot 3.2+ 필수. Java 21 이상 필요.

---

## 2. API 구현

### 시나리오

외부 API 호출(200ms) + DB 조회(100ms)를 시뮬레이션하는 동일한 로직을 두 가지 방식으로 구현한다.

### Virtual Thread (MVC)

```kotlin
@RestController
@RequestMapping("/api/virtual-thread")
class VirtualThreadController {

    @GetMapping
    fun handle(): Map<String, Any> {
        // 외부 API 호출 시뮬레이션
        Thread.sleep(200)
        // DB 조회 시뮬레이션
        Thread.sleep(100)

        return mapOf(
            "handler" to "virtual-thread",
            "thread" to Thread.currentThread().toString(),
            "timestamp" to System.currentTimeMillis()
        )
    }
}
```

### Coroutine (WebFlux)

```kotlin
@RestController
@RequestMapping("/api/coroutine")
class CoroutineController {

    @GetMapping
    suspend fun handle(): Map<String, Any> {
        // 외부 API 호출 시뮬레이션
        delay(200)
        // DB 조회 시뮬레이션
        delay(100)

        return mapOf(
            "handler" to "coroutine",
            "thread" to Thread.currentThread().toString(),
            "timestamp" to System.currentTimeMillis()
        )
    }
}
```

> **핵심 차이**: `Thread.sleep()`은 blocking이지만 Virtual Thread에서는 자동으로 yield됨. `delay()`는 non-blocking suspend.

---

## 3. 부하 테스트 (k6)

### 설치

```bash
brew install k6
```

### 테스트 스크립트

```javascript
// virtual-thread-test.js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },   // ramp-up to 100
    { duration: '20s', target: 100 },   // hold 100
    { duration: '10s', target: 500 },   // ramp-up to 500
    { duration: '20s', target: 500 },   // hold 500
    { duration: '10s', target: 1000 },  // ramp-up to 1000
    { duration: '20s', target: 1000 },  // hold 1000
    { duration: '10s', target: 0 },     // ramp-down
  ],
};

export default function () {
  http.get('http://localhost:8080/api/virtual-thread');
  sleep(0.1);
}
```

```javascript
// coroutine-test.js — 동일 구조, URL만 변경
// http.get('http://localhost:8080/api/coroutine');
```

### 실행

```bash
# Virtual Thread 테스트
k6 run virtual-thread-test.js

# Coroutine 테스트
k6 run coroutine-test.js
```

### 측정 항목

- `http_req_duration` → 평균, p95, p99 응답시간
- `http_reqs` → 총 요청 수 / TPS
- `iterations` → 완료된 반복 수

---

## 4. JVM 모니터링

테스트 중 별도 터미널에서 스레드 수를 추적한다.

```bash
# PID 확인
jps

# 스레드 수 실시간 모니터링
watch -n 1 "jcmd <PID> Thread.print | grep -c 'Virtual'"

# 또는 간단하게
watch -n 1 "jcmd <PID> Thread.print | wc -l"
```

### VisualVM 사용 시

- 힙 메모리 사용량
- 라이브 스레드 수 변화 추이
- GC 활동

---

## 5. 비교 분석 템플릿

| 항목 | Virtual Thread | Coroutine |
|------|---------------|-----------|
| 100 VUs 평균 응답시간 | | |
| 500 VUs 평균 응답시간 | | |
| 1000 VUs 평균 응답시간 | | |
| 1000 VUs p99 | | |
| 최대 TPS | | |
| 최대 스레드 수 | | |
| 힙 메모리 피크 | | |

---

## 6. 추가 실험 — Pinning 이슈

Virtual Thread에서 `synchronized` 블록을 사용하면 carrier thread에 고정(pinning)되어 성능이 저하된다.

### Pinning 발생 코드

```kotlin
@GetMapping("/pinning")
fun handleWithPinning(): Map<String, Any> {
    synchronized(this) {
        Thread.sleep(200)
    }
    Thread.sleep(100)
    return mapOf("handler" to "pinning")
}
```

### Pinning 해결 — ReentrantLock

```kotlin
private val lock = ReentrantLock()

@GetMapping("/no-pinning")
fun handleWithoutPinning(): Map<String, Any> {
    lock.withLock {
        Thread.sleep(200)
    }
    Thread.sleep(100)
    return mapOf("handler" to "no-pinning")
}
```

### Pinning 감지 JVM 옵션

```bash
java -Djdk.tracePinnedThreads=short -jar app.jar
```

> pinning 발생 시 콘솔에 스택 트레이스가 출력된다.

---

## 핵심 포인트

- Virtual Thread는 기존 blocking 코드를 그대로 활용할 수 있어 마이그레이션 비용이 낮다
- Coroutine은 진짜 non-blocking이라 IO 스레드를 점유하지 않는다
- 동시 접속이 높아질수록 차이가 드러난다 — 직접 확인해보자
- 실무에서 `synchronized`, JDBC 드라이버 등에서 pinning이 발생할 수 있으니 반드시 체크