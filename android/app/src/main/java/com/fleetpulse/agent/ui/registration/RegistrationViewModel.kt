package com.fleetpulse.agent.ui.registration

import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.ConfigRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

data class RegistrationUiState(
    val token: String = "",
    val serverUrl: String = PrefsManager.DEFAULT_BASE_URL,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class RegistrationViewModel @Inject constructor(
    private val prefsManager: PrefsManager,
    private val configRepository: ConfigRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegistrationUiState())
    val uiState: StateFlow<RegistrationUiState> = _uiState.asStateFlow()

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    fun setToken(value: String) {
        _uiState.value = _uiState.value.copy(token = value.trim(), error = null)
    }

    fun setServerUrl(value: String) {
        _uiState.value = _uiState.value.copy(serverUrl = value.trim(), error = null)
    }

    fun activate() {
        val state = _uiState.value
        if (state.token.isBlank()) {
            _uiState.value = state.copy(error = "الرجاء إدخال رمز التفعيل")
            return
        }
        if (state.serverUrl.isBlank()) {
            _uiState.value = state.copy(error = "الرجاء إدخال عنوان الخادم")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            // Parse JWT payload to extract device_id and tenant_id
            val jwtPayload = parseJwtPayload(state.token)
            if (jwtPayload == null) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "رمز التفعيل غير صالح"
                )
                return@launch
            }

            // Store config before validating (so Retrofit uses correct base URL)
            prefsManager.baseUrl = state.serverUrl.trimEnd('/')
            prefsManager.deviceToken = state.token

            // Validate token by calling GET /config
            val isValid = configRepository.validateToken()

            if (isValid) {
                prefsManager.deviceId = jwtPayload.optString("sub", null)
                prefsManager.tenantId = jwtPayload.optString("tenant_id", null)
                prefsManager.isRegistered = true
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            } else {
                // Clear on failure
                prefsManager.deviceToken = null
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "فشل التفعيل. تأكد من الرمز وعنوان الخادم"
                )
            }
        }
    }

    private fun parseJwtPayload(token: String): JSONObject? {
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return null
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING))
            JSONObject(payload)
        } catch (e: Exception) {
            null
        }
    }
}
