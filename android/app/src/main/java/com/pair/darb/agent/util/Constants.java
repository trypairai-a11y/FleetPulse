package com.pair.darb.agent.util;

public final class Constants {

    private Constants() {}

    // ----------------------------
    // Whitelisted courier packages
    // ----------------------------
    public static final String[] WHITELISTED_PACKAGES = {
            "com.keeta.courier",
            "com.talabat.captain",
            "com.deliveroo.rider",
            "com.americana.driver"
    };

    // ----------------------------
    // Notification channels
    // ----------------------------
    public static final String NOTIFICATION_CHANNEL_TRACKING  = "location_tracking";
    public static final String NOTIFICATION_CHANNEL_COMMANDS  = "darb_commands";
    public static final String NOTIFICATION_CHANNEL_SYNC      = "darb_sync";

    // ----------------------------
    // WorkManager tags
    // ----------------------------
    public static final String TAG_SYNC_WORKER       = "darb_sync_worker";
    public static final String TAG_HEARTBEAT_WORKER  = "darb_heartbeat_worker";
    public static final String TAG_COMMAND_POLL      = "darb_command_poll_worker";

    // ----------------------------
    // Shift / selfie action constants
    // ----------------------------
    public static final String ACTION_CLOCK_IN  = "ACTION_CLOCK_IN";
    public static final String ACTION_CLOCK_OUT = "ACTION_CLOCK_OUT";

    public static final String EXTRA_ACTION   = "extra_action";
    public static final String EXTRA_SHIFT_ID = "extra_shift_id";

    // ----------------------------
    // Result codes
    // ----------------------------
    public static final int REQUEST_CLOCK_IN  = 1001;
    public static final int REQUEST_CLOCK_OUT = 1002;

    // ----------------------------
    // Location intervals (ms)
    // ----------------------------
    public static final long LOCATION_INTERVAL_ACTIVE_MS = 30_000L;   // 30 seconds on shift
    public static final long LOCATION_INTERVAL_IDLE_MS   = 300_000L;  // 5 minutes idle
    public static final float SPEED_THRESHOLD_MS         = 1.0f;       // m/s below = battery save

    // ----------------------------
    // Sync / heartbeat intervals (min)
    // ----------------------------
    public static final long SYNC_INTERVAL_MINUTES      = 15L;
    public static final long HEARTBEAT_INTERVAL_MINUTES = 15L;
    public static final long COMMAND_POLL_MINUTES       = 15L;

    // ----------------------------
    // Notification IDs
    // ----------------------------
    public static final int NOTIF_ID_LOCATION  = 2001;
    public static final int NOTIF_ID_COMMAND   = 2002;

    // ----------------------------
    // Screenshot types
    // ----------------------------
    public static final String SCREENSHOT_TYPE_ORDER  = "Order Summary";
    public static final String SCREENSHOT_TYPE_SHIFT  = "Shift Details";
    public static final String SCREENSHOT_TYPE_CASH   = "Cash Collection";
}
