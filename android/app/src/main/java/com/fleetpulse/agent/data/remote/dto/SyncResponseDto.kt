package com.fleetpulse.agent.data.remote.dto

data class SyncResponse(
    val received: Int? = null,
    val message: String
)

data class ActionResponse(
    val message: String,
    val id: String? = null,
    val selfieUrl: String? = null
)
