package com.fleetpulse.agent.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.fleetpulse.agent.data.local.db.entity.CapturedNotificationEntity
import com.fleetpulse.agent.data.repository.NotificationRepository
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class NotificationCaptureService : NotificationListenerService() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface NotificationCaptureEntryPoint {
        fun notificationRepository(): NotificationRepository
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var notificationRepository: NotificationRepository

    override fun onCreate() {
        super.onCreate()
        val entryPoint = EntryPointAccessors.fromApplication(
            applicationContext,
            NotificationCaptureEntryPoint::class.java
        )
        notificationRepository = entryPoint.notificationRepository()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName

        if (packageName !in Constants.MONITORED_PACKAGES.keys) return

        val notification = sbn.notification ?: return
        val extras = notification.extras

        val title = extras?.getCharSequence("android.title")?.toString()
        val text = extras?.getCharSequence("android.text")?.toString()

        if (title.isNullOrBlank() && text.isNullOrBlank()) return

        val extrasMap = buildString {
            extras?.keySet()?.forEach { key ->
                val value = extras.get(key)
                if (value != null && key.startsWith("android.")) {
                    append("$key=$value\n")
                }
            }
        }

        val entity = CapturedNotificationEntity(
            appPackage = packageName,
            title = title,
            text = text,
            extras = extrasMap.ifBlank { null },
            timestamp = DateTimeUtils.fromEpochMillis(sbn.postTime),
            createdAt = DateTimeUtils.nowIso()
        )

        scope.launch {
            notificationRepository.insert(entity)
        }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }
}
