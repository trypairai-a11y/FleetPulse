package com.fleetpulse.agent

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class FleetPulseApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)

        val serviceChannel = NotificationChannel(
            CHANNEL_SERVICE,
            "خدمة فليت بلس",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "إشعار الخدمة المستمرة"
            setShowBadge(false)
        }

        val alertChannel = NotificationChannel(
            CHANNEL_ALERTS,
            "تنبيهات",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "تنبيهات مهمة من فليت بلس"
        }

        manager.createNotificationChannel(serviceChannel)
        manager.createNotificationChannel(alertChannel)
    }

    companion object {
        const val CHANNEL_SERVICE = "fleetpulse_service"
        const val CHANNEL_ALERTS = "fleetpulse_alerts"
    }
}
