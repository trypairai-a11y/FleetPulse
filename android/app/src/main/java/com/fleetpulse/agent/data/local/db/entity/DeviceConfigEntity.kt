package com.fleetpulse.agent.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "device_config")
data class DeviceConfigEntity(
    @PrimaryKey
    val key: String,

    val value: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String
)
