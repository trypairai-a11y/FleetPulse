package com.pair.darb.agent.repository;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.pair.darb.agent.data.local.db.AppDatabase;
import com.pair.darb.agent.data.local.db.AppUsageEntry;
import com.pair.darb.agent.data.local.db.CapturedNotification;
import com.pair.darb.agent.data.local.db.DarbDao;
import com.pair.darb.agent.data.local.db.LocationEntry;
import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.data.remote.api.DarbApi;
import com.pair.darb.agent.data.remote.api.RetrofitClient;
import com.pair.darb.agent.data.remote.dto.BasicResponse;
import com.pair.darb.agent.data.remote.dto.CommandResponse;
import com.pair.darb.agent.data.remote.dto.RegisterResponse;
import com.pair.darb.agent.data.remote.dto.SelfieResponse;
import com.pair.darb.agent.data.remote.dto.SyncResponse;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Response;

/**
 * AgentRepository centralises all data operations for the Darb agent.
 *
 * <p>Every public method is synchronous and is intended to be called from a
 * background thread (e.g. inside a WorkManager Worker or an ExecutorService).
 */
public class AgentRepository {

    private static final String TAG = "AgentRepository";

    private final DarbDao dao;
    private final DarbApi api;
    private final PrefsManager prefs;

    public AgentRepository(DarbDao dao, DarbApi api, PrefsManager prefs) {
        this.dao = dao;
        this.api = api;
        this.prefs = prefs;
    }

    private static volatile AgentRepository INSTANCE;
    private static final ExecutorService IO_EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Handler MAIN_HANDLER = new Handler(Looper.getMainLooper());

    /** Lazy singleton — used by UI activities that don't have DI. */
    public static AgentRepository getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AgentRepository.class) {
                if (INSTANCE == null) {
                    Context app = context.getApplicationContext();
                    DarbDao dao = AppDatabase.getInstance(app).darbDao();
                    DarbApi api = RetrofitClient.getInstance().getDarbApi();
                    PrefsManager prefs = PrefsManager.getInstance(app);
                    INSTANCE = new AgentRepository(dao, api, prefs);
                }
            }
        }
        return INSTANCE;
    }

    // ── Selfie-gated shift transitions ────────────────────────────────────────

    public interface SelfieUploadCallback {
        void onSuccess(String shiftId);
        void onError(String message);
    }

    public interface StatsCallback {
        void onStats(String statsText);
        void onError(String message);
    }

    /**
     * Upload a selfie to clock in or out. For CLOCK_IN, a null shiftId is
     * valid — the backend will locate or create today's shift. Runs on a
     * background thread; the callback fires on the main thread.
     */
    public void uploadSelfie(byte[] jpegBytes,
                             String action,
                             String shiftId,
                             double latitude,
                             double longitude,
                             SelfieUploadCallback callback) {
        IO_EXECUTOR.execute(() -> {
            File tempFile = null;
            try {
                // Write bytes to a temp JPEG so Retrofit can stream it.
                tempFile = File.createTempFile("selfie_", ".jpg");
                try (FileOutputStream out = new FileOutputStream(tempFile)) {
                    out.write(jpegBytes);
                }

                RequestBody imageBody = RequestBody.create(tempFile, MediaType.parse("image/jpeg"));
                MultipartBody.Part selfiePart = MultipartBody.Part.createFormData(
                        "selfie", tempFile.getName(), imageBody);

                String deviceId = prefs.getDeviceId();
                if (deviceId == null) {
                    postError(callback, "Device not enrolled");
                    return;
                }

                RequestBody deviceIdBody = textPart(deviceId);
                RequestBody actionBody   = textPart(action != null ? action : "");
                RequestBody shiftIdBody  = textPart(shiftId != null ? shiftId : "");
                RequestBody latBody      = textPart(String.valueOf(latitude));
                RequestBody lngBody      = textPart(String.valueOf(longitude));

                Response<SelfieResponse> response = api.uploadSelfie(
                        selfiePart, deviceIdBody, actionBody, shiftIdBody, latBody, lngBody
                ).execute();

                if (response.isSuccessful() && response.body() != null) {
                    SelfieResponse body = response.body();
                    final String resolvedShiftId = body.shiftId;
                    MAIN_HANDLER.post(() -> callback.onSuccess(resolvedShiftId));
                } else {
                    postError(callback, "HTTP " + response.code());
                }
            } catch (Exception e) {
                Log.e(TAG, "uploadSelfie failed", e);
                postError(callback, e.getMessage() != null ? e.getMessage() : "Upload error");
            } finally {
                if (tempFile != null) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
            }
        });
    }

    /**
     * Minimal today-stats loader for the MainActivity header. For now this
     * just returns a summary built from local prefs — a proper implementation
     * would query the backend.
     */
    public void getTodayStats(StatsCallback callback) {
        IO_EXECUTOR.execute(() -> {
            try {
                String text = "Orders today: —\nOn shift: " + (prefs.isOnShift() ? "Yes" : "No");
                MAIN_HANDLER.post(() -> callback.onStats(text));
            } catch (Exception e) {
                MAIN_HANDLER.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    private static RequestBody textPart(String value) {
        return RequestBody.create(value, MediaType.parse("text/plain"));
    }

    private static void postError(SelfieUploadCallback cb, String msg) {
        MAIN_HANDLER.post(() -> cb.onError(msg));
    }

    // ── Registration ──────────────────────────────────────────────────────────

    /**
     * Register this device with the backend using an enrollment code.
     *
     * @param enrollmentCode One-time code shown in the dashboard
     * @param imei           Device IMEI (or generated UUID)
     * @param model          Device model string
     * @param osVersion      Android OS version string
     * @return {@link RegisterResponse} or {@code null} on failure
     */
    public RegisterResponse register(String enrollmentCode, String imei,
                                     String model, String osVersion) {
        Map<String, String> body = new HashMap<>();
        body.put("enrollmentCode", enrollmentCode);
        body.put("imei", imei);
        body.put("model", model);
        body.put("osVersion", osVersion);

        try {
            Response<RegisterResponse> response = api.register(body).execute();
            if (response.isSuccessful() && response.body() != null) {
                RegisterResponse result = response.body();
                // Persist key fields so the rest of the app can access them
                prefs.setDeviceId(result.deviceId);
                if (result.driver != null) {
                    prefs.setDriverId(result.driver.id);
                    prefs.setDriverName(result.driver.name);
                    prefs.setPlatform(result.driver.platform);
                }
                if (result.company != null) {
                    prefs.setTenantId(result.company.id);
                }
                prefs.setEnrolled(true);
                return result;
            } else {
                Log.e(TAG, "register failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "register exception", e);
        }
        return null;
    }

    // ── Heartbeat ─────────────────────────────────────────────────────────────

    /**
     * Send a heartbeat ping to the backend with basic device telemetry.
     *
     * @param batteryLevel Current battery level (0-100)
     * @param extraFields  Any additional key/value pairs to include
     * @return {@link BasicResponse} or {@code null} on failure
     */
    public BasicResponse heartbeat(int batteryLevel, Map<String, Object> extraFields) {
        Map<String, Object> body = new HashMap<>();
        body.put("deviceId", prefs.getDeviceId());
        body.put("batteryLevel", batteryLevel);
        if (extraFields != null) {
            body.putAll(extraFields);
        }

        try {
            Response<BasicResponse> response = api.heartbeat(body).execute();
            if (response.isSuccessful()) {
                return response.body();
            } else {
                Log.e(TAG, "heartbeat failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "heartbeat exception", e);
        }
        return null;
    }

    // ── Sync: Notifications (captured orders) ─────────────────────────────────

    /**
     * Query unsynced notifications from Room, post them to the API, then mark
     * them as synced on success.
     *
     * @return Number of records synced, or -1 on failure
     */
    public int syncNotifications() {
        List<CapturedNotification> pending = dao.getUnsyncedNotifications();
        if (pending.isEmpty()) return 0;

        // Convert entities to plain maps for the request body
        List<Map<String, Object>> orders = new ArrayList<>();
        for (CapturedNotification n : pending) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", n.id);
            item.put("packageName", n.packageName);
            item.put("title", n.title);
            item.put("text", n.text);
            item.put("capturedAt", n.capturedAt);
            orders.add(item);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("deviceId", prefs.getDeviceId());
        body.put("driverId", prefs.getDriverId());
        body.put("orders", orders);

        try {
            Response<SyncResponse> response = api.syncCapturedOrders(body).execute();
            if (response.isSuccessful() && response.body() != null) {
                List<Long> ids = extractIds(pending);
                dao.markNotificationsSynced(ids);
                return response.body().synced;
            } else {
                Log.e(TAG, "syncNotifications failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "syncNotifications exception", e);
        }
        return -1;
    }

    // ── Sync: Locations ───────────────────────────────────────────────────────

    /**
     * Query unsynced location entries from Room, post them to the API, then
     * mark them as synced on success.
     *
     * @return Number of records synced, or -1 on failure
     */
    public int syncLocations() {
        List<LocationEntry> pending = dao.getUnsyncedLocations();
        if (pending.isEmpty()) return 0;

        List<Map<String, Object>> locations = new ArrayList<>();
        for (LocationEntry loc : pending) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", loc.id);
            item.put("latitude", loc.latitude);
            item.put("longitude", loc.longitude);
            item.put("accuracy", loc.accuracy);
            item.put("speed", loc.speed);
            item.put("capturedAt", loc.capturedAt);
            locations.add(item);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("deviceId", prefs.getDeviceId());
        body.put("driverId", prefs.getDriverId());
        body.put("locations", locations);

        try {
            Response<SyncResponse> response = api.syncLocations(body).execute();
            if (response.isSuccessful() && response.body() != null) {
                List<Long> ids = extractLocationIds(pending);
                dao.markLocationsSynced(ids);
                return response.body().synced;
            } else {
                Log.e(TAG, "syncLocations failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "syncLocations exception", e);
        }
        return -1;
    }

    // ── Sync: App Usage ───────────────────────────────────────────────────────

    /**
     * Query unsynced app-usage entries from Room, post them to the API, then
     * mark them as synced on success.
     *
     * @return Number of records synced, or -1 on failure
     */
    public int syncAppUsage() {
        List<AppUsageEntry> pending = dao.getUnsyncedAppUsage();
        if (pending.isEmpty()) return 0;

        List<Map<String, Object>> logs = new ArrayList<>();
        for (AppUsageEntry entry : pending) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", entry.id);
            item.put("appPackage", entry.appPackage);
            item.put("eventType", entry.eventType);
            item.put("durationSeconds", entry.durationSeconds);
            item.put("capturedAt", entry.capturedAt);
            logs.add(item);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("deviceId", prefs.getDeviceId());
        body.put("driverId", prefs.getDriverId());
        body.put("logs", logs);

        try {
            Response<SyncResponse> response = api.syncAppUsage(body).execute();
            if (response.isSuccessful() && response.body() != null) {
                List<Long> ids = extractAppUsageIds(pending);
                dao.markAppUsageSynced(ids);
                return response.body().synced;
            } else {
                Log.e(TAG, "syncAppUsage failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "syncAppUsage exception", e);
        }
        return -1;
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    /**
     * Fetch the list of pending commands for this device from the backend.
     *
     * @return List of {@link CommandResponse}, or an empty list on failure
     */
    public List<CommandResponse> fetchCommands() {
        String deviceId = prefs.getDeviceId();
        if (deviceId == null) return new ArrayList<>();

        try {
            Response<List<CommandResponse>> response = api.getCommands(deviceId).execute();
            if (response.isSuccessful() && response.body() != null) {
                return response.body();
            } else {
                Log.e(TAG, "fetchCommands failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "fetchCommands exception", e);
        }
        return new ArrayList<>();
    }

    /**
     * Acknowledge a command so the backend knows it was received/executed.
     *
     * @param commandId The command's ID
     * @return {@link BasicResponse} or {@code null} on failure
     */
    public BasicResponse ackCommand(String commandId) {
        try {
            Response<BasicResponse> response = api.ackCommand(commandId).execute();
            if (response.isSuccessful()) {
                return response.body();
            } else {
                Log.e(TAG, "ackCommand failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "ackCommand exception", e);
        }
        return null;
    }

    // ── Clock In / Clock Out ──────────────────────────────────────────────────

    /**
     * Clock in to a shift by uploading a selfie and GPS coordinates.
     *
     * @param shiftId   The shift ID
     * @param selfieFile File pointing to the selfie image on disk
     * @param latitude  GPS latitude at clock-in
     * @param longitude GPS longitude at clock-in
     * @return {@link BasicResponse} or {@code null} on failure
     */
    public BasicResponse clockIn(String shiftId, File selfieFile,
                                 double latitude, double longitude) {
        try {
            RequestBody imageBody = RequestBody.create(
                    selfieFile,
                    MediaType.parse("image/jpeg")
            );
            MultipartBody.Part selfiePart = MultipartBody.Part.createFormData(
                    "selfie", selfieFile.getName(), imageBody
            );
            RequestBody latBody = RequestBody.create(
                    String.valueOf(latitude),
                    MediaType.parse("text/plain")
            );
            RequestBody lngBody = RequestBody.create(
                    String.valueOf(longitude),
                    MediaType.parse("text/plain")
            );

            Response<BasicResponse> response =
                    api.clockIn(shiftId, selfiePart, latBody, lngBody).execute();

            if (response.isSuccessful()) {
                prefs.setOnShift(true);
                prefs.setCurrentShiftId(shiftId);
                return response.body();
            } else {
                Log.e(TAG, "clockIn failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "clockIn exception", e);
        }
        return null;
    }

    /**
     * Clock out of a shift by uploading a selfie.
     *
     * @param shiftId   The shift ID
     * @param selfieFile File pointing to the selfie image on disk
     * @return {@link BasicResponse} or {@code null} on failure
     */
    public BasicResponse clockOut(String shiftId, File selfieFile) {
        try {
            RequestBody imageBody = RequestBody.create(
                    selfieFile,
                    MediaType.parse("image/jpeg")
            );
            MultipartBody.Part selfiePart = MultipartBody.Part.createFormData(
                    "selfie", selfieFile.getName(), imageBody
            );

            Response<BasicResponse> response =
                    api.clockOut(shiftId, selfiePart).execute();

            if (response.isSuccessful()) {
                prefs.setOnShift(false);
                prefs.setCurrentShiftId(null);
                return response.body();
            } else {
                Log.e(TAG, "clockOut failed: " + response.code());
            }
        } catch (Exception e) {
            Log.e(TAG, "clockOut exception", e);
        }
        return null;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<Long> extractIds(List<CapturedNotification> list) {
        List<Long> ids = new ArrayList<>(list.size());
        for (CapturedNotification n : list) ids.add(n.id);
        return ids;
    }

    private List<Long> extractLocationIds(List<LocationEntry> list) {
        List<Long> ids = new ArrayList<>(list.size());
        for (LocationEntry loc : list) ids.add(loc.id);
        return ids;
    }

    private List<Long> extractAppUsageIds(List<AppUsageEntry> list) {
        List<Long> ids = new ArrayList<>(list.size());
        for (AppUsageEntry entry : list) ids.add(entry.id);
        return ids;
    }
}
