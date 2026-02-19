package com.fleetpulse.agent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.fleetpulse.agent.data.local.prefs.PrefsManager
import com.fleetpulse.agent.navigation.AppNavHost
import com.fleetpulse.agent.service.AgentForegroundService
import com.fleetpulse.agent.ui.theme.FleetPulseTheme
import com.fleetpulse.agent.worker.BatchSyncWorker
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var prefsManager: PrefsManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        if (prefsManager.isRegistered) {
            AgentForegroundService.start(this)
            BatchSyncWorker.schedule(this)
        }

        setContent {
            FleetPulseTheme {
                AppNavHost(prefsManager = prefsManager)
            }
        }
    }
}
