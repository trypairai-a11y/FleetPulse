package com.pair.darb.agent.data.local.db;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "captured_notifications")
public class CapturedNotification {

    @PrimaryKey(autoGenerate = true)
    public long id;

    @ColumnInfo(name = "package_name")
    public String packageName;

    @ColumnInfo(name = "title")
    public String title;

    @ColumnInfo(name = "text")
    public String text;

    @ColumnInfo(name = "captured_at")
    public long capturedAt;

    @ColumnInfo(name = "synced", defaultValue = "0")
    public boolean synced;

    public CapturedNotification() {
    }

    public CapturedNotification(String packageName, String title, String text, long capturedAt) {
        this.packageName = packageName;
        this.title = title;
        this.text = text;
        this.capturedAt = capturedAt;
        this.synced = false;
    }
}
