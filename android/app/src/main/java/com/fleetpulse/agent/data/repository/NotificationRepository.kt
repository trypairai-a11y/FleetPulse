package com.fleetpulse.agent.data.repository

import com.fleetpulse.agent.data.local.db.dao.NotificationDao
import com.fleetpulse.agent.data.local.db.entity.CapturedNotificationEntity
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val notificationDao: NotificationDao
) {
    suspend fun insert(entity: CapturedNotificationEntity) {
        notificationDao.insert(entity)
    }

    suspend fun getUnsynced(limit: Int = Constants.NOTIFICATION_BATCH_SIZE): List<CapturedNotificationEntity> {
        return notificationDao.getUnsynced(limit)
    }

    suspend fun markSynced(ids: List<Long>) {
        notificationDao.markSynced(ids)
    }

    suspend fun cleanup() {
        val cutoff = DateTimeUtils.daysAgoIso(Constants.DATA_RETENTION_DAYS)
        notificationDao.cleanup(cutoff)
    }

    suspend fun getUnsyncedCount(): Int {
        return notificationDao.getUnsyncedCount()
    }
}
