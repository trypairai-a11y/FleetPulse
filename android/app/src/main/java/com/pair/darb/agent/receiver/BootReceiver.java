package com.pair.darb.agent.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.service.LocationTrackingService;
import com.pair.darb.agent.worker.CommandPollWorker;
import com.pair.darb.agent.worker.HeartbeatWorker;
import com.pair.darb.agent.worker.SyncWorker;
import com.pair.darb.agent.util.Constants;

import java.util.concurrent.TimeUnit;

/**
 * Starts background services and enqueues WorkManager workers after device reboot.
 *
 * Required permission in AndroidManifest:
 *   <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
 */
public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }

        Log.d(TAG, "Boot completed - starting Darb background services");

        PrefsManager prefs = PrefsManager.getInstance(context);

        // Only start location tracking if there is an active shift
        if (prefs.isEnrolled() && prefs.isOnShift()) {
            startLocationService(context);
        }

        // Always enqueue workers if the device is enrolled
        if (prefs.isEnrolled()) {
            enqueueSyncWorker(context);
            enqueueHeartbeatWorker(context);
            CommandPollWorker.schedulePeriodic(context);
        }
    }

    // ---------------------------------------------------------------------------
    // Location service
    // ---------------------------------------------------------------------------
    private void startLocationService(Context context) {
        Intent serviceIntent = new Intent(context, LocationTrackingService.class);
        serviceIntent.setAction(LocationTrackingService.ACTION_START_TRACKING);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "LocationTrackingService started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start LocationTrackingService", e);
        }
    }

    // ---------------------------------------------------------------------------
    // WorkManager workers
    // ---------------------------------------------------------------------------
    private void enqueueSyncWorker(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                SyncWorker.class,
                Constants.SYNC_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .addTag(Constants.TAG_SYNC_WORKER)
                .build();

        WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                        Constants.TAG_SYNC_WORKER,
                        ExistingPeriodicWorkPolicy.KEEP,
                        request);

        Log.d(TAG, "SyncWorker enqueued");
    }

    private void enqueueHeartbeatWorker(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                HeartbeatWorker.class,
                Constants.HEARTBEAT_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .addTag(Constants.TAG_HEARTBEAT_WORKER)
                .build();

        WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                        Constants.TAG_HEARTBEAT_WORKER,
                        ExistingPeriodicWorkPolicy.KEEP,
                        request);

        Log.d(TAG, "HeartbeatWorker enqueued");
    }
}
