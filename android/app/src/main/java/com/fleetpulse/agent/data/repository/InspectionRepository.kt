package com.fleetpulse.agent.data.repository

import android.content.Context
import android.net.Uri
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.util.PhotoUtils
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InspectionRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AgentApiService,
    private val gson: Gson
) {
    suspend fun submitInspection(
        vehicleId: String,
        shiftId: String?,
        checklist: Map<String, String>,
        overallStatus: String,
        notes: String?,
        latitude: Double?,
        longitude: Double?,
        photoUris: List<Uri>
    ): Result<String> {
        return try {
            val vehicleIdBody = PhotoUtils.textRequestBody(vehicleId)
            val shiftIdBody = shiftId?.let { PhotoUtils.textRequestBody(it) }
            val checklistBody = PhotoUtils.textRequestBody(gson.toJson(checklist))
            val statusBody = PhotoUtils.textRequestBody(overallStatus)
            val notesBody = notes?.let { PhotoUtils.textRequestBody(it) }
            val latBody = latitude?.let { PhotoUtils.textRequestBody(it.toString()) }
            val lngBody = longitude?.let { PhotoUtils.textRequestBody(it.toString()) }

            val photoParts = photoUris.mapIndexed { index, uri ->
                val tempFile = PhotoUtils.createTempPhotoFile(context, "inspection_$index")
                val compressed = PhotoUtils.compressPhoto(context, uri, tempFile)
                PhotoUtils.fileToMultipartPart(compressed, "photos")
            }

            val response = api.submitInspection(
                vehicleId = vehicleIdBody,
                shiftId = shiftIdBody,
                checklist = checklistBody,
                overallStatus = statusBody,
                notes = notesBody,
                locationLat = latBody,
                locationLng = lngBody,
                photos = photoParts
            )

            if (response.isSuccessful) {
                Result.success(response.body()?.id ?: "")
            } else {
                Result.failure(Exception("Inspection submit failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
