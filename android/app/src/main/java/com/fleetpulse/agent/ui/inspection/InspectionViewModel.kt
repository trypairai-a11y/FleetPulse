package com.fleetpulse.agent.ui.inspection

import android.annotation.SuppressLint
import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.InspectionRepository
import com.fleetpulse.agent.ui.common.PhotoSlot
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

data class InspectionUiState(
    val photoSlots: List<PhotoSlot> = listOf(
        PhotoSlot("الأمام"),
        PhotoSlot("الخلف"),
        PhotoSlot("اليمين"),
        PhotoSlot("اليسار"),
        PhotoSlot("لوحة القيادة"),
        PhotoSlot("الإطارات")
    ),
    val checklist: Map<String, String> = mapOf(
        "tires" to "ok",
        "brakes" to "ok",
        "lights" to "ok",
        "engine" to "ok",
        "mirrors" to "ok",
        "cleanliness" to "ok"
    ),
    val overallStatus: String = "pass",
    val notes: String = "",
    val capturingPhotoIndex: Int? = null,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class InspectionViewModel @Inject constructor(
    private val application: Application,
    private val prefsManager: PrefsManager,
    private val inspectionRepository: InspectionRepository
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(InspectionUiState())
    val uiState: StateFlow<InspectionUiState> = _uiState.asStateFlow()

    private val fusedClient = LocationServices.getFusedLocationProviderClient(application)

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    fun startPhotoCapture(index: Int) {
        _uiState.value = _uiState.value.copy(capturingPhotoIndex = index)
    }

    fun onPhotoCaptured(uri: Uri) {
        val index = _uiState.value.capturingPhotoIndex ?: return
        val slots = _uiState.value.photoSlots.toMutableList()
        slots[index] = slots[index].copy(uri = uri)
        _uiState.value = _uiState.value.copy(
            photoSlots = slots,
            capturingPhotoIndex = null
        )
    }

    fun cancelPhotoCapture() {
        _uiState.value = _uiState.value.copy(capturingPhotoIndex = null)
    }

    fun removePhoto(index: Int) {
        val slots = _uiState.value.photoSlots.toMutableList()
        slots[index] = slots[index].copy(uri = null)
        _uiState.value = _uiState.value.copy(photoSlots = slots)
    }

    fun updateChecklist(key: String, value: String) {
        val checklist = _uiState.value.checklist.toMutableMap()
        checklist[key] = value
        _uiState.value = _uiState.value.copy(checklist = checklist)
    }

    fun setOverallStatus(status: String) {
        _uiState.value = _uiState.value.copy(overallStatus = status)
    }

    fun setNotes(notes: String) {
        _uiState.value = _uiState.value.copy(notes = notes)
    }

    @SuppressLint("MissingPermission")
    fun submitInspection() {
        val vehicleId = prefsManager.vehicleId
        if (vehicleId == null) {
            _uiState.value = _uiState.value.copy(error = "لم يتم تعيين مركبة")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            var lat: Double? = null
            var lng: Double? = null
            try {
                val location = fusedClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    CancellationTokenSource().token
                ).await()
                lat = location?.latitude
                lng = location?.longitude
            } catch (_: Exception) {}

            val photoUris = _uiState.value.photoSlots.mapNotNull { it.uri }

            val result = inspectionRepository.submitInspection(
                vehicleId = vehicleId,
                shiftId = prefsManager.currentShiftId,
                checklist = _uiState.value.checklist,
                overallStatus = _uiState.value.overallStatus,
                notes = _uiState.value.notes.ifBlank { null },
                latitude = lat,
                longitude = lng,
                photoUris = photoUris
            )

            result.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "فشل إرسال الفحص"
                )
            }
        }
    }
}
