package com.fleetpulse.agent.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

private val FleetPulseColorScheme = lightColorScheme(
    primary = Navy,
    onPrimary = Surface,
    primaryContainer = Blue,
    onPrimaryContainer = Surface,
    secondary = Blue,
    onSecondary = Surface,
    tertiary = Green,
    onTertiary = Surface,
    background = LightBg,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = TextSecondary,
    outline = Outline,
    error = Red,
    onError = Surface,
)

@Composable
fun FleetPulseTheme(
    content: @Composable () -> Unit
) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = FleetPulseColorScheme,
            typography = FleetPulseTypography,
            content = content
        )
    }
}
