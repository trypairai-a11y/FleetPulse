package com.fleetpulse.agent.ui.home

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.fleetpulse.agent.R
import com.fleetpulse.agent.ui.common.BadgeType
import com.fleetpulse.agent.ui.common.FleetPulseTopBar
import com.fleetpulse.agent.ui.common.StatusBadge
import com.fleetpulse.agent.ui.theme.Amber
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Green
import com.fleetpulse.agent.ui.theme.Surface
import com.fleetpulse.agent.ui.theme.SurfaceVariant
import com.fleetpulse.agent.ui.theme.TextSecondary

@Composable
fun HomeScreen(
    onClockIn: () -> Unit,
    onClockOut: () -> Unit,
    onInspection: () -> Unit,
    onCashDeposit: () -> Unit,
    onMaintenance: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.refreshState()
    }

    Scaffold(
        topBar = { FleetPulseTopBar(title = stringResource(R.string.app_name)) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Greeting
            Text(
                text = stringResource(R.string.home_greeting, state.driverName),
                style = MaterialTheme.typography.headlineMedium
            )

            // Shift status card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = if (state.isClockedIn) {
                                stringResource(R.string.home_shift_active)
                            } else {
                                stringResource(R.string.home_shift_inactive)
                            },
                            style = MaterialTheme.typography.titleMedium
                        )
                        if (state.isClockedIn && state.clockInTime != null) {
                            Text(
                                text = state.clockInTime!!,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                    StatusBadge(
                        text = if (state.isClockedIn) "نشط" else "غير نشط",
                        type = if (state.isClockedIn) BadgeType.SUCCESS else BadgeType.WARNING
                    )
                }
            }

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard(
                    label = stringResource(R.string.home_orders_today),
                    value = state.ordersToday.toString(),
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    label = stringResource(R.string.home_hours_today),
                    value = state.hoursToday,
                    modifier = Modifier.weight(1f)
                )
            }

            // Action buttons
            Text(
                text = "الإجراءات",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 8.dp)
            )

            if (!state.isClockedIn) {
                ActionButton(
                    icon = Icons.Default.Login,
                    text = stringResource(R.string.home_clock_in),
                    onClick = onClockIn,
                    color = Green
                )
            } else {
                ActionButton(
                    icon = Icons.Default.Logout,
                    text = stringResource(R.string.home_clock_out),
                    onClick = onClockOut,
                    color = Amber
                )
            }

            ActionButton(
                icon = Icons.Default.DirectionsCar,
                text = stringResource(R.string.home_inspection),
                onClick = onInspection,
                color = Blue
            )

            ActionButton(
                icon = Icons.Default.Payments,
                text = stringResource(R.string.home_cash_deposit),
                onClick = onCashDeposit,
                color = Blue
            )

            ActionButton(
                icon = Icons.Default.Build,
                text = stringResource(R.string.home_maintenance),
                onClick = onMaintenance,
                color = Blue
            )

            // Permission warnings
            if (!state.hasNotificationAccess) {
                PermissionWarning(
                    title = stringResource(R.string.permission_notification_title),
                    description = stringResource(R.string.permission_notification_desc),
                    onEnable = {
                        context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    }
                )
            }

            if (!state.hasUsageAccess) {
                PermissionWarning(
                    title = stringResource(R.string.permission_usage_title),
                    description = stringResource(R.string.permission_usage_desc),
                    onEnable = {
                        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                    }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StatCard(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = value,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Blue
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun ActionButton(
    icon: ImageVector,
    text: String,
    onClick: () -> Unit,
    color: androidx.compose.ui.graphics.Color
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(28.dp)
            )
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}

@Composable
private fun PermissionWarning(
    title: String,
    description: String,
    onEnable: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SurfaceVariant),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Warning,
                contentDescription = null,
                tint = Amber,
                modifier = Modifier.size(24.dp)
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp)
            ) {
                Text(text = title, style = MaterialTheme.typography.labelLarge)
                Text(text = description, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = onEnable) {
                Text(stringResource(R.string.permission_enable), color = Blue)
            }
        }
    }
}
