package com.fleetpulse.agent.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.fleetpulse.agent.FleetPulseApp
import com.fleetpulse.agent.MainActivity
import com.fleetpulse.agent.R
import com.fleetpulse.agent.capture.AppUsageTracker
import com.fleetpulse.agent.capture.LocationTracker
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.data.repository.ConfigRepository
import com.fleetpulse.agent.data.repository.SyncRepository
import com.fleetpulse.agent.util.Constants
import com.fleetpulse.agent.util.NetworkUtils
import com.fleetpulse.agent.worker.CommandPollWorker
import com.fleetpulse.agent.worker.HeartbeatWorker
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class AgentForegroundService : Service() {

    @Inject lateinit var prefsManager: PrefsManager
    @Inject lateinit var syncRepository: SyncRepository
    @Inject lateinit var configRepository: ConfigRepository
    @Inject lateinit var locationTracker: LocationTracker
    @Inject lateinit var appUsageTracker: AppUsageTracker
    @Inject lateinit var heartbeatWorker: HeartbeatWorker
    @Inject lateinit var commandPollWorker: CommandPollWorker

    private var serviceScope: CoroutineScope? = null
    private var syncJob: Job? = null
    private var heartbeatJob: Job? = null
    private var commandJob: Job? = null
    private var usageJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(Constants.FOREGROUND_NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Handle null intent (system restart after kill) — re-start tasks
        if (intent == null) {
            startAllTasks()
            return START_STICKY
        }

        when (intent.action) {
            ACTION_START -> startAllTasks()
            ACTION_STOP -> {
                stopAllTasks()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_CLOCK_IN -> {
                locationTracker.switchMode(active = true)
            }
            ACTION_CLOCK_OUT -> {
                locationTracker.switchMode(active = false)
            }
        }
        return START_STICKY
    }

    private fun startAllTasks() {
        // Cancel any existing scope and create a fresh one
        serviceScope?.cancel()
        serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

        // Start location tracking
        val isActive = prefsManager.isClockedIn
        locationTracker.startTracking(active = isActive)

        // Start app usage polling
        startUsagePolling()

        // Start periodic sync
        startSyncLoop()

        // Start heartbeat
        startHeartbeatLoop()

        // Start command polling
        startCommandPolling()

        // Fetch initial config
        serviceScope?.launch {
            configRepository.refreshConfig()
        }
    }

    private fun stopAllTasks() {
        syncJob?.cancel()
        heartbeatJob?.cancel()
        commandJob?.cancel()
        usageJob?.cancel()
        locationTracker.stopTracking()
        appUsageTracker.stop()
        serviceScope?.cancel()
        serviceScope = null
    }

    private fun startSyncLoop() {
        syncJob?.cancel()
        syncJob = serviceScope?.launch {
            while (true) {
                delay(Constants.SYNC_INTERVAL_MS)
                if (NetworkUtils.isOnline(this@AgentForegroundService)) {
                    try {
                        syncRepository.syncAll()
                    } catch (_: Exception) {}
                }
            }
        }
    }

    private fun startHeartbeatLoop() {
        heartbeatJob?.cancel()
        heartbeatJob = serviceScope?.launch {
            while (true) {
                delay(Constants.HEARTBEAT_INTERVAL_MS)
                if (NetworkUtils.isOnline(this@AgentForegroundService)) {
                    try {
                        heartbeatWorker.sendHeartbeat(this@AgentForegroundService)
                    } catch (_: Exception) {}
                }
            }
        }
    }

    private fun startCommandPolling() {
        commandJob?.cancel()
        commandJob = serviceScope?.launch {
            while (true) {
                delay(Constants.COMMAND_POLL_INTERVAL_MS)
                if (NetworkUtils.isOnline(this@AgentForegroundService)) {
                    try {
                        commandPollWorker.pollAndExecute(this@AgentForegroundService)
                    } catch (_: Exception) {}
                }
            }
        }
    }

    private fun startUsagePolling() {
        usageJob?.cancel()
        appUsageTracker.start()
        usageJob = serviceScope?.launch {
            while (true) {
                delay(Constants.APP_USAGE_POLL_INTERVAL_MS)
                try {
                    appUsageTracker.captureCurrentUsage()
                } catch (_: Exception) {}
            }
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, FleetPulseApp.CHANNEL_SERVICE)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.service_notification_text))
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    override fun onDestroy() {
        stopAllTasks()
        super.onDestroy()
    }

    companion object {
        const val ACTION_START = "com.fleetpulse.agent.START"
        const val ACTION_STOP = "com.fleetpulse.agent.STOP"
        const val ACTION_CLOCK_IN = "com.fleetpulse.agent.CLOCK_IN"
        const val ACTION_CLOCK_OUT = "com.fleetpulse.agent.CLOCK_OUT"

        fun start(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java).apply {
                action = ACTION_START
            }
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }

        fun notifyClockIn(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java).apply {
                action = ACTION_CLOCK_IN
            }
            context.startService(intent)
        }

        fun notifyClockOut(context: Context) {
            val intent = Intent(context, AgentForegroundService::class.java).apply {
                action = ACTION_CLOCK_OUT
            }
            context.startService(intent)
        }
    }
}
