package com.fleetpulse.agent.ui.clockin

import android.annotation.SuppressLint
import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.AttendanceRepository
import com.fleetpulse.agent.service.AgentForegroundService
import com.fleetpulse.agent.util.DateTimeUtils
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

data class ClockInUiState(
    val selfieUri: Uri? = null,
    val isCapturing: Boolean = true,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

@HiltViewModel
class ClockInViewModel @Inject constructor(
    private val application: Application,
    private val prefsManager: PrefsManager,
    private val attendanceRepository: AttendanceRepository
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(ClockInUiState())
    val uiState: StateFlow<ClockInUiState> = _uiState.asStateFlow()

    private val fusedClient = LocationServices.getFusedLocationProviderClient(application)

    fun onSelfieCapured(uri: Uri) {
        _uiState.value = _uiState.value.copy(
            selfieUri = uri,
            isCapturing = false
        )
        fetchLocation()
    }

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    fun retakeSelfie() {
        _uiState.value = _uiState.value.copy(
            selfieUri = null,
            isCapturing = true
        )
    }

    @SuppressLint("MissingPermission")
    private fun fetchLocation() {
        viewModelScope.launch {
            try {
                val location = fusedClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    CancellationTokenSource().token
                ).await()

                if (location != null) {
                    _uiState.value = _uiState.value.copy(
                        latitude = location.latitude,
                        longitude = location.longitude
                    )
                }
            } catch (_: Exception) {}
        }
    }

    fun confirmClockIn() {
        val state = _uiState.value
        if (state.latitude == null || state.longitude == null) {
            _uiState.value = state.copy(error = "لم يتم تحديد الموقع بعد")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = attendanceRepository.clockIn(
                selfieUri = state.selfieUri,
                latitude = state.latitude,
                longitude = state.longitude,
                shiftId = prefsManager.currentShiftId
            )

            result.onSuccess {
                prefsManager.isClockedIn = true
                prefsManager.clockInTime = DateTimeUtils.formatKuwaitTime(DateTimeUtils.nowIso())
                AgentForegroundService.notifyClockIn(application)
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "فشل تسجيل الحضور"
                )
            }
        }
    }
}
