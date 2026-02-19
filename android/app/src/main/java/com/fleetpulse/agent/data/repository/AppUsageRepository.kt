package com.fleetpulse.agent.data.repository

import com.fleetpulse.agent.data.local.db.dao.AppUsageDao
import com.fleetpulse.agent.data.local.db.entity.AppUsageRecordEntity
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppUsageRepository @Inject constructor(
    private val appUsageDao: AppUsageDao
) {
    suspend fun insert(entity: AppUsageRecordEntity) {
        appUsageDao.insert(entity)
    }

    suspend fun getUnsynced(limit: Int = Constants.APP_USAGE_BATCH_SIZE): List<AppUsageRecordEntity> {
        return appUsageDao.getUnsynced(limit)
    }

    suspend fun markSynced(ids: List<Long>) {
        appUsageDao.markSynced(ids)
    }

    suspend fun cleanup() {
        val cutoff = DateTimeUtils.daysAgoIso(Constants.DATA_RETENTION_DAYS)
        appUsageDao.cleanup(cutoff)
    }

    suspend fun getUnsyncedCount(): Int {
        return appUsageDao.getUnsyncedCount()
    }
}
