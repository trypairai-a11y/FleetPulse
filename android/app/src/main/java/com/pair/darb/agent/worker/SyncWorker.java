package com.pair.darb.agent.worker;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.util.Constants;

/**
 * WorkManager periodic worker that syncs locally accumulated data
 * (notifications, locations, app usage) to the backend.
 *
 * Runs every {@link Constants#SYNC_INTERVAL_MINUTES} minutes.
 */
public class SyncWorker extends Worker {

    private static final String TAG = "SyncWorker";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "SyncWorker started");

        AgentRepository repository = AgentRepository.getInstance(getApplicationContext());

        try {
            // Sync unsynced notifications captured by OrderNotificationListener
            boolean notifOk = repository.syncNotificationsSync();
            if (!notifOk) {
                Log.w(TAG, "syncNotifications returned false - scheduling retry");
                return Result.retry();
            }

            // Sync unsynced GPS locations captured by LocationTrackingService
            boolean locOk = repository.syncLocationsSync();
            if (!locOk) {
                Log.w(TAG, "syncLocations returned false - scheduling retry");
                return Result.retry();
            }

            // Sync app usage statistics
            boolean usageOk = repository.syncAppUsageSync();
            if (!usageOk) {
                Log.w(TAG, "syncAppUsage returned false - scheduling retry");
                return Result.retry();
            }

            Log.d(TAG, "SyncWorker completed successfully");
            return Result.success();

        } catch (Exception e) {
            Log.e(TAG, "SyncWorker encountered an error", e);
            return Result.retry();
        }
    }
}
