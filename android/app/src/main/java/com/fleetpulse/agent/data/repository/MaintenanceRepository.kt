package com.fleetpulse.agent.data.repository

import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.MaintenanceRequestCreate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MaintenanceRepository @Inject constructor(
    private val api: AgentApiService
) {
    suspend fun submitRequest(
        vehicleId: String,
        category: String,
        type: String,
        description: String?,
        cost: Double?
    ): Result<String> {
        return try {
            val request = MaintenanceRequestCreate(
                vehicleId = vehicleId,
                category = category,
                type = type,
                description = description,
                cost = cost
            )

            val response = api.submitMaintenanceRequest(request)
            if (response.isSuccessful) {
                Result.success(response.body()?.id ?: "")
            } else {
                Result.failure(Exception("Maintenance request failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
