package com.fleetpulse.agent.data.remote.api

import com.fleetpulse.agent.data.remote.dto.ActionResponse
import com.fleetpulse.agent.data.remote.dto.AppUsageSyncRequest
import com.fleetpulse.agent.data.remote.dto.ClockOutRequest
import com.fleetpulse.agent.data.remote.dto.CommandDto
import com.fleetpulse.agent.data.remote.dto.CommandResultRequest
import com.fleetpulse.agent.data.remote.dto.ConfigDto
import com.fleetpulse.agent.data.remote.dto.HeartbeatRequest
import com.fleetpulse.agent.data.remote.dto.LocationSyncRequest
import com.fleetpulse.agent.data.remote.dto.MaintenanceRequestCreate
import com.fleetpulse.agent.data.remote.dto.NotificationSyncRequest
import com.fleetpulse.agent.data.remote.dto.SyncResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface AgentApiService {

    @POST("api/agent/sync/notifications")
    suspend fun syncNotifications(
        @Body request: NotificationSyncRequest
    ): Response<SyncResponse>

    @POST("api/agent/sync/locations")
    suspend fun syncLocations(
        @Body request: LocationSyncRequest
    ): Response<SyncResponse>

    @POST("api/agent/sync/heartbeat")
    suspend fun sendHeartbeat(
        @Body request: HeartbeatRequest
    ): Response<SyncResponse>

    @POST("api/agent/sync/app-usage")
    suspend fun syncAppUsage(
        @Body request: AppUsageSyncRequest
    ): Response<SyncResponse>

    @Multipart
    @POST("api/agent/clockin")
    suspend fun clockIn(
        @Part("latitude") latitude: RequestBody,
        @Part("longitude") longitude: RequestBody,
        @Part("shift_id") shiftId: RequestBody?,
        @Part selfie: MultipartBody.Part?
    ): Response<ActionResponse>

    @POST("api/agent/clockout")
    suspend fun clockOut(
        @Body request: ClockOutRequest
    ): Response<ActionResponse>

    @Multipart
    @POST("api/agent/inspection")
    suspend fun submitInspection(
        @Part("vehicle_id") vehicleId: RequestBody,
        @Part("shift_id") shiftId: RequestBody?,
        @Part("checklist") checklist: RequestBody,
        @Part("overall_status") overallStatus: RequestBody,
        @Part("notes") notes: RequestBody?,
        @Part("location_lat") locationLat: RequestBody?,
        @Part("location_lng") locationLng: RequestBody?,
        @Part photos: List<MultipartBody.Part>
    ): Response<ActionResponse>

    @Multipart
    @POST("api/agent/cash-deposit")
    suspend fun submitCashDeposit(
        @Part("amount") amount: RequestBody,
        @Part("deposit_location") depositLocation: RequestBody?,
        @Part("reference_number") referenceNumber: RequestBody?,
        @Part("notes") notes: RequestBody?,
        @Part receipt: MultipartBody.Part?
    ): Response<ActionResponse>

    @POST("api/agent/maintenance-request")
    suspend fun submitMaintenanceRequest(
        @Body request: MaintenanceRequestCreate
    ): Response<ActionResponse>

    @GET("api/agent/commands")
    suspend fun getCommands(): Response<List<CommandDto>>

    @POST("api/agent/commands/{id}/result")
    suspend fun reportCommandResult(
        @Path("id") commandId: String,
        @Body result: CommandResultRequest
    ): Response<ActionResponse>

    @GET("api/agent/config")
    suspend fun getConfig(): Response<ConfigDto>
}
