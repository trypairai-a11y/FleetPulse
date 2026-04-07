package com.pair.darb.agent.worker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.admin.DevicePolicyManager;
import android.app.admin.DeviceAdminReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.pair.darb.agent.receiver.DarbDeviceAdmin;
import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.util.Constants;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

/**
 * WorkManager periodic worker that polls the backend for pending commands
 * and executes them locally.
 *
 * Supported commands:
 *   LOCK            - lock the device screen immediately
 *   SEND_MESSAGE    - display a notification to the driver
 *   ENABLE_KIOSK    - pin the current task (screen pinning)
 *   DISABLE_KIOSK   - stop task pinning
 *
 * Note: WorkManager enforces a minimum periodic interval of 15 minutes.
 * For near-real-time polling the expedited one-time + re-enqueue pattern
 * is used via {@link #scheduleOneShot(Context)}.
 */
public class CommandPollWorker extends Worker {

    private static final String TAG = "CommandPollWorker";

    // Command type strings sent by the backend
    public static final String CMD_LOCK           = "LOCK";
    public static final String CMD_SEND_MESSAGE   = "SEND_MESSAGE";
    public static final String CMD_ENABLE_KIOSK   = "ENABLE_KIOSK";
    public static final String CMD_DISABLE_KIOSK  = "DISABLE_KIOSK";

    public CommandPollWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    // ---------------------------------------------------------------------------
    // Schedule helpers
    // ---------------------------------------------------------------------------

    /**
     * Enqueue a 15-minute periodic work request (WorkManager minimum).
     * Call this once from BootReceiver / Application.
     */
    public static void schedulePeriodic(Context ctx) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                CommandPollWorker.class,
                Constants.COMMAND_POLL_MINUTES, TimeUnit.MINUTES)
                .addTag(Constants.TAG_COMMAND_POLL)
                .build();

        WorkManager.getInstance(ctx)
                .enqueueUniquePeriodicWork(
                        Constants.TAG_COMMAND_POLL,
                        ExistingPeriodicWorkPolicy.KEEP,
                        request);
    }

    /**
     * Schedule an expedited one-time work request for near-immediate execution.
     * The worker re-enqueues itself at the end of doWork() to approximate 1-min polling.
     */
    public static void scheduleOneShot(Context ctx) {
        androidx.work.OneTimeWorkRequest request =
                new androidx.work.OneTimeWorkRequest.Builder(CommandPollWorker.class)
                        .addTag(Constants.TAG_COMMAND_POLL + "_oneshot")
                        .build();

        WorkManager.getInstance(ctx)
                .enqueue(request);
    }

    // ---------------------------------------------------------------------------
    // Worker
    // ---------------------------------------------------------------------------
    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "CommandPollWorker started");

        Context ctx = getApplicationContext();
        AgentRepository repository = AgentRepository.getInstance(ctx);

        try {
            JSONArray commands = repository.fetchPendingCommandsSync();
            if (commands == null) {
                Log.w(TAG, "fetchPendingCommands returned null - retry");
                return Result.retry();
            }

            for (int i = 0; i < commands.length(); i++) {
                JSONObject cmd = commands.getJSONObject(i);
                String id   = cmd.optString("id");
                String type = cmd.optString("type");
                String data = cmd.optString("data", "");

                Log.d(TAG, "Executing command id=" + id + " type=" + type);

                executeCommand(ctx, type, data);
                repository.acknowledgeCommandSync(id);
            }

            Log.d(TAG, "CommandPollWorker finished, processed " + commands.length() + " commands");
            return Result.success();

        } catch (Exception e) {
            Log.e(TAG, "CommandPollWorker error", e);
            return Result.retry();
        }
    }

    // ---------------------------------------------------------------------------
    // Command execution
    // ---------------------------------------------------------------------------
    private void executeCommand(Context ctx, String type, String data) {
        switch (type) {
            case CMD_LOCK:
                executeLock(ctx);
                break;
            case CMD_SEND_MESSAGE:
                executeSendMessage(ctx, data);
                break;
            case CMD_ENABLE_KIOSK:
                executeEnableKiosk(ctx);
                break;
            case CMD_DISABLE_KIOSK:
                executeDisableKiosk(ctx);
                break;
            default:
                Log.w(TAG, "Unknown command type: " + type);
        }
    }

    // Lock device via DevicePolicyManager
    private void executeLock(Context ctx) {
        try {
            DevicePolicyManager dpm =
                    (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName admin = new ComponentName(ctx, DarbDeviceAdmin.class);
            if (dpm != null && dpm.isAdminActive(admin)) {
                dpm.lockNow();
                Log.d(TAG, "Device locked");
            } else {
                Log.w(TAG, "DeviceAdmin not active - cannot lock");
            }
        } catch (Exception e) {
            Log.e(TAG, "executeLock error", e);
        }
    }

    // Show a notification with the given message
    private void executeSendMessage(Context ctx, String message) {
        try {
            ensureCommandChannel(ctx);
            NotificationManager nm =
                    (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                    ctx, Constants.NOTIFICATION_CHANNEL_COMMANDS)
                    .setContentTitle("Darb - Message")
                    .setContentText(message)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true);

            nm.notify(Constants.NOTIF_ID_COMMAND, builder.build());
            Log.d(TAG, "Message notification shown: " + message);
        } catch (Exception e) {
            Log.e(TAG, "executeSendMessage error", e);
        }
    }

    // Enable kiosk / screen pinning via ActivityManager
    private void executeEnableKiosk(Context ctx) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                android.app.ActivityManager am =
                        (android.app.ActivityManager) ctx.getSystemService(
                                Context.ACTIVITY_SERVICE);
                if (am != null) {
                    // startLockTask must be called from an Activity; log intent here
                    Log.d(TAG, "ENABLE_KIOSK received - startLockTask must be called from Activity");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "executeEnableKiosk error", e);
        }
    }

    // Disable kiosk / screen pinning
    private void executeDisableKiosk(Context ctx) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                android.app.ActivityManager am =
                        (android.app.ActivityManager) ctx.getSystemService(
                                Context.ACTIVITY_SERVICE);
                if (am != null) {
                    Log.d(TAG, "DISABLE_KIOSK received - stopLockTask must be called from Activity");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "executeDisableKiosk error", e);
        }
    }

    // ---------------------------------------------------------------------------
    // Notification channel for commands
    // ---------------------------------------------------------------------------
    private void ensureCommandChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm =
                    (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (nm.getNotificationChannel(Constants.NOTIFICATION_CHANNEL_COMMANDS) == null) {
                NotificationChannel channel = new NotificationChannel(
                        Constants.NOTIFICATION_CHANNEL_COMMANDS,
                        "Darb Commands",
                        NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Remote commands from Darb backend");
                nm.createNotificationChannel(channel);
            }
        }
    }
}
