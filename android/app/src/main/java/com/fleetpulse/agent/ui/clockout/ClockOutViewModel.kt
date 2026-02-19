package com.fleetpulse.agent.ui.clockout

import android.annotation.SuppressLint
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.AttendanceRepository
import com.fleetpulse.agent.service.AgentForegroundService
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class ClockOutUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ClockOutViewModel @Inject constructor(
    private val application: Application,
    private val prefsManager: PrefsManager,
    private val attendanceRepository: AttendanceRepository
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(ClockOutUiState())
    val uiState: StateFlow<ClockOutUiState> = _uiState.asStateFlow()

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    private val fusedClient = LocationServices.getFusedLocationProviderClient(application)

    @SuppressLint("MissingPermission")
    fun confirmClockOut() {
        viewModelScope.launch {
            _uiState.value = ClockOutUiState(isLoading = true)

            try {
                val location = fusedClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    CancellationTokenSource().token
                ).await()

                if (location == null) {
                    _uiState.value = ClockOutUiState(error = "لم يتم تحديد الموقع. تأكد من تفعيل GPS")
                    return@launch
                }

                val result = attendanceRepository.clockOut(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    shiftId = prefsManager.currentShiftId
                )

                result.onSuccess {
                    prefsManager.isClockedIn = false
                    prefsManager.clockInTime = null
                    AgentForegroundService.notifyClockOut(application)
                    _uiState.value = ClockOutUiState(isSuccess = true)
                }.onFailure { e ->
                    _uiState.value = ClockOutUiState(error = e.message ?: "فشل تسجيل الانصراف")
                }
            } catch (e: Exception) {
                _uiState.value = ClockOutUiState(error = e.message ?: "فشل تسجيل الانصراف")
            }
        }
    }
}
