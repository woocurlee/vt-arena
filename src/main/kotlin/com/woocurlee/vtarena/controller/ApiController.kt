package com.woocurlee.vtarena.controller

import com.woocurlee.vtarena.service.CoroutineService
import com.woocurlee.vtarena.service.VirtualThreadService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class ApiController(
    private val virtualThreadService: VirtualThreadService,
    private val coroutineService: CoroutineService
) {
    @GetMapping("/api/virtual-thread")
    fun getDataByVirtualThread(): Boolean {
        return virtualThreadService.getDataByVirtualThread()
    }

    @GetMapping("/api/coroutine")
    suspend fun getDataByCoroutine(): Boolean {
        return coroutineService.getDataByCoroutine()
    }
}