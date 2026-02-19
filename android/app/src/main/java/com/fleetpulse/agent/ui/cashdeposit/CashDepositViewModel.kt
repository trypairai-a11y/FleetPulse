package com.fleetpulse.agent.ui.cashdeposit

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fleetpulse.agent.data.repository.CashRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CashDepositUiState(
    val amount: String = "",
    val depositLocation: String = "",
    val referenceNumber: String = "",
    val notes: String = "",
    val receiptUri: Uri? = null,
    val isCapturingReceipt: Boolean = false,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CashDepositViewModel @Inject constructor(
    private val cashRepository: CashRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CashDepositUiState())
    val uiState: StateFlow<CashDepositUiState> = _uiState.asStateFlow()

    fun consumeSuccess() {
        _uiState.value = _uiState.value.copy(isSuccess = false)
    }

    fun setAmount(value: String) {
        _uiState.value = _uiState.value.copy(amount = value)
    }

    fun setDepositLocation(value: String) {
        _uiState.value = _uiState.value.copy(depositLocation = value)
    }

    fun setReferenceNumber(value: String) {
        _uiState.value = _uiState.value.copy(referenceNumber = value)
    }

    fun setNotes(value: String) {
        _uiState.value = _uiState.value.copy(notes = value)
    }

    fun startReceiptCapture() {
        _uiState.value = _uiState.value.copy(isCapturingReceipt = true)
    }

    fun onReceiptCaptured(uri: Uri) {
        _uiState.value = _uiState.value.copy(receiptUri = uri, isCapturingReceipt = false)
    }

    fun cancelReceiptCapture() {
        _uiState.value = _uiState.value.copy(isCapturingReceipt = false)
    }

    fun submit() {
        val amountDouble = _uiState.value.amount.toDoubleOrNull()
        if (amountDouble == null || amountDouble <= 0) {
            _uiState.value = _uiState.value.copy(error = "المبلغ غير صالح")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val result = cashRepository.submitDeposit(
                amount = amountDouble,
                depositLocation = _uiState.value.depositLocation.ifBlank { null },
                referenceNumber = _uiState.value.referenceNumber.ifBlank { null },
                notes = _uiState.value.notes.ifBlank { null },
                receiptUri = _uiState.value.receiptUri
            )

            result.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "فشل تسجيل الإيداع"
                )
            }
        }
    }
}
