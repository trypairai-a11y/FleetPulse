package com.fleetpulse.agent.data.remote.dto

data class ConfigDto(
    val syncIntervalSeconds: Int = 30,
    val locationIntervalSeconds: Int = 10,
    val heartbeatIntervalSeconds: Int = 300,
    val monitoredApps: List<String> = emptyList(),
    val deviceConfig: Map<String, Any>? = null
)
