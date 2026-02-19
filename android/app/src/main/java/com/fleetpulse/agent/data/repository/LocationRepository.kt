package com.fleetpulse.agent.data.repository

import com.fleetpulse.agent.data.local.db.dao.LocationDao
import com.fleetpulse.agent.data.local.db.entity.LocationPointEntity
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val locationDao: LocationDao
) {
    suspend fun insert(entity: LocationPointEntity) {
        locationDao.insert(entity)
    }

    suspend fun getUnsynced(limit: Int = Constants.LOCATION_BATCH_SIZE): List<LocationPointEntity> {
        return locationDao.getUnsynced(limit)
    }

    suspend fun markSynced(ids: List<Long>) {
        locationDao.markSynced(ids)
    }

    suspend fun getLatest(): LocationPointEntity? {
        return locationDao.getLatest()
    }

    suspend fun cleanup() {
        val cutoff = DateTimeUtils.daysAgoIso(Constants.DATA_RETENTION_DAYS)
        locationDao.cleanup(cutoff)
    }

    suspend fun getUnsyncedCount(): Int {
        return locationDao.getUnsyncedCount()
    }
}
