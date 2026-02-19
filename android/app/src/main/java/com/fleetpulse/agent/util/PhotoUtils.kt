package com.fleetpulse.agent.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

object PhotoUtils {

    fun compressPhoto(context: Context, uri: Uri, outputFile: File): File {
        // First pass: decode bounds only
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, options)
        } ?: throw IllegalArgumentException("Cannot open URI: $uri")

        val maxDim = Constants.PHOTO_MAX_DIMENSION.toFloat()
        val scaleFactor = maxOf(
            options.outWidth / maxDim,
            options.outHeight / maxDim,
            1f
        )

        // inSampleSize must be a power of 2
        var inSampleSize = 1
        while (inSampleSize * 2 <= scaleFactor) {
            inSampleSize *= 2
        }

        // Second pass: decode with downsampling
        val decodeOptions = BitmapFactory.Options().apply {
            this.inSampleSize = inSampleSize
        }
        val bitmap = context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream, null, decodeOptions)
        } ?: throw IllegalArgumentException("Cannot decode image: $uri")

        FileOutputStream(outputFile).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, Constants.PHOTO_JPEG_QUALITY, out)
        }
        bitmap.recycle()

        return outputFile
    }

    fun fileToMultipartPart(file: File, partName: String): MultipartBody.Part {
        val requestBody = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
        return MultipartBody.Part.createFormData(partName, file.name, requestBody)
    }

    fun textRequestBody(value: String): RequestBody {
        return value.toRequestBody("text/plain".toMediaTypeOrNull())
    }

    fun createTempPhotoFile(context: Context, prefix: String = "photo"): File {
        val dir = File(context.cacheDir, "photos").apply { mkdirs() }
        return File.createTempFile(prefix, ".jpg", dir)
    }
}
