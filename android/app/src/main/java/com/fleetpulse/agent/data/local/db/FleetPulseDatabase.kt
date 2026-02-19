package com.fleetpulse.agent.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fleetpulse.agent.data.local.db.dao.AppUsageDao
import com.fleetpulse.agent.data.local.db.dao.DeviceConfigDao
import com.fleetpulse.agent.data.local.db.dao.LocationDao
import com.fleetpulse.agent.data.local.db.dao.NotificationDao
import com.fleetpulse.agent.data.local.db.dao.SyncQueueDao
import com.fleetpulse.agent.data.local.db.entity.AppUsageRecordEntity
import com.fleetpulse.agent.data.local.db.entity.CapturedNotificationEntity
import com.fleetpulse.agent.data.local.db.entity.DeviceConfigEntity
import com.fleetpulse.agent.data.local.db.entity.LocationPointEntity
import com.fleetpulse.agent.data.local.db.entity.SyncQueueEntity

@Database(
    entities = [
        CapturedNotificationEntity::class,
        LocationPointEntity::class,
        AppUsageRecordEntity::class,
        SyncQueueEntity::class,
        DeviceConfigEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class FleetPulseDatabase : RoomDatabase() {
    abstract fun notificationDao(): NotificationDao
    abstract fun locationDao(): LocationDao
    abstract fun appUsageDao(): AppUsageDao
    abstract fun syncQueueDao(): SyncQueueDao
    abstract fun deviceConfigDao(): DeviceConfigDao
}
