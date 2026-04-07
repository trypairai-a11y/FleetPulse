package com.pair.darb.agent.receiver;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

/**
 * Device Admin Receiver for Darb Agent.
 *
 * Enables the following DevicePolicyManager capabilities when the user
 * grants device admin privileges:
 *   - lockNow()      - remote screen lock via {@link com.pair.darb.agent.worker.CommandPollWorker}
 *   - wipeData()     - remote wipe (optional future use)
 *
 * Registration in AndroidManifest:
 *
 *   <receiver android:name=".receiver.DarbDeviceAdmin"
 *             android:permission="android.permission.BIND_DEVICE_ADMIN">
 *       <meta-data
 *           android:name="android.app.device_admin"
 *           android:resource="@xml/device_admin_policies" />
 *       <intent-filter>
 *           <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
 *       </intent-filter>
 *   </receiver>
 *
 * res/xml/device_admin_policies.xml should contain:
 *   <device-admin>
 *       <uses-policies>
 *           <force-lock />
 *           <wipe-data />
 *       </uses-policies>
 *   </device-admin>
 */
public class DarbDeviceAdmin extends DeviceAdminReceiver {

    private static final String TAG = "DarbDeviceAdmin";

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.d(TAG, "Device admin enabled");
        Toast.makeText(context, "Darb: Device Admin enabled", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.d(TAG, "Device admin disabled");
        Toast.makeText(context, "Darb: Device Admin disabled", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Disabling Device Admin will prevent remote lock capabilities.";
    }

    @Override
    public void onPasswordChanged(Context context, Intent intent) {
        Log.d(TAG, "Device password changed");
    }

    @Override
    public void onPasswordFailed(Context context, Intent intent) {
        Log.w(TAG, "Device password attempt failed");
    }

    @Override
    public void onPasswordSucceeded(Context context, Intent intent) {
        Log.d(TAG, "Device password attempt succeeded");
    }
}
