package com.fleetpulse.agent.ui.maintenance

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.MaintenanceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MaintenanceUiState(
    val category: String = "unscheduled",
    val type: String = "oil_change",
    val description: String = "",
    val cost: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class MaintenanceViewModel @Inject constructor(
    private val prefsManager: PrefsManager,
    private val maintenanceRepository: MaintenanceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MaintenanceUiState())
    val uiState: StateFlow<MaintenanceUiState> = _uiState.asStateFlow()

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    fun setCategory(value: String) {
        _uiState.value = _uiState.value.copy(category = value)
    }

    fun setType(value: String) {
        _uiState.value = _uiState.value.copy(type = value)
    }

    fun setDescription(value: String) {
        _uiState.value = _uiState.value.copy(description = value)
    }

    fun setCost(value: String) {
        _uiState.value = _uiState.value.copy(cost = value)
    }

    fun submit() {
        val vehicleId = prefsManager.vehicleId
        if (vehicleId == null) {
            _uiState.value = _uiState.value.copy(error = "لم يتم تعيين مركبة")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = maintenanceRepository.submitRequest(
                vehicleId = vehicleId,
                category = _uiState.value.category,
                type = _uiState.value.type,
                description = _uiState.value.description.ifBlank { null },
                cost = _uiState.value.cost.toDoubleOrNull()
            )

            result.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "فشل إرسال طلب الصيانة"
                )
            }
        }
    }
}
