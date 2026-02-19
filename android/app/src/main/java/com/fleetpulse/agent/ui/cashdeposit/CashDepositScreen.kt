package com.fleetpulse.agent.ui.cashdeposit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.CameraScreen
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.LoadingButton
import com.fleetpulse.agent.ui.theme.Red

@Composable
fun CashDepositScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: CashDepositViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            viewModel.consumeSuccess()
            onSuccess()
        }
    }

    if (state.isCapturingReceipt) {
        CameraScreen(
            useFrontCamera = false,
            captureButtonText = "التقاط الإيصال",
            onPhotoCaptured = { uri -> viewModel.onReceiptCaptured(uri) }
        )
        return
    }

    Scaffold(
        topBar = {
            FleetPulseTopBar(
                title = stringResource(R.string.cash_deposit_title),
                onBack = onBack
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Amount
            OutlinedTextField(
                value = state.amount,
                onValueChange = { viewModel.setAmount(it) },
                label = { Text(stringResource(R.string.cash_deposit_amount)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )

            // Deposit location
            OutlinedTextField(
                value = state.depositLocation,
                onValueChange = { viewModel.setDepositLocation(it) },
                label = { Text(stringResource(R.string.cash_deposit_location)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Reference number
            OutlinedTextField(
                value = state.referenceNumber,
                onValueChange = { viewModel.setReferenceNumber(it) },
                label = { Text(stringResource(R.string.cash_deposit_reference)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Notes
            OutlinedTextField(
                value = state.notes,
                onValueChange = { viewModel.setNotes(it) },
                label = { Text(stringResource(R.string.cash_deposit_notes)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )

            // Receipt photo
            Text(
                text = stringResource(R.string.cash_deposit_receipt),
                style = MaterialTheme.typography.titleMedium
            )

            if (state.receiptUri != null) {
                AsyncImage(
                    model = state.receiptUri,
                    contentDescription = "إيصال",
                    modifier = Modifier
                        .size(150.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .align(Alignment.CenterHorizontally),
                    contentScale = ContentScale.Crop
                )
            }

            OutlinedButton(
                onClick = { viewModel.startReceiptCapture() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (state.receiptUri != null) "إعادة التقاط" else "التقاط صورة الإيصال")
            }

            // Error
            if (state.error != null) {
                Text(text = state.error!!, color = Red, style = MaterialTheme.typography.bodySmall)
            }

            // Submit
            LoadingButton(
                text = stringResource(R.string.cash_deposit_submit),
                isLoading = state.isLoading,
                onClick = { viewModel.submit() },
                enabled = state.amount.isNotBlank()
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
