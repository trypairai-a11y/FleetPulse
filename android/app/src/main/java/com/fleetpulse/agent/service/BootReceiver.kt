package com.fleetpulse.agent.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject
    lateinit var prefsManager: PrefsManager

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            if (prefsManager.isRegistered) {
                AgentForegroundService.start(context)
            }
        }
    }
}
