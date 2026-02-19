package com.fleetpulse.agent.data.remote.dto

data class CommandDto(
    val id: String,
    val commandType: String,
    val payload: Map<String, Any>? = null
)
