package com.fleetpulse.agent.ui.maintenance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.LoadingButton
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Red

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MaintenanceScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: MaintenanceViewModel = hiltViewModel()
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
                title = stringResource(R.string.maintenance_title),
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
            // Category
            Text(
                text = stringResource(R.string.maintenance_category),
                style = MaterialTheme.typography.titleMedium
            )

            val categories = listOf(
                "scheduled" to stringResource(R.string.maintenance_cat_scheduled),
                "unscheduled" to stringResource(R.string.maintenance_cat_unscheduled),
                "emergency" to stringResource(R.string.maintenance_cat_emergency),
                "accident" to stringResource(R.string.maintenance_cat_accident)
            )

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.forEach { (value, label) ->
                    FilterChip(
                        selected = state.category == value,
                        onClick = { viewModel.setCategory(value) },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Blue.copy(alpha = 0.15f),
                            selectedLabelColor = Blue
                        )
                    )
                }
            }

            // Type
            Text(
                text = stringResource(R.string.maintenance_type),
                style = MaterialTheme.typography.titleMedium
            )

            val types = listOf(
                "oil_change" to stringResource(R.string.maintenance_type_oil),
                "brake_service" to stringResource(R.string.maintenance_type_brake),
                "tire_replacement" to stringResource(R.string.maintenance_type_tire),
                "engine_repair" to stringResource(R.string.maintenance_type_engine),
                "battery" to stringResource(R.string.maintenance_type_battery),
                "ac" to stringResource(R.string.maintenance_type_ac),
                "body_work" to stringResource(R.string.maintenance_type_body),
                "other" to stringResource(R.string.maintenance_type_other)
            )

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                types.forEach { (value, label) ->
                    FilterChip(
                        selected = state.type == value,
                        onClick = { viewModel.setType(value) },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Blue.copy(alpha = 0.15f),
                            selectedLabelColor = Blue
                        )
                    )
                }
            }

            // Description
            OutlinedTextField(
                value = state.description,
                onValueChange = { viewModel.setDescription(it) },
                label = { Text(stringResource(R.string.maintenance_description)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )

            // Cost
            OutlinedTextField(
                value = state.cost,
                onValueChange = { viewModel.setCost(it) },
                label = { Text(stringResource(R.string.maintenance_cost)) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )

            // Error
            if (state.error != null) {
                Text(text = state.error!!, color = Red, style = MaterialTheme.typography.bodySmall)
            }

            // Submit
            LoadingButton(
                text = stringResource(R.string.maintenance_submit),
                isLoading = state.isLoading,
                onClick = { viewModel.submit() }
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
