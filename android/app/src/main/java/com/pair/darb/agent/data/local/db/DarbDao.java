package com.pair.darb.agent.data.local.db;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import java.util.List;

@Dao
public interface DarbDao {

    // ── Insert ────────────────────────────────────────────────────────────────

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insertNotification(CapturedNotification notification);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insertLocation(LocationEntry location);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    long insertAppUsage(AppUsageEntry appUsage);

    // ── Query unsynced ────────────────────────────────────────────────────────

    @Query("SELECT * FROM captured_notifications WHERE synced = 0 ORDER BY captured_at ASC LIMIT 100")
    List<CapturedNotification> getUnsyncedNotifications();

    @Query("SELECT * FROM location_entries WHERE synced = 0 ORDER BY captured_at ASC LIMIT 100")
    List<LocationEntry> getUnsyncedLocations();

    @Query("SELECT * FROM app_usage_entries WHERE synced = 0 ORDER BY captured_at ASC LIMIT 100")
    List<AppUsageEntry> getUnsyncedAppUsage();

    // ── Mark synced ───────────────────────────────────────────────────────────

    @Query("UPDATE captured_notifications SET synced = 1 WHERE id IN (:ids)")
    void markNotificationsSynced(List<Long> ids);

    @Query("UPDATE location_entries SET synced = 1 WHERE id IN (:ids)")
    void markLocationsSynced(List<Long> ids);

    @Query("UPDATE app_usage_entries SET synced = 1 WHERE id IN (:ids)")
    void markAppUsageSynced(List<Long> ids);

    // ── Cleanup (optional helpers) ────────────────────────────────────────────

    @Query("DELETE FROM captured_notifications WHERE synced = 1")
    void deleteSyncedNotifications();

    @Query("DELETE FROM location_entries WHERE synced = 1")
    void deleteSyncedLocations();

    @Query("DELETE FROM app_usage_entries WHERE synced = 1")
    void deleteSyncedAppUsage();
}
