package com.fleetpulse.agent.util

object Constants {
    // Monitored delivery platform packages
    val MONITORED_PACKAGES = mapOf(
        "com.talabat.talabatcaptain" to "talabat",
        "com.keeta.driver" to "keeta",
        "com.deliveroo.rider" to "deliveroo",
        "com.jahez.driver" to "jahez"
    )

    // Sync intervals (milliseconds)
    const val SYNC_INTERVAL_MS = 5 * 60 * 1000L          // 5 minutes
    const val HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000L     // 5 minutes
    const val COMMAND_POLL_INTERVAL_MS = 2 * 60 * 1000L   // 2 minutes
    const val APP_USAGE_POLL_INTERVAL_MS = 60 * 1000L     // 1 minute

    // Location intervals (milliseconds)
    const val LOCATION_ACTIVE_INTERVAL_MS = 30 * 1000L    // 30 seconds during shift
    const val LOCATION_PASSIVE_INTERVAL_MS = 5 * 60 * 1000L // 5 minutes off shift

    // WorkManager intervals (minimum 15 minutes)
    const val WORKMANAGER_SYNC_INTERVAL_MIN = 15L
    const val WORKMANAGER_HEARTBEAT_INTERVAL_MIN = 15L

    // Data retention
    const val DATA_RETENTION_DAYS = 7

    // Batch limits
    const val NOTIFICATION_BATCH_SIZE = 100
    const val LOCATION_BATCH_SIZE = 200
    const val APP_USAGE_BATCH_SIZE = 100

    // Photo compression
    const val PHOTO_MAX_DIMENSION = 1280
    const val PHOTO_JPEG_QUALITY = 80

    // Notification channels
    const val FOREGROUND_NOTIFICATION_ID = 1001
}
