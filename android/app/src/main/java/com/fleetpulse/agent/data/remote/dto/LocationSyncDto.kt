package com.fleetpulse.agent.data.remote.dto

data class LocationSyncRequest(
    val points: List<LocationPoint>
)

data class LocationPoint(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val bearing: Float? = null,
    val altitude: Double? = null,
    val recordedAt: String
)
