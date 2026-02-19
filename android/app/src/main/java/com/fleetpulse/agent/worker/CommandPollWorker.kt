package com.fleetpulse.agent.worker

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.fleetpulse.agent.data.local.db.dao.DeviceConfigDao
import com.fleetpulse.agent.data.local.db.entity.DeviceConfigEntity
import com.fleetpulse.agent.data.remote.api.AgentApiService
import com.fleetpulse.agent.data.remote.dto.CommandResultRequest
import com.fleetpulse.agent.data.repository.LocationRepository
import com.fleetpulse.agent.util.DateTimeUtils
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CommandPollWorker @Inject constructor(
    private val api: AgentApiService,
    private val locationRepository: LocationRepository,
    private val deviceConfigDao: DeviceConfigDao
) {
    companion object {
        private const val TAG = "CommandPollWorker"
    }

    private var activeMediaPlayer: MediaPlayer? = null

    suspend fun pollAndExecute(context: Context) {
        try {
            val response = api.getCommands()
            if (!response.isSuccessful) {
                Log.w(TAG, "Command poll failed: ${response.code()}")
                return
            }

            val commands = response.body() ?: return
            for (command in commands) {
                val result = executeCommand(context, command.commandType, command.payload)
                reportResult(command.id, result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Command poll error", e)
        }
    }

    private suspend fun executeCommand(
        context: Context,
        commandType: String,
        payload: Map<String, Any>?
    ): CommandResult {
        return when (commandType) {
            "locate" -> executeLocate()
            "ring" -> executeRing(context)
            "update_config" -> executeUpdateConfig(payload)
            "lock" -> CommandResult(false, error = "Device Owner provisioning required for lock")
            "wipe" -> CommandResult(false, error = "Device Owner provisioning required for wipe")
            "reboot" -> CommandResult(false, error = "Device Owner provisioning required for reboot")
            else -> CommandResult(false, error = "Unknown command: $commandType")
        }
    }

    private suspend fun executeLocate(): CommandResult {
        val latest = locationRepository.getLatest()
        return if (latest != null) {
            CommandResult(
                success = true,
                output = "lat=${latest.latitude},lng=${latest.longitude},accuracy=${latest.accuracy},recorded_at=${latest.recordedAt}"
            )
        } else {
            CommandResult(false, error = "No location data available")
        }
    }

    private fun executeRing(context: Context): CommandResult {
        return try {
            // Release any existing player first
            releaseMediaPlayer()

            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.setStreamVolume(
                AudioManager.STREAM_ALARM,
                audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM),
                0
            )

            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(context, alarmUri)
                isLooping = false
                prepareAsync()
                setOnPreparedListener { it.start() }
                setOnCompletionListener { releaseMediaPlayer() }
                setOnErrorListener { _, _, _ ->
                    releaseMediaPlayer()
                    true
                }
            }
            activeMediaPlayer = player

            // Stop after 30 seconds
            Handler(Looper.getMainLooper()).postDelayed({
                releaseMediaPlayer()
            }, 30_000)

            CommandResult(true, output = "Ring alarm started for 30 seconds")
        } catch (e: Exception) {
            releaseMediaPlayer()
            CommandResult(false, error = "Ring failed: ${e.message}")
        }
    }

    @Synchronized
    private fun releaseMediaPlayer() {
        try {
            activeMediaPlayer?.let { player ->
                if (player.isPlaying) player.stop()
                player.release()
            }
        } catch (_: Exception) {}
        activeMediaPlayer = null
    }

    private suspend fun executeUpdateConfig(payload: Map<String, Any>?): CommandResult {
        if (payload == null) return CommandResult(false, error = "No payload provided")

        return try {
            val now = DateTimeUtils.nowIso()
            payload.forEach { (key, value) ->
                deviceConfigDao.upsert(DeviceConfigEntity(key, value.toString(), now))
            }
            CommandResult(true, output = "Config updated: ${payload.keys.joinToString()}")
        } catch (e: Exception) {
            CommandResult(false, error = "Config update failed: ${e.message}")
        }
    }

    private suspend fun reportResult(commandId: String, result: CommandResult) {
        try {
            api.reportCommandResult(
                commandId,
                CommandResultRequest(
                    success = result.success,
                    output = result.output,
                    error = result.error
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to report command result", e)
        }
    }

    private data class CommandResult(
        val success: Boolean,
        val output: String? = null,
        val error: String? = null
    )
}
