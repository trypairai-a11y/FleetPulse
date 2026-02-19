package com.fleetpulse.agent.ui.home

import android.app.Application
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.capture.AppUsageTracker
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.LocationRepository
import com.fleetpulse.agent.data.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val driverName: String = "",
    val isClockedIn: Boolean = false,
    val clockInTime: String? = null,
    val ordersToday: Int = 0,
    val hoursToday: String = "0:00",
    val hasNotificationAccess: Boolean = false,
    val hasUsageAccess: Boolean = false,
    val hasLocationPermission: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val application: Application,
    private val prefsManager: PrefsManager,
    private val notificationRepository: NotificationRepository,
    private val locationRepository: LocationRepository,
    private val appUsageTracker: AppUsageTracker
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        refreshState()
    }

    fun refreshState() {
        viewModelScope.launch {
            val ordersCount = notificationRepository.getUnsyncedCount()

            _uiState.value = HomeUiState(
                driverName = prefsManager.driverName ?: "سائق",
                isClockedIn = prefsManager.isClockedIn,
                clockInTime = prefsManager.clockInTime,
                ordersToday = ordersCount,
                hasNotificationAccess = isNotificationListenerEnabled(),
                hasUsageAccess = appUsageTracker.hasPermission(),
                hasLocationPermission = true // Checked at runtime in screen
            )
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(
            application.contentResolver,
            "enabled_notification_listeners"
        )
        return flat?.contains(application.packageName) == true
    }
}
