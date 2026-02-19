package com.fleetpulse.agent.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fleetpulse.agent.ui.theme.Amber
import com.fleetpulse.agent.ui.theme.Green
import com.fleetpulse.agent.ui.theme.Red

@Composable
fun StatusBadge(
    text: String,
    type: BadgeType = BadgeType.INFO,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (type) {
        BadgeType.SUCCESS -> Color(0xFFDCFCE7) to Green
        BadgeType.ERROR -> Color(0xFFFEE2E2) to Red
        BadgeType.WARNING -> Color(0xFFFEF3C7) to Amber
        BadgeType.INFO -> Color(0xFFDBEAFE) to Color(0xFF2563EB)
    }

    Text(
        text = text,
        color = textColor,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

enum class BadgeType {
    SUCCESS, ERROR, WARNING, INFO
}
