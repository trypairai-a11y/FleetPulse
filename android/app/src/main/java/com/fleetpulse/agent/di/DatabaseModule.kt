package com.fleetpulse.agent.di

import android.content.Context
import androidx.room.Room
import com.fleetpulse.agent.data.local.db.FleetPulseDatabase
import com.fleetpulse.agent.data.local.db.dao.AppUsageDao
import com.fleetpulse.agent.data.local.db.dao.DeviceConfigDao
import com.fleetpulse.agent.data.local.db.dao.LocationDao
import com.fleetpulse.agent.data.local.db.dao.NotificationDao
import com.fleetpulse.agent.data.local.db.dao.SyncQueueDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FleetPulseDatabase {
        return Room.databaseBuilder(
            context,
            FleetPulseDatabase::class.java,
            "fleetpulse_agent.db"
        ).build()
    }

    @Provides
    fun provideNotificationDao(db: FleetPulseDatabase): NotificationDao = db.notificationDao()

    @Provides
    fun provideLocationDao(db: FleetPulseDatabase): LocationDao = db.locationDao()

    @Provides
    fun provideAppUsageDao(db: FleetPulseDatabase): AppUsageDao = db.appUsageDao()

    @Provides
    fun provideSyncQueueDao(db: FleetPulseDatabase): SyncQueueDao = db.syncQueueDao()

    @Provides
    fun provideDeviceConfigDao(db: FleetPulseDatabase): DeviceConfigDao = db.deviceConfigDao()
}
