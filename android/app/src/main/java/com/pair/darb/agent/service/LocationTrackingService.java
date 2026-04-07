package com.pair.darb.agent.service;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.pair.darb.agent.data.local.db.AppDatabase;
import com.pair.darb.agent.data.local.db.DarbDao;
import com.pair.darb.agent.data.local.entity.LocationEntity;
import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.ui.main.MainActivity;
import com.pair.darb.agent.util.Constants;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Foreground service that tracks GPS location during a driver's shift.
 *
 * - Active shift:  update every 30 seconds (or 5 min when speed < 1 m/s)
 * - No shift:      update every 5 minutes
 */
public class LocationTrackingService extends Service {

    private static final String TAG = "LocationTrackingService";

    public static final String ACTION_START_TRACKING = "com.pair.darb.agent.action.START_TRACKING";
    public static final String ACTION_STOP_TRACKING  = "com.pair.darb.agent.action.STOP_TRACKING";

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private DarbDao darbDao;
    private PrefsManager prefsManager;
    private ExecutorService ioExecutor;

    private boolean trackingActive = false;

    // ---------------------------------------------------------------------------
    // Service lifecycle
    // ---------------------------------------------------------------------------
    @Override
    public void onCreate() {
        super.onCreate();
        fusedClient  = LocationServices.getFusedLocationProviderClient(this);
        darbDao      = AppDatabase.getInstance(this).darbDao();
        prefsManager = PrefsManager.getInstance(this);
        ioExecutor   = Executors.newSingleThreadExecutor();

        createNotificationChannel();
        buildLocationCallback();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (ACTION_START_TRACKING.equals(action)) {
            startForegroundWithNotification();
            startLocationUpdates();
        } else if (ACTION_STOP_TRACKING.equals(action)) {
            stopLocationUpdates();
            stopForeground(true);
            stopSelf();
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopLocationUpdates();
        ioExecutor.shutdown();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ---------------------------------------------------------------------------
    // Foreground notification
    // ---------------------------------------------------------------------------
    private void startForegroundWithNotification() {
        Intent notifIntent = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notifIntent, flags);

        Notification notification = new NotificationCompat.Builder(this,
                Constants.NOTIFICATION_CHANNEL_TRACKING)
                .setContentTitle("Darb - Location Active")
                .setContentText("Tracking your location during shift")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        startForeground(Constants.NOTIF_ID_LOCATION, notification);
    }

    // ---------------------------------------------------------------------------
    // Location updates
    // ---------------------------------------------------------------------------
    private void startLocationUpdates() {
        if (trackingActive) return;

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Location permission not granted - cannot start tracking");
            return;
        }

        long intervalMs = prefsManager.isOnShift()
                ? Constants.LOCATION_INTERVAL_ACTIVE_MS
                : Constants.LOCATION_INTERVAL_IDLE_MS;

        LocationRequest request;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
                    .setMinUpdateIntervalMillis(intervalMs / 2)
                    .build();
        } else {
            //noinspection deprecation
            request = LocationRequest.create()
                    .setInterval(intervalMs)
                    .setFastestInterval(intervalMs / 2)
                    .setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
        }

        fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        trackingActive = true;
        Log.d(TAG, "Location updates started, interval=" + intervalMs + "ms");
    }

    private void stopLocationUpdates() {
        if (!trackingActive) return;
        fusedClient.removeLocationUpdates(locationCallback);
        trackingActive = false;
        Log.d(TAG, "Location updates stopped");
    }

    private void buildLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;

                for (Location loc : result.getLocations()) {
                    handleNewLocation(loc);
                }
            }
        };
    }

    private void handleNewLocation(Location loc) {
        float speed = loc.hasSpeed() ? loc.getSpeed() : 0f;

        // Battery optimisation: if speed is very low AND on shift, we could switch to idle
        // interval but that requires re-requesting. Here we just log and persist all fixes.
        Log.d(TAG, String.format("Location: %.6f, %.6f  speed=%.2f m/s",
                loc.getLatitude(), loc.getLongitude(), speed));

        final LocationEntity entity = new LocationEntity();
        entity.latitude    = loc.getLatitude();
        entity.longitude   = loc.getLongitude();
        entity.accuracy    = loc.getAccuracy();
        entity.speed       = speed;
        entity.timestampMs = loc.getTime();
        entity.shiftId     = prefsManager.getCurrentShiftId();
        entity.synced      = false;

        ioExecutor.execute(() -> {
            try {
                darbDao.insertLocation(entity);
            } catch (Exception e) {
                Log.e(TAG, "Failed to save location", e);
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Notification channel
    // ---------------------------------------------------------------------------
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    Constants.NOTIFICATION_CHANNEL_TRACKING,
                    "Location Tracking",
                    NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Darb driver location tracking during shift");
            channel.setShowBadge(false);

            NotificationManager manager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
