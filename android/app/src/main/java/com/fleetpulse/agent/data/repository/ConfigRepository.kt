package com.fleetpulse.agent.data.repository

import android.util.Log
import com.fleetpulse.agent.data.local.db.dao.DeviceConfigDao
import com.fleetpulse.agent.data.local.db.entity.DeviceConfigEntity
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.ConfigDto
import com.fleetpulse.agent.util.DateTimeUtils
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConfigRepository @Inject constructor(
    private val api: AgentApiService,
    private val deviceConfigDao: DeviceConfigDao
) {
    companion object {
        private const val TAG = "ConfigRepository"
        const val KEY_SYNC_INTERVAL = "sync_interval_seconds"
        const val KEY_LOCATION_INTERVAL = "location_interval_seconds"
        const val KEY_HEARTBEAT_INTERVAL = "heartbeat_interval_seconds"
        const val KEY_MONITORED_APPS = "monitored_apps"
    }

    suspend fun refreshConfig(): ConfigDto? {
        return try {
            val response = api.getConfig()
            if (response.isSuccessful) {
                val config = response.body()!!
                cacheConfig(config)
                config
            } else {
                Log.w(TAG, "Config fetch failed: ${response.code()}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Config fetch error", e)
            null
        }
    }

    suspend fun validateToken(): Boolean {
        return try {
            val response = api.getConfig()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    private suspend fun cacheConfig(config: ConfigDto) {
        val now = DateTimeUtils.nowIso()
        val entities = listOf(
            DeviceConfigEntity(KEY_SYNC_INTERVAL, config.syncIntervalSeconds.toString(), now),
            DeviceConfigEntity(KEY_LOCATION_INTERVAL, config.locationIntervalSeconds.toString(), now),
            DeviceConfigEntity(KEY_HEARTBEAT_INTERVAL, config.heartbeatIntervalSeconds.toString(), now),
            DeviceConfigEntity(KEY_MONITORED_APPS, config.monitoredApps.joinToString(","), now),
        )
        deviceConfigDao.upsertAll(entities)
    }

    suspend fun getSyncInterval(): Int {
        return deviceConfigDao.getValue(KEY_SYNC_INTERVAL)?.toIntOrNull() ?: 30
    }

    suspend fun getLocationInterval(): Int {
        return deviceConfigDao.getValue(KEY_LOCATION_INTERVAL)?.toIntOrNull() ?: 10
    }

    suspend fun getHeartbeatInterval(): Int {
        return deviceConfigDao.getValue(KEY_HEARTBEAT_INTERVAL)?.toIntOrNull() ?: 300
    }

    fun observeConfig(): Flow<Map<String, String>> {
        return deviceConfigDao.observeAll().map { entities ->
            entities.associate { it.key to it.value }
        }
    }
}
