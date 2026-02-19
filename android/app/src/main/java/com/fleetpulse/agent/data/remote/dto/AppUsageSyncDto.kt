package com.fleetpulse.agent.data.remote.dto

data class AppUsageSyncRequest(
    val records: List<AppUsageItem>
)

data class AppUsageItem(
    val appPackage: String,
    val appName: String? = null,
    val eventType: String = "foreground",
    val durationSeconds: Int? = null,
    val recordedAt: String
)
