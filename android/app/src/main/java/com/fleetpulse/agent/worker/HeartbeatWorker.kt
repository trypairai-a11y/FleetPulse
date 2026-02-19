package com.fleetpulse.agent.worker

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.StatFs
import android.util.Log
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.HeartbeatRequest
import com.fleetpulse.agent.data.repository.LocationRepository
import com.fleetpulse.agent.util.NetworkUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HeartbeatWorker @Inject constructor(
    private val api: AgentApiService,
    private val locationRepository: LocationRepository
) {
    companion object {
        private const val TAG = "HeartbeatWorker"
    }

    suspend fun sendHeartbeat(context: Context) {
        try {
            val batteryIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val batteryLevel = batteryIntent?.let {
                val level = it.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = it.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                if (level >= 0 && scale > 0) (level * 100) / scale else null
            }
            val isCharging = batteryIntent?.let {
                val status = it.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
            }

            val storageFree = try {
                val stat = StatFs(context.filesDir.absolutePath)
                (stat.availableBytes / (1024 * 1024)).toInt()
            } catch (_: Exception) { null }

            val latestLocation = locationRepository.getLatest()

            val request = HeartbeatRequest(
                batteryLevel = batteryLevel,
                isCharging = isCharging,
                networkType = NetworkUtils.getNetworkType(context),
                signalStrength = NetworkUtils.getSignalStrength(context),
                storageFreeMb = storageFree,
                appVersion = "1.0.0",
                osVersion = "Android ${Build.VERSION.RELEASE}",
                latitude = latestLocation?.latitude,
                longitude = latestLocation?.longitude
            )

            val response = api.sendHeartbeat(request)
            if (!response.isSuccessful) {
                Log.w(TAG, "Heartbeat failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Heartbeat error", e)
        }
    }
}
