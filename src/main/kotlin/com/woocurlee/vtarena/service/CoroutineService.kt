package com.woocurlee.vtarena.service

import kotlinx.coroutines.delay
import org.springframework.stereotype.Service

@Service
class CoroutineService {
    suspend fun getDataByCoroutine(): Boolean {
        println("======= coroutine =======")

        // 외부 API 호출
        delay(2000L)

        // DB 조회
        delay(1000L)

        println(Thread.currentThread())

        return true
    }
}