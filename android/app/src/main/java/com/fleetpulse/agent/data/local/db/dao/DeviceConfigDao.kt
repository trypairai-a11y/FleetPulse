package com.fleetpulse.agent.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.fleetpulse.agent.data.local.db.entity.DeviceConfigEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DeviceConfigDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(config: DeviceConfigEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(configs: List<DeviceConfigEntity>)

    @Query("SELECT * FROM device_config WHERE `key` = :key")
    suspend fun get(key: String): DeviceConfigEntity?

    @Query("SELECT * FROM device_config")
    fun observeAll(): Flow<List<DeviceConfigEntity>>

    @Query("SELECT value FROM device_config WHERE `key` = :key")
    suspend fun getValue(key: String): String?

    @Query("DELETE FROM device_config")
    suspend fun clearAll()
}
