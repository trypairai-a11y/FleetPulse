package com.pair.darb.agent.data.local.db;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "app_usage_entries")
public class AppUsageEntry {

    @PrimaryKey(autoGenerate = true)
    public long id;

    @ColumnInfo(name = "app_package")
    public String appPackage;

    @ColumnInfo(name = "event_type")
    public String eventType;

    @ColumnInfo(name = "duration_seconds")
    public int durationSeconds;

    @ColumnInfo(name = "captured_at")
    public long capturedAt;

    @ColumnInfo(name = "synced", defaultValue = "0")
    public boolean synced;

    public AppUsageEntry() {
    }

    public AppUsageEntry(String appPackage, String eventType, int durationSeconds, long capturedAt) {
        this.appPackage = appPackage;
        this.eventType = eventType;
        this.durationSeconds = durationSeconds;
        this.capturedAt = capturedAt;
        this.synced = false;
    }
}
