package com.pair.darb.agent;

import android.app.Application;
import android.content.Context;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.pair.darb.agent.data.local.db.AppDatabase;
import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.data.remote.api.RetrofitClient;

import java.util.concurrent.TimeUnit;

public class DarbAgentApp extends Application {

    private static DarbAgentApp instance;

    private AppDatabase appDatabase;
    private PrefsManager prefsManager;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        // Initialize SharedPreferences wrapper
        prefsManager = PrefsManager.getInstance(this);

        // Initialize Room database
        appDatabase = AppDatabase.getInstance(this);

        // Initialize Retrofit (eagerly so the singleton is ready)
        RetrofitClient.getInstance();

        // Schedule periodic background sync workers
        scheduleWorkers();
    }

    private void scheduleWorkers() {
        Constraints networkConstraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        // Sync worker – runs every 15 minutes (minimum WorkManager interval)
        PeriodicWorkRequest syncWorkRequest =
                new PeriodicWorkRequest.Builder(SyncWorker.class, 15, TimeUnit.MINUTES)
                        .setConstraints(networkConstraints)
                        .addTag("darb_sync")
                        .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "darb_sync_worker",
                ExistingPeriodicWorkPolicy.KEEP,
                syncWorkRequest
        );

        // Heartbeat worker – runs every 30 minutes
        PeriodicWorkRequest heartbeatWorkRequest =
                new PeriodicWorkRequest.Builder(HeartbeatWorker.class, 30, TimeUnit.MINUTES)
                        .setConstraints(networkConstraints)
                        .addTag("darb_heartbeat")
                        .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "darb_heartbeat_worker",
                ExistingPeriodicWorkPolicy.KEEP,
                heartbeatWorkRequest
        );
    }

    public static DarbAgentApp getInstance() {
        return instance;
    }

    public static Context getAppContext() {
        return instance.getApplicationContext();
    }

    public AppDatabase getAppDatabase() {
        return appDatabase;
    }

    public PrefsManager getPrefsManager() {
        return prefsManager;
    }
}
