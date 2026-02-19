package com.fleetpulse.agent.data.local.prefs

import android.content.SharedPreferences
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PrefsManager @Inject constructor(
    private val prefs: SharedPreferences
) {
    var deviceToken: String?
        get() = prefs.getString(KEY_DEVICE_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL
        set(value) = prefs.edit().putString(KEY_BASE_URL, value).apply()

    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var tenantId: String?
        get() = prefs.getString(KEY_TENANT_ID, null)
        set(value) = prefs.edit().putString(KEY_TENANT_ID, value).apply()

    var driverId: String?
        get() = prefs.getString(KEY_DRIVER_ID, null)
        set(value) = prefs.edit().putString(KEY_DRIVER_ID, value).apply()

    var driverName: String?
        get() = prefs.getString(KEY_DRIVER_NAME, null)
        set(value) = prefs.edit().putString(KEY_DRIVER_NAME, value).apply()

    var isRegistered: Boolean
        get() = prefs.getBoolean(KEY_IS_REGISTERED, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_REGISTERED, value).apply()

    var isClockedIn: Boolean
        get() = prefs.getBoolean(KEY_IS_CLOCKED_IN, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_CLOCKED_IN, value).apply()

    var currentShiftId: String?
        get() = prefs.getString(KEY_CURRENT_SHIFT_ID, null)
        set(value) = prefs.edit().putString(KEY_CURRENT_SHIFT_ID, value).apply()

    var vehicleId: String?
        get() = prefs.getString(KEY_VEHICLE_ID, null)
        set(value) = prefs.edit().putString(KEY_VEHICLE_ID, value).apply()

    var clockInTime: String?
        get() = prefs.getString(KEY_CLOCK_IN_TIME, null)
        set(value) = prefs.edit().putString(KEY_CLOCK_IN_TIME, value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        const val PREFS_NAME = "fleetpulse_prefs"
        const val DEFAULT_BASE_URL = "http://10.0.2.2:8000"

        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_TENANT_ID = "tenant_id"
        private const val KEY_DRIVER_ID = "driver_id"
        private const val KEY_DRIVER_NAME = "driver_name"
        private const val KEY_IS_REGISTERED = "is_registered"
        private const val KEY_IS_CLOCKED_IN = "is_clocked_in"
        private const val KEY_CURRENT_SHIFT_ID = "current_shift_id"
        private const val KEY_VEHICLE_ID = "vehicle_id"
        private const val KEY_CLOCK_IN_TIME = "clock_in_time"
    }
}
