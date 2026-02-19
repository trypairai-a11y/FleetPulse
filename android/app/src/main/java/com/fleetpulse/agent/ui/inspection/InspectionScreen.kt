package com.fleetpulse.agent.ui.inspection

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.CameraScreen
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.LoadingButton
import com.fleetpulse.agent.ui.common.PhotoGrid
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Green
import com.fleetpulse.agent.ui.theme.Red
import com.fleetpulse.agent.ui.theme.Surface

@Composable
fun InspectionScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: InspectionViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            viewModel.consumeSuccess()
            onSuccess()
        }
    }

    // Camera overlay for photo capture
    if (state.capturingPhotoIndex != null) {
        CameraScreen(
            useFrontCamera = false,
            captureButtonText = "التقاط",
            onPhotoCaptured = { uri -> viewModel.onPhotoCaptured(uri) }
        )
        return
    }

    Scaffold(
        topBar = {
            FleetPulseTopBar(
                title = stringResource(R.string.inspection_title),
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
            // Photo grid
            Text(
                text = "صور المركبة",
                style = MaterialTheme.typography.titleMedium
            )

            PhotoGrid(
                slots = state.photoSlots,
                onSlotClick = { index -> viewModel.startPhotoCapture(index) },
                onRemove = { index -> viewModel.removePhoto(index) },
                modifier = Modifier.height(240.dp)
            )

            // Checklist
            Text(
                text = stringResource(R.string.inspection_checklist),
                style = MaterialTheme.typography.titleMedium
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    val checklistLabels = mapOf(
                        "tires" to stringResource(R.string.inspection_tires),
                        "brakes" to stringResource(R.string.inspection_brakes),
                        "lights" to stringResource(R.string.inspection_lights),
                        "engine" to stringResource(R.string.inspection_engine),
                        "mirrors" to stringResource(R.string.inspection_mirrors),
                        "cleanliness" to stringResource(R.string.inspection_cleanliness)
                    )

                    checklistLabels.forEach { (key, label) ->
                        val currentValue = state.checklist[key] ?: "ok"
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = label,
                                style = MaterialTheme.typography.bodyLarge,
                                modifier = Modifier.weight(1f)
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(
                                    selected = currentValue == "ok",
                                    onClick = { viewModel.updateChecklist(key, "ok") },
                                    label = { Text("سليم") },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Green.copy(alpha = 0.15f),
                                        selectedLabelColor = Green
                                    )
                                )
                                FilterChip(
                                    selected = currentValue == "issue",
                                    onClick = { viewModel.updateChecklist(key, "issue") },
                                    label = { Text("مشكلة") },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Red.copy(alpha = 0.15f),
                                        selectedLabelColor = Red
                                    )
                                )
                            }
                        }
                    }
                }
            }

            // Overall status
            Text(
                text = "الحالة العامة",
                style = MaterialTheme.typography.titleMedium
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "pass" to stringResource(R.string.inspection_status_pass),
                    "fail" to stringResource(R.string.inspection_status_fail),
                    "needs_attention" to stringResource(R.string.inspection_status_attention)
                ).forEach { (value, label) ->
                    FilterChip(
                        selected = state.overallStatus == value,
                        onClick = { viewModel.setOverallStatus(value) },
                        label = { Text(label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Blue.copy(alpha = 0.15f),
                            selectedLabelColor = Blue
                        )
                    )
                }
            }

            // Notes
            OutlinedTextField(
                value = state.notes,
                onValueChange = { viewModel.setNotes(it) },
                label = { Text(stringResource(R.string.inspection_notes)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )

            // Error
            if (state.error != null) {
                Text(text = state.error!!, color = Red, style = MaterialTheme.typography.bodySmall)
            }

            // Submit
            LoadingButton(
                text = stringResource(R.string.inspection_submit),
                isLoading = state.isLoading,
                onClick = { viewModel.submitInspection() }
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
