package com.fleetpulse.agent.data.repository

import android.content.Context
import android.net.Uri
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.util.PhotoUtils
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CashRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: AgentApiService
) {
    suspend fun submitDeposit(
        amount: Double,
        depositLocation: String?,
        referenceNumber: String?,
        notes: String?,
        receiptUri: Uri?
    ): Result<String> {
        return try {
            val amountBody = PhotoUtils.textRequestBody(amount.toString())
            val locationBody = depositLocation?.let { PhotoUtils.textRequestBody(it) }
            val referenceBody = referenceNumber?.let { PhotoUtils.textRequestBody(it) }
            val notesBody = notes?.let { PhotoUtils.textRequestBody(it) }

            val receiptPart = receiptUri?.let { uri ->
                val tempFile = PhotoUtils.createTempPhotoFile(context, "receipt")
                val compressed = PhotoUtils.compressPhoto(context, uri, tempFile)
                PhotoUtils.fileToMultipartPart(compressed, "receipt")
            }

            val response = api.submitCashDeposit(
                amount = amountBody,
                depositLocation = locationBody,
                referenceNumber = referenceBody,
                notes = notesBody,
                receipt = receiptPart
            )

            if (response.isSuccessful) {
                Result.success(response.body()?.id ?: "")
            } else {
                Result.failure(Exception("Cash deposit failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
