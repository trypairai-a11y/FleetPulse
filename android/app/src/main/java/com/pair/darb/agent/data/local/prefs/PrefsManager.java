package com.pair.darb.agent.data.local.prefs;

import android.content.Context;
import android.content.SharedPreferences;

public class PrefsManager {

    private static final String PREF_FILE = "darb_agent_prefs";

    private static final String KEY_DEVICE_ID       = "device_id";
    private static final String KEY_DRIVER_ID       = "driver_id";
    private static final String KEY_DRIVER_NAME     = "driver_name";
    private static final String KEY_PLATFORM        = "platform";
    private static final String KEY_TENANT_ID       = "tenant_id";
    private static final String KEY_API_TOKEN       = "api_token";
    private static final String KEY_IS_ENROLLED     = "is_enrolled";
    private static final String KEY_IS_ON_SHIFT     = "is_on_shift";
    private static final String KEY_CURRENT_SHIFT_ID = "current_shift_id";

    private static volatile PrefsManager instance;

    private final SharedPreferences prefs;

    private PrefsManager(Context context) {
        prefs = context.getApplicationContext()
                .getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE);
    }

    public static PrefsManager getInstance(Context context) {
        if (instance == null) {
            synchronized (PrefsManager.class) {
                if (instance == null) {
                    instance = new PrefsManager(context);
                }
            }
        }
        return instance;
    }

    // ── deviceId ──────────────────────────────────────────────────────────────

    public String getDeviceId() {
        return prefs.getString(KEY_DEVICE_ID, null);
    }

    public void setDeviceId(String deviceId) {
        prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply();
    }

    // ── driverId ──────────────────────────────────────────────────────────────

    public String getDriverId() {
        return prefs.getString(KEY_DRIVER_ID, null);
    }

    public void setDriverId(String driverId) {
        prefs.edit().putString(KEY_DRIVER_ID, driverId).apply();
    }

    // ── driverName ────────────────────────────────────────────────────────────

    public String getDriverName() {
        return prefs.getString(KEY_DRIVER_NAME, null);
    }

    public void setDriverName(String driverName) {
        prefs.edit().putString(KEY_DRIVER_NAME, driverName).apply();
    }

    // ── platform ──────────────────────────────────────────────────────────────

    public String getPlatform() {
        return prefs.getString(KEY_PLATFORM, null);
    }

    public void setPlatform(String platform) {
        prefs.edit().putString(KEY_PLATFORM, platform).apply();
    }

    // ── tenantId ──────────────────────────────────────────────────────────────

    public String getTenantId() {
        return prefs.getString(KEY_TENANT_ID, null);
    }

    public void setTenantId(String tenantId) {
        prefs.edit().putString(KEY_TENANT_ID, tenantId).apply();
    }

    // ── apiToken ──────────────────────────────────────────────────────────────

    public String getApiToken() {
        return prefs.getString(KEY_API_TOKEN, null);
    }

    public void setApiToken(String apiToken) {
        prefs.edit().putString(KEY_API_TOKEN, apiToken).apply();
    }

    // ── isEnrolled ────────────────────────────────────────────────────────────

    public boolean isEnrolled() {
        return prefs.getBoolean(KEY_IS_ENROLLED, false);
    }

    public void setEnrolled(boolean enrolled) {
        prefs.edit().putBoolean(KEY_IS_ENROLLED, enrolled).apply();
    }

    // ── isOnShift ─────────────────────────────────────────────────────────────

    public boolean isOnShift() {
        return prefs.getBoolean(KEY_IS_ON_SHIFT, false);
    }

    public void setOnShift(boolean onShift) {
        prefs.edit().putBoolean(KEY_IS_ON_SHIFT, onShift).apply();
    }

    // ── currentShiftId ────────────────────────────────────────────────────────

    public String getCurrentShiftId() {
        return prefs.getString(KEY_CURRENT_SHIFT_ID, null);
    }

    public void setCurrentShiftId(String shiftId) {
        prefs.edit().putString(KEY_CURRENT_SHIFT_ID, shiftId).apply();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Clear all stored preferences (e.g. on logout / un-enroll). */
    public void clearAll() {
        prefs.edit().clear().apply();
    }
}
