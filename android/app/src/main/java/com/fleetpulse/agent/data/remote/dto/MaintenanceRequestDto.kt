package com.fleetpulse.agent.data.remote.dto

data class MaintenanceRequestCreate(
    val vehicleId: String,
    val category: String = "unscheduled",
    val type: String,
    val description: String? = null,
    val cost: Double? = null
)
