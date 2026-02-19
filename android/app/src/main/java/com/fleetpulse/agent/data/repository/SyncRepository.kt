package com.fleetpulse.agent.data.repository

import android.util.Log
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.AppUsageItem
import com.fleetpulse.agent.data.remote.dto.AppUsageSyncRequest
import com.fleetpulse.agent.data.remote.dto.LocationPoint
import com.fleetpulse.agent.data.remote.dto.LocationSyncRequest
import com.fleetpulse.agent.data.remote.dto.NotificationItem
import com.fleetpulse.agent.data.remote.dto.NotificationSyncRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SyncRepository @Inject constructor(
    private val api: AgentApiService,
    private val notificationRepository: NotificationRepository,
    private val locationRepository: LocationRepository,
    private val appUsageRepository: AppUsageRepository
) {
    companion object {
        private const val TAG = "SyncRepository"
    }

    suspend fun syncAll() {
        syncNotifications()
        syncLocations()
        syncAppUsage()
        cleanupOldData()
    }

    suspend fun syncNotifications() {
        try {
            val unsynced = notificationRepository.getUnsynced()
            if (unsynced.isEmpty()) return

            val request = NotificationSyncRequest(
                notifications = unsynced.map { entity ->
                    NotificationItem(
                        appPackage = entity.appPackage,
                        title = entity.title,
                        text = entity.text,
                        timestamp = entity.timestamp,
                    )
                }
            )

            val response = api.syncNotifications(request)
            if (response.isSuccessful) {
                notificationRepository.markSynced(unsynced.map { it.id })
            } else {
                Log.w(TAG, "Notification sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Notification sync error", e)
        }
    }

    suspend fun syncLocations() {
        try {
            val unsynced = locationRepository.getUnsynced()
            if (unsynced.isEmpty()) return

            val request = LocationSyncRequest(
                points = unsynced.map { entity ->
                    LocationPoint(
                        latitude = entity.latitude,
                        longitude = entity.longitude,
                        accuracy = entity.accuracy,
                        speed = entity.speed,
                        bearing = entity.bearing,
                        altitude = entity.altitude,
                        recordedAt = entity.recordedAt
                    )
                }
            )

            val response = api.syncLocations(request)
            if (response.isSuccessful) {
                locationRepository.markSynced(unsynced.map { it.id })
            } else {
                Log.w(TAG, "Location sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Location sync error", e)
        }
    }

    suspend fun syncAppUsage() {
        try {
            val unsynced = appUsageRepository.getUnsynced()
            if (unsynced.isEmpty()) return

            val request = AppUsageSyncRequest(
                records = unsynced.map { entity ->
                    AppUsageItem(
                        appPackage = entity.appPackage,
                        appName = entity.appName,
                        eventType = entity.eventType,
                        durationSeconds = entity.durationSeconds,
                        recordedAt = entity.recordedAt
                    )
                }
            )

            val response = api.syncAppUsage(request)
            if (response.isSuccessful) {
                appUsageRepository.markSynced(unsynced.map { it.id })
            } else {
                Log.w(TAG, "App usage sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "App usage sync error", e)
        }
    }

    private suspend fun cleanupOldData() {
        try {
            notificationRepository.cleanup()
            locationRepository.cleanup()
            appUsageRepository.cleanup()
        } catch (e: Exception) {
            Log.e(TAG, "Cleanup error", e)
        }
    }
}
