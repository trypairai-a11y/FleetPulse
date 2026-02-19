package com.fleetpulse.agent.data.remote.dto

data class HeartbeatRequest(
    val batteryLevel: Int? = null,
    val isCharging: Boolean? = null,
    val networkType: String? = null,
    val signalStrength: Int? = null,
    val storageFreeMb: Int? = null,
    val appVersion: String? = null,
    val osVersion: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)
