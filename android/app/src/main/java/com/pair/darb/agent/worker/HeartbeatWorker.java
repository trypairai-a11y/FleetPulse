package com.pair.darb.agent.worker;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.Tasks;
import com.pair.darb.agent.BuildConfig;
import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.util.Constants;

import java.util.concurrent.TimeUnit;

/**
 * WorkManager periodic worker that sends a heartbeat payload to the backend
 * including battery level, agent version, and the last known GPS coordinates.
 *
 * Runs every {@link Constants#HEARTBEAT_INTERVAL_MINUTES} minutes.
 */
public class HeartbeatWorker extends Worker {

    private static final String TAG = "HeartbeatWorker";

    public HeartbeatWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "HeartbeatWorker started");

        Context ctx = getApplicationContext();

        int batteryLevel     = getBatteryLevel(ctx);
        String agentVersion  = getAgentVersion();
        double[] coordinates = getLastCoordinates(ctx);

        AgentRepository repository = AgentRepository.getInstance(ctx);

        try {
            boolean ok = repository.sendHeartbeatSync(batteryLevel, agentVersion,
                    coordinates[0], coordinates[1]);

            if (ok) {
                Log.d(TAG, "Heartbeat sent - battery=" + batteryLevel
                        + "% lat=" + coordinates[0] + " lng=" + coordinates[1]);
                return Result.success();
            } else {
                Log.w(TAG, "Heartbeat API returned failure - will retry");
                return Result.retry();
            }

        } catch (Exception e) {
            Log.e(TAG, "HeartbeatWorker error", e);
            return Result.retry();
        }
    }

    // ---------------------------------------------------------------------------
    // Battery
    // ---------------------------------------------------------------------------
    private int getBatteryLevel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            BatteryManager bm = (BatteryManager) ctx.getSystemService(Context.BATTERY_SERVICE);
            if (bm != null) {
                int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
                if (level >= 0 && level <= 100) return level;
            }
        }

        // Fallback for older APIs
        Intent batteryIntent = ctx.registerReceiver(null,
                new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (batteryIntent != null) {
            int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            if (level >= 0 && scale > 0) {
                return (int) ((level / (float) scale) * 100);
            }
        }
        return -1;
    }

    // ---------------------------------------------------------------------------
    // Version
    // ---------------------------------------------------------------------------
    private String getAgentVersion() {
        try {
            return BuildConfig.VERSION_NAME;
        } catch (Exception e) {
            return "unknown";
        }
    }

    // ---------------------------------------------------------------------------
    // Last known location (blocking, with timeout)
    // ---------------------------------------------------------------------------
    @SuppressLint("MissingPermission")
    private double[] getLastCoordinates(Context ctx) {
        try {
            FusedLocationProviderClient client =
                    LocationServices.getFusedLocationProviderClient(ctx);
            Location loc = Tasks.await(client.getLastLocation(), 5, TimeUnit.SECONDS);
            if (loc != null) {
                return new double[]{ loc.getLatitude(), loc.getLongitude() };
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not retrieve last location: " + e.getMessage());
        }
        return new double[]{ 0.0, 0.0 };
    }
}
