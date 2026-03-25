package com.pair.darb.agent.data.local.db;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "location_entries")
public class LocationEntry {

    @PrimaryKey(autoGenerate = true)
    public long id;

    @ColumnInfo(name = "latitude")
    public double latitude;

    @ColumnInfo(name = "longitude")
    public double longitude;

    @ColumnInfo(name = "accuracy")
    public float accuracy;

    @ColumnInfo(name = "speed")
    public float speed;

    @ColumnInfo(name = "captured_at")
    public long capturedAt;

    @ColumnInfo(name = "synced", defaultValue = "0")
    public boolean synced;

    public LocationEntry() {
    }

    public LocationEntry(double latitude, double longitude, float accuracy, float speed, long capturedAt) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.speed = speed;
        this.capturedAt = capturedAt;
        this.synced = false;
    }
}
