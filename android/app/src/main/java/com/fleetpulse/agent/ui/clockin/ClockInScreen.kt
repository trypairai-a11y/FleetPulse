package com.fleetpulse.agent.ui.clockin

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.CameraScreen
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.LoadingButton
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Red

@Composable
fun ClockInScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: ClockInViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            viewModel.consumeSuccess()
            onSuccess()
        }
    }

    Scaffold(
        topBar = {
            FleetPulseTopBar(
                title = stringResource(R.string.clockin_title),
                onBack = onBack
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (state.isCapturing) {
                CameraScreen(
                    useFrontCamera = true,
                    captureButtonText = stringResource(R.string.clockin_take_selfie),
                    onPhotoCaptured = { uri -> viewModel.onSelfieCapured(uri) }
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Selfie preview
                    if (state.selfieUri != null) {
                        AsyncImage(
                            model = state.selfieUri,
                            contentDescription = "سيلفي",
                            modifier = Modifier
                                .size(200.dp)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    TextButton(onClick = { viewModel.retakeSelfie() }) {
                        Text(
                            stringResource(R.string.clockin_retake),
                            color = Blue
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Location status
                    if (state.latitude != null) {
                        Text(
                            text = "الموقع: ${String.format("%.4f", state.latitude)}, ${String.format("%.4f", state.longitude)}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    } else {
                        Text(
                            text = stringResource(R.string.clockin_getting_location),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Error
                    if (state.error != null) {
                        Text(
                            text = state.error!!,
                            color = Red,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }

                    LoadingButton(
                        text = stringResource(R.string.clockin_confirm),
                        isLoading = state.isLoading,
                        onClick = { viewModel.confirmClockIn() },
                        enabled = state.latitude != null
                    )
                }
            }
        }
    }
}
