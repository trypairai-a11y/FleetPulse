package com.fleetpulse.agent.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fleetpulse.agent.data.local.db.entity.LocationPointEntity

@Dao
interface LocationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(points: List<LocationPointEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(point: LocationPointEntity)

    @Query("SELECT * FROM location_points WHERE is_synced = 0 ORDER BY recorded_at ASC LIMIT :limit")
    suspend fun getUnsynced(limit: Int = 200): List<LocationPointEntity>

    @Query("UPDATE location_points SET is_synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM location_points WHERE is_synced = 1 AND created_at < :before")
    suspend fun cleanup(before: String)

    @Query("SELECT * FROM location_points ORDER BY recorded_at DESC LIMIT 1")
    suspend fun getLatest(): LocationPointEntity?

    @Query("SELECT COUNT(*) FROM location_points WHERE is_synced = 0")
    suspend fun getUnsyncedCount(): Int
}
