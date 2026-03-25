package com.pair.darb.agent.service;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.pair.darb.agent.data.local.db.AppDatabase;
import com.pair.darb.agent.data.local.db.DarbDao;
import com.pair.darb.agent.data.local.entity.NotificationEntity;
import com.pair.darb.agent.util.Constants;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Captures notifications from whitelisted courier apps and persists them
 * to the local Room database for later sync to the backend.
 */
public class OrderNotificationListener extends NotificationListenerService {

    private static final String TAG = "OrderNotifListener";

    private static final Set<String> WHITELIST = new HashSet<>(
            Arrays.asList(Constants.WHITELISTED_PACKAGES));

    private DarbDao darbDao;
    private ExecutorService ioExecutor;

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    @Override
    public void onCreate() {
        super.onCreate();
        darbDao    = AppDatabase.getInstance(this).darbDao();
        ioExecutor = Executors.newSingleThreadExecutor();
        Log.d(TAG, "OrderNotificationListener started");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        ioExecutor.shutdown();
    }

    // ---------------------------------------------------------------------------
    // Notification callbacks
    // ---------------------------------------------------------------------------
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();
        if (!WHITELIST.contains(packageName)) {
            // Silently ignore — not a whitelisted courier app
            return;
        }

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        String title  = extras != null ? safeString(extras.get(Notification.EXTRA_TITLE))      : "";
        String text   = extras != null ? safeString(extras.get(Notification.EXTRA_TEXT))       : "";
        String bigText= extras != null ? safeString(extras.get(Notification.EXTRA_BIG_TEXT))   : "";

        // Prefer big text (more detail) if available
        String content = bigText.isEmpty() ? text : bigText;

        Log.d(TAG, "Captured notification from " + packageName + ": " + title);

        final NotificationEntity entity = new NotificationEntity();
        entity.packageName  = packageName;
        entity.title        = title;
        entity.content      = content;
        entity.timestampMs  = sbn.getPostTime();
        entity.notifKey     = sbn.getKey();
        entity.synced       = false;

        ioExecutor.execute(() -> {
            try {
                darbDao.insertNotification(entity);
            } catch (Exception e) {
                Log.e(TAG, "Failed to insert notification to DB", e);
            }
        });
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Not needed — we only care about posting events
    }

    // ---------------------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------------------
    private String safeString(Object obj) {
        if (obj == null) return "";
        return obj.toString();
    }
}
