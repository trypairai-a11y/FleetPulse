package com.fleetpulse.agent.data.remote.dto

data class CommandResultRequest(
    val success: Boolean,
    val output: String? = null,
    val error: String? = null
)
