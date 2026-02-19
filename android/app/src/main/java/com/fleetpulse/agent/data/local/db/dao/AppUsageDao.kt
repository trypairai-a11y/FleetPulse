package com.fleetpulse.agent.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fleetpulse.agent.data.local.db.entity.AppUsageRecordEntity

@Dao
interface AppUsageDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(records: List<AppUsageRecordEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(record: AppUsageRecordEntity)

    @Query("SELECT * FROM app_usage_records WHERE is_synced = 0 ORDER BY recorded_at ASC LIMIT :limit")
    suspend fun getUnsynced(limit: Int = 100): List<AppUsageRecordEntity>

    @Query("UPDATE app_usage_records SET is_synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM app_usage_records WHERE is_synced = 1 AND created_at < :before")
    suspend fun cleanup(before: String)

    @Query("SELECT COUNT(*) FROM app_usage_records WHERE is_synced = 0")
    suspend fun getUnsyncedCount(): Int
}
