package com.pair.darb.agent.ui.main;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.service.LocationTrackingService;
import com.pair.darb.agent.ui.enrollment.EnrollmentActivity;
import com.pair.darb.agent.ui.selfie.SelfieActivity;
import com.pair.darb.agent.util.Constants;

public class MainActivity extends AppCompatActivity {

    private PrefsManager prefsManager;
    private AgentRepository repository;

    private TextView tvDriverName;
    private TextView tvPlatform;
    private TextView tvShiftStatus;
    private TextView tvTodayStats;
    private Button btnStartShift;
    private Button btnEndShift;

    private boolean isOnShift = false;
    private String currentShiftId = null;

    private final ActivityResultLauncher<Intent> selfieLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
                    this::handleSelfieResult);

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefsManager = PrefsManager.getInstance(this);
        repository   = AgentRepository.getInstance(this);

        if (!prefsManager.isEnrolled()) {
            redirectToEnrollment();
            return;
        }

        setContentView(buildLayout());
        refreshUI();
        loadTodayStats();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (prefsManager.isEnrolled()) {
            refreshUI();
        }
    }

    // ---------------------------------------------------------------------------
    // Programmatic layout
    // ---------------------------------------------------------------------------
    private View buildLayout() {
        // Root scroll
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.parseColor("#0A0A0A"));
        scroll.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(24), dp(20), dp(24));

        // ---- Top bar ----
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvTitle = new TextView(this);
        tvTitle.setText("DARB Agent");
        tvTitle.setTextSize(22f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.parseColor("#F5A623"));
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(48), 1f);
        topBar.addView(tvTitle, titleParams);

        Button btnSettings = new Button(this);
        btnSettings.setText("⚙");
        btnSettings.setTextSize(20f);
        btnSettings.setTextColor(Color.WHITE);
        btnSettings.setBackgroundColor(Color.TRANSPARENT);
        btnSettings.setOnClickListener(v -> showDeviceInfoDialog());
        topBar.addView(btnSettings, new LinearLayout.LayoutParams(dp(52), dp(52)));

        root.addView(topBar, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        root.addView(divider());

        // ---- Driver info card ----
        root.addView(sectionLabel("Driver"));

        tvDriverName = new TextView(this);
        tvDriverName.setTextSize(20f);
        tvDriverName.setTypeface(null, Typeface.BOLD);
        tvDriverName.setTextColor(Color.WHITE);
        root.addView(tvDriverName, wrapParams());

        tvPlatform = new TextView(this);
        tvPlatform.setTextSize(14f);
        tvPlatform.setTextColor(Color.parseColor("#AAAAAA"));
        root.addView(tvPlatform, wrapParams());

        root.addView(spacer(dp(16)));

        // ---- Shift status card ----
        root.addView(sectionLabel("Shift Status"));

        tvShiftStatus = new TextView(this);
        tvShiftStatus.setTextSize(18f);
        tvShiftStatus.setTypeface(null, Typeface.BOLD);
        root.addView(tvShiftStatus, wrapParams());

        root.addView(spacer(dp(8)));

        // ---- Today's stats ----
        root.addView(sectionLabel("Today"));

        tvTodayStats = new TextView(this);
        tvTodayStats.setTextSize(14f);
        tvTodayStats.setTextColor(Color.parseColor("#CCCCCC"));
        root.addView(tvTodayStats, wrapParams());

        root.addView(spacer(dp(32)));

        // ---- Action buttons ----
        btnStartShift = new Button(this);
        btnStartShift.setText("Start Shift");
        btnStartShift.setTextColor(Color.WHITE);
        btnStartShift.setTypeface(null, Typeface.BOLD);
        btnStartShift.setTextSize(16f);
        btnStartShift.setBackgroundColor(Color.parseColor("#27AE60"));
        btnStartShift.setOnClickListener(v -> launchSelfie(Constants.ACTION_CLOCK_IN, null));
        root.addView(btnStartShift, matchParams(dp(52)));

        root.addView(spacer(dp(12)));

        btnEndShift = new Button(this);
        btnEndShift.setText("End Shift");
        btnEndShift.setTextColor(Color.WHITE);
        btnEndShift.setTypeface(null, Typeface.BOLD);
        btnEndShift.setTextSize(16f);
        btnEndShift.setBackgroundColor(Color.parseColor("#E74C3C"));
        btnEndShift.setOnClickListener(v -> launchSelfie(Constants.ACTION_CLOCK_OUT, currentShiftId));
        root.addView(btnEndShift, matchParams(dp(52)));

        scroll.addView(root);
        return scroll;
    }

    // ---------------------------------------------------------------------------
    // UI refresh
    // ---------------------------------------------------------------------------
    private void refreshUI() {
        isOnShift      = prefsManager.isOnShift();
        currentShiftId = prefsManager.getCurrentShiftId();

        tvDriverName.setText(prefsManager.getDriverName());
        tvPlatform.setText("Platform: " + prefsManager.getPlatform());

        if (isOnShift) {
            tvShiftStatus.setText("ON SHIFT");
            tvShiftStatus.setTextColor(Color.parseColor("#27AE60"));
        } else {
            tvShiftStatus.setText("OFF SHIFT");
            tvShiftStatus.setTextColor(Color.parseColor("#E74C3C"));
        }

        btnStartShift.setEnabled(!isOnShift);
        btnEndShift.setEnabled(isOnShift);
        btnStartShift.setAlpha(isOnShift ? 0.4f : 1f);
        btnEndShift.setAlpha(isOnShift ? 1f : 0.4f);
    }

    private void loadTodayStats() {
        repository.getTodayStats(new AgentRepository.StatsCallback() {
            @Override
            public void onStats(String statsText) {
                runOnUiThread(() -> tvTodayStats.setText(statsText));
            }

            @Override
            public void onError(String message) {
                runOnUiThread(() -> tvTodayStats.setText("Stats unavailable"));
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Navigation
    // ---------------------------------------------------------------------------
    private void launchSelfie(String action, String shiftId) {
        Intent intent = new Intent(this, SelfieActivity.class);
        intent.putExtra(Constants.EXTRA_ACTION, action);
        if (shiftId != null) {
            intent.putExtra(Constants.EXTRA_SHIFT_ID, shiftId);
        }
        selfieLauncher.launch(intent);
    }

    private void handleSelfieResult(ActivityResult result) {
        if (result.getResultCode() == RESULT_OK && result.getData() != null) {
            String newShiftId = result.getData().getStringExtra(Constants.EXTRA_SHIFT_ID);
            String action     = result.getData().getStringExtra(Constants.EXTRA_ACTION);

            if (Constants.ACTION_CLOCK_IN.equals(action)) {
                prefsManager.setOnShift(true, newShiftId);
                startLocationTracking();
            } else if (Constants.ACTION_CLOCK_OUT.equals(action)) {
                prefsManager.setOnShift(false, null);
                stopLocationTracking();
            }
            refreshUI();
        }
    }

    private void redirectToEnrollment() {
        startActivity(new Intent(this, EnrollmentActivity.class));
        finish();
    }

    // ---------------------------------------------------------------------------
    // Location service
    // ---------------------------------------------------------------------------
    private void startLocationTracking() {
        Intent intent = new Intent(this, LocationTrackingService.class);
        intent.setAction(LocationTrackingService.ACTION_START_TRACKING);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }

    private void stopLocationTracking() {
        Intent intent = new Intent(this, LocationTrackingService.class);
        intent.setAction(LocationTrackingService.ACTION_STOP_TRACKING);
        startService(intent);
    }

    // ---------------------------------------------------------------------------
    // Settings dialog
    // ---------------------------------------------------------------------------
    private void showDeviceInfoDialog() {
        String info = "Device ID:  " + prefsManager.getDeviceId()
                + "\nDriver:     " + prefsManager.getDriverName()
                + "\nPlatform:   " + prefsManager.getPlatform()
                + "\nEnrolled:   " + prefsManager.isEnrolled()
                + "\nOn Shift:   " + prefsManager.isOnShift()
                + "\nShift ID:   " + (prefsManager.getCurrentShiftId() != null
                                        ? prefsManager.getCurrentShiftId() : "-");

        new AlertDialog.Builder(this)
                .setTitle("Device Info")
                .setMessage(info)
                .setPositiveButton("OK", null)
                .setNeutralButton("Unenroll", (dialog, which) -> confirmUnenroll())
                .show();
    }

    private void confirmUnenroll() {
        new AlertDialog.Builder(this)
                .setTitle("Unenroll Device")
                .setMessage("This will remove all enrollment data. Continue?")
                .setPositiveButton("Unenroll", (dialog, which) -> {
                    prefsManager.clearAll();
                    redirectToEnrollment();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // ---------------------------------------------------------------------------
    // Layout helpers
    // ---------------------------------------------------------------------------
    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams wrapParams() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams matchParams(int height) {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, height);
    }

    private TextView sectionLabel(String text) {
        TextView tv = new TextView(this);
        tv.setText(text.toUpperCase());
        tv.setTextSize(11f);
        tv.setTextColor(Color.parseColor("#888888"));
        tv.setTypeface(null, Typeface.BOLD);
        tv.setPadding(0, dp(8), 0, dp(4));
        return tv;
    }

    private View divider() {
        View v = new View(this);
        v.setBackgroundColor(Color.parseColor("#222222"));
        v.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)));
        return v;
    }

    private View spacer(int heightPx) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, heightPx));
        return v;
    }
}
