package com.fleetpulse.agent.data.remote.dto

data class NotificationSyncRequest(
    val notifications: List<NotificationItem>
)

data class NotificationItem(
    val appPackage: String,
    val title: String?,
    val text: String?,
    val timestamp: String,
    val extras: Map<String, String>? = null
)
