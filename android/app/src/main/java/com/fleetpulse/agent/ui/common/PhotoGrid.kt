package com.fleetpulse.agent.ui.common

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.fleetpulse.agent.ui.theme.Blue
import com.fleetpulse.agent.ui.theme.Outline
import com.fleetpulse.agent.ui.theme.Red
import com.fleetpulse.agent.ui.theme.Surface
import com.fleetpulse.agent.ui.theme.SurfaceVariant
import com.fleetpulse.agent.ui.theme.TextSecondary

data class PhotoSlot(
    val label: String,
    val uri: Uri? = null
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PhotoGrid(
    slots: List<PhotoSlot>,
    onSlotClick: (Int) -> Unit,
    onRemove: ((Int) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
    ) {
        slots.forEachIndexed { index, slot ->
            Box(
                modifier = Modifier
                    .width(100.dp)
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (slot.uri != null) Surface else SurfaceVariant)
                    .clickable { onSlotClick(index) },
                contentAlignment = Alignment.Center
            ) {
                if (slot.uri != null) {
                    AsyncImage(
                        model = slot.uri,
                        contentDescription = slot.label,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )

                    if (onRemove != null) {
                        IconButton(
                            onClick = { onRemove(index) },
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .size(24.dp)
                                .background(Red, CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "حذف",
                                tint = Surface,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.CameraAlt,
                            contentDescription = slot.label,
                            tint = TextSecondary,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = slot.label,
                            color = TextSecondary,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
    }
}
