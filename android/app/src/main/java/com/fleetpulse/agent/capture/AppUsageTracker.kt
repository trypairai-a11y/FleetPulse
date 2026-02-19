package com.fleetpulse.agent.capture

import android.app.usage.UsageStatsManager
import android.content.Context
import com.fleetpulse.agent.data.local.db.entity.AppUsageRecordEntity
import com.fleetpulse.agent.data.repository.AppUsageRepository
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.DateTimeUtils
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppUsageTracker @Inject constructor(
    @ApplicationContext private val context: Context,
    private val appUsageRepository: AppUsageRepository
) {
    private val usageStatsManager: UsageStatsManager? =
        context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager

    private var lastPollTime: Long = 0
    private var isRunning = false

    // Track previous cumulative foreground times per package to compute deltas
    private val lastForegroundTimes = mutableMapOf<String, Long>()

    fun start() {
        lastPollTime = System.currentTimeMillis()
        lastForegroundTimes.clear()
        isRunning = true
    }

    fun stop() {
        isRunning = false
        lastForegroundTimes.clear()
    }

    suspend fun captureCurrentUsage() {
        if (!isRunning || usageStatsManager == null) return

        val now = System.currentTimeMillis()
        val queryStart = if (lastPollTime > 0) lastPollTime else now - 60_000

        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_BEST,
            queryStart,
            now
        )

        val monitoredPackages = Constants.MONITORED_PACKAGES.keys
        val timestamp = DateTimeUtils.nowIso()

        stats?.filter { it.packageName in monitoredPackages && it.totalTimeInForeground > 0 }
            ?.forEach { stat ->
                val currentCumulative = stat.totalTimeInForeground
                val previousCumulative = lastForegroundTimes[stat.packageName] ?: 0L

                val deltaMs = (currentCumulative - previousCumulative).coerceAtLeast(0)
                val deltaSec = (deltaMs / 1000).toInt()

                // Update tracked cumulative time
                lastForegroundTimes[stat.packageName] = currentCumulative

                if (deltaSec > 0) {
                    val entity = AppUsageRecordEntity(
                        appPackage = stat.packageName,
                        appName = Constants.MONITORED_PACKAGES[stat.packageName],
                        eventType = "foreground",
                        durationSeconds = deltaSec,
                        recordedAt = timestamp,
                        createdAt = timestamp
                    )
                    appUsageRepository.insert(entity)
                }
            }

        lastPollTime = now
    }

    fun hasPermission(): Boolean {
        if (usageStatsManager == null) return false
        val now = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            now - 60_000,
            now
        )
        return stats != null && stats.isNotEmpty()
    }
}
