package com.woocurlee.vtarena.service

import org.springframework.stereotype.Service

@Service
class VirtualThreadService {
    fun getDataByVirtualThread() : Boolean{
        println("======= virtual thread ========")

        // 외부 API 호출
        Thread.sleep(2000L)

        // DB 조회
        Thread.sleep(1000L)

        println(Thread.currentThread())

        return true
    }
}