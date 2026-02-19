package com.fleetpulse.agent.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fleetpulse.agent.data.local.db.entity.CapturedNotificationEntity

@Dao
interface NotificationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(notifications: List<CapturedNotificationEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(notification: CapturedNotificationEntity)

    @Query("SELECT * FROM captured_notifications WHERE is_synced = 0 ORDER BY created_at ASC LIMIT :limit")
    suspend fun getUnsynced(limit: Int = 100): List<CapturedNotificationEntity>

    @Query("UPDATE captured_notifications SET is_synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM captured_notifications WHERE is_synced = 1 AND created_at < :before")
    suspend fun cleanup(before: String)

    @Query("SELECT COUNT(*) FROM captured_notifications WHERE is_synced = 0")
    suspend fun getUnsyncedCount(): Int
}
