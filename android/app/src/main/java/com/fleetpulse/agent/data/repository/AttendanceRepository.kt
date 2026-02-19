package com.fleetpulse.agent.data.repository

import android.content.Context
import android.net.Uri
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.ClockOutRequest
import com.fleetpulse.agent.util.PhotoUtils
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AgentApiService
) {
    suspend fun clockIn(
        selfieUri: Uri?,
        latitude: Double,
        longitude: Double,
        shiftId: String?
    ): Result<String?> {
        return try {
            val latBody = PhotoUtils.textRequestBody(latitude.toString())
            val lngBody = PhotoUtils.textRequestBody(longitude.toString())
            val shiftBody = shiftId?.let { PhotoUtils.textRequestBody(it) }

            val selfiePart = selfieUri?.let { uri ->
                val tempFile = PhotoUtils.createTempPhotoFile(context, "selfie")
                val compressedFile = PhotoUtils.compressPhoto(context, uri, tempFile)
                PhotoUtils.fileToMultipartPart(compressedFile, "selfie")
            }

            val response = api.clockIn(latBody, lngBody, shiftBody, selfiePart)
            if (response.isSuccessful) {
                Result.success(response.body()?.selfieUrl)
            } else {
                Result.failure(Exception("Clock in failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun clockOut(
        latitude: Double,
        longitude: Double,
        shiftId: String?
    ): Result<Unit> {
        return try {
            val request = ClockOutRequest(
                latitude = latitude,
                longitude = longitude,
                shiftId = shiftId
            )
            val response = api.clockOut(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Clock out failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
