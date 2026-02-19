package com.fleetpulse.agent.ui.registration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.LoadingButton
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Red

@Composable
fun RegistrationScreen(
    onRegistrationSuccess: () -> Unit,
    viewModel: RegistrationViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            viewModel.consumeSuccess()
            onRegistrationSuccess()
        }
    }

    Scaffold(
        topBar = { FleetPulseTopBar(title = stringResource(R.string.registration_title)) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Logo / icon
            Icon(
                Icons.Default.PhoneAndroid,
                contentDescription = null,
                tint = Blue,
                modifier = Modifier.size(72.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "فليت بلس",
                style = MaterialTheme.typography.headlineLarge,
                textAlign = TextAlign.Center
            )

            Text(
                text = "نظام إدارة الأسطول",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Token input
            OutlinedTextField(
                value = state.token,
                onValueChange = { viewModel.setToken(it) },
                label = { Text(stringResource(R.string.registration_token_hint)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = false,
                minLines = 3,
                maxLines = 5
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Server URL
            OutlinedTextField(
                value = state.serverUrl,
                onValueChange = { viewModel.setServerUrl(it) },
                label = { Text(stringResource(R.string.registration_server_hint)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Error
            if (state.error != null) {
                Text(
                    text = state.error!!,
                    color = Red,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }

            // Activate button
            LoadingButton(
                text = stringResource(R.string.registration_activate),
                isLoading = state.isLoading,
                onClick = { viewModel.activate() },
                enabled = state.token.isNotBlank()
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
