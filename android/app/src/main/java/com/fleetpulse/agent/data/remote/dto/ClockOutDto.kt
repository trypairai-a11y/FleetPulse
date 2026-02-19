package com.fleetpulse.agent.data.remote.dto

data class ClockOutRequest(
    val latitude: Double,
    val longitude: Double,
    val shiftId: String? = null
)
