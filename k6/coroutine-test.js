// k6 run --out csv=coroutine.csv coroutine-test.js

import http from "k6/http";

export const options = {
    stages: [
        {duration: '10s', target: 100},    // 0 → 100 ramp-up
        {duration: '30s', target: 100},    // 100 유지 (여기서 측정)
        {duration: '10s', target: 500},    // 100 → 500 ramp-up
        {duration: '30s', target: 500},    // 500 유지 (여기서 측정)
        {duration: '10s', target: 1000},   // 500 → 1000 ramp-up
        {duration: '30s', target: 1000},   // 1000 유지 (여기서 측정)
        {duration: '10s', target: 0},      // ramp-down
    ]
}

export default function () {
    http.get("http://localhost:8080/api/coroutine")
}

/**
 * 결과
 *
 *      execution: local
 *         script: coroutine-test.js
 *         output: csv (coroutine.csv)
 *
 *      scenarios: (100.00%) 1 scenario, 1000 max VUs, 2m40s max duration (incl. graceful stop):
 *               * default: Up to 1000 looping VUs for 2m10s over 7 stages (gracefulRampDown: 30s, gracefulStop: 30s)
 *
 *
 *
 *   █ TOTAL RESULTS
 *
 *     HTTP
 *     http_req_duration..............: avg=3s min=3s med=3s max=3.22s p(90)=3.01s p(95)=3.01s
 *       { expected_response:true }...: avg=3s min=3s med=3s max=3.22s p(90)=3.01s p(95)=3.01s
 *     http_req_failed................: 0.00%  0 out of 21792
 *     http_reqs......................: 21792  163.978825/s
 *
 *     EXECUTION
 *     iteration_duration.............: avg=3s min=3s med=3s max=3.22s p(90)=3.01s p(95)=3.01s
 *     iterations.....................: 21792  163.978825/s
 *     vus............................: 19     min=9          max=1000
 *     vus_max........................: 1000   min=1000       max=1000
 *
 *     NETWORK
 *     data_received..................: 2.8 MB 21 kB/s
 *     data_sent......................: 1.8 MB 14 kB/s
 *
 *
 *
 *
 * running (2m12.9s), 0000/1000 VUs, 21792 complete and 0 interrupted iterations
 * default ✓ [======================================] 0000/1000 VUs  2m10s
 */