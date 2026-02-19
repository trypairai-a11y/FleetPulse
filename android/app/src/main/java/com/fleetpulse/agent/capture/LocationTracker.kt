package com.fleetpulse.agent.capture

import android.annotation.SuppressLint
import android.content.Context
import android.os.Looper
import com.fleetpulse.agent.data.local.db.entity.LocationPointEntity
import com.fleetpulse.agent.data.repository.LocationRepository
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationTracker @Inject constructor(
    @ApplicationContext private val context: Context,
    private val locationRepository: LocationRepository
) {
    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var isTracking = false
    private var isActiveMode = false

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                val entity = LocationPointEntity(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracy = location.accuracy,
                    speed = location.speed,
                    bearing = location.bearing,
                    altitude = location.altitude,
                    recordedAt = DateTimeUtils.fromEpochMillis(location.time),
                    createdAt = DateTimeUtils.nowIso()
                )
                scope.launch {
                    locationRepository.insert(entity)
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun startTracking(active: Boolean) {
        isActiveMode = active
        isTracking = true

        val request = createLocationRequest(active)
        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    }

    @SuppressLint("MissingPermission")
    fun switchMode(active: Boolean) {
        if (!isTracking) {
            startTracking(active)
            return
        }
        if (isActiveMode == active) return

        isActiveMode = active
        fusedClient.removeLocationUpdates(locationCallback)

        val request = createLocationRequest(active)
        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
    }

    fun stopTracking() {
        isTracking = false
        fusedClient.removeLocationUpdates(locationCallback)
    }

    private fun createLocationRequest(active: Boolean): LocationRequest {
        return if (active) {
            LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                Constants.LOCATION_ACTIVE_INTERVAL_MS
            ).setMinUpdateIntervalMillis(Constants.LOCATION_ACTIVE_INTERVAL_MS / 2)
                .build()
        } else {
            LocationRequest.Builder(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                Constants.LOCATION_PASSIVE_INTERVAL_MS
            ).setMinUpdateIntervalMillis(Constants.LOCATION_PASSIVE_INTERVAL_MS / 2)
                .build()
        }
    }
}
