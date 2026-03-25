package com.pair.darb.agent.ui.enrollment;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputFilter;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.pair.darb.agent.data.local.prefs.PrefsManager;
import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.ui.main.MainActivity;

public class EnrollmentActivity extends AppCompatActivity {

    private PrefsManager prefsManager;
    private AgentRepository repository;

    private EditText etCode;
    private Button btnEnroll;
    private ProgressBar progressBar;
    private TextView tvStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefsManager = PrefsManager.getInstance(this);
        repository   = AgentRepository.getInstance(this);

        // If already enrolled, go straight to main
        if (prefsManager.isEnrolled()) {
            navigateToMain();
            return;
        }

        setContentView(buildLayout());
    }

    // ---------------------------------------------------------------------------
    // Programmatic layout
    // ---------------------------------------------------------------------------
    private View buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#0A0A0A"));
        root.setPadding(dp(32), dp(48), dp(32), dp(48));

        // Logo / brand
        TextView tvLogo = new TextView(this);
        tvLogo.setText("DARB");
        tvLogo.setTextSize(48f);
        tvLogo.setTypeface(null, Typeface.BOLD);
        tvLogo.setTextColor(Color.parseColor("#F5A623"));
        tvLogo.setGravity(Gravity.CENTER);
        root.addView(tvLogo, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(72)));

        // Subtitle
        TextView tvSubtitle = new TextView(this);
        tvSubtitle.setText("Fleet Agent Enrollment");
        tvSubtitle.setTextSize(16f);
        tvSubtitle.setTextColor(Color.parseColor("#AAAAAA"));
        tvSubtitle.setGravity(Gravity.CENTER);
        root.addView(tvSubtitle, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(32)));

        // Spacer
        root.addView(spacer(dp(24)));

        // Code label
        TextView tvLabel = new TextView(this);
        tvLabel.setText("Enter your 6-digit enrollment code");
        tvLabel.setTextSize(14f);
        tvLabel.setTextColor(Color.parseColor("#CCCCCC"));
        tvLabel.setGravity(Gravity.CENTER);
        root.addView(tvLabel, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(24)));

        root.addView(spacer(dp(12)));

        // Code input
        etCode = new EditText(this);
        etCode.setHint("000000");
        etCode.setHintTextColor(Color.GRAY);
        etCode.setTextColor(Color.WHITE);
        etCode.setTextSize(28f);
        etCode.setGravity(Gravity.CENTER);
        etCode.setInputType(InputType.TYPE_CLASS_NUMBER);
        etCode.setFilters(new InputFilter[]{ new InputFilter.LengthFilter(6) });
        etCode.setBackgroundColor(Color.parseColor("#1E1E1E"));
        etCode.setPadding(dp(16), dp(16), dp(16), dp(16));
        root.addView(etCode, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));

        root.addView(spacer(dp(24)));

        // Status text (hidden until needed)
        tvStatus = new TextView(this);
        tvStatus.setTextColor(Color.parseColor("#FF5555"));
        tvStatus.setGravity(Gravity.CENTER);
        tvStatus.setVisibility(View.GONE);
        root.addView(tvStatus, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(24)));

        root.addView(spacer(dp(8)));

        // Progress bar (hidden during idle)
        progressBar = new ProgressBar(this);
        progressBar.setVisibility(View.GONE);
        root.addView(progressBar, layoutParams(dp(48), dp(48)));
        ((LinearLayout.LayoutParams) progressBar.getLayoutParams()).gravity = Gravity.CENTER_HORIZONTAL;

        root.addView(spacer(dp(16)));

        // Enroll button
        btnEnroll = new Button(this);
        btnEnroll.setText("Enroll Device");
        btnEnroll.setTextColor(Color.WHITE);
        btnEnroll.setTypeface(null, Typeface.BOLD);
        btnEnroll.setBackgroundColor(Color.parseColor("#F5A623"));
        btnEnroll.setOnClickListener(v -> attemptEnrollment());
        root.addView(btnEnroll, layoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        return root;
    }

    // ---------------------------------------------------------------------------
    // Enrollment logic
    // ---------------------------------------------------------------------------
    private void attemptEnrollment() {
        String code = etCode.getText().toString().trim();
        if (code.length() != 6) {
            showError("Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);

        repository.register(code, new AgentRepository.RegisterCallback() {
            @Override
            public void onSuccess(String deviceId, String driverName, String platform) {
                runOnUiThread(() -> {
                    prefsManager.saveEnrollmentInfo(deviceId, driverName, platform, code);
                    setLoading(false);
                    Toast.makeText(EnrollmentActivity.this,
                            "Enrolled successfully!", Toast.LENGTH_SHORT).show();
                    navigateToMain();
                });
            }

            @Override
            public void onError(String message) {
                runOnUiThread(() -> {
                    setLoading(false);
                    showError(message);
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnEnroll.setEnabled(!loading);
        etCode.setEnabled(!loading);
        if (loading) tvStatus.setVisibility(View.GONE);
    }

    private void showError(String msg) {
        tvStatus.setText(msg);
        tvStatus.setVisibility(View.VISIBLE);
    }

    private void navigateToMain() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }

    // ---------------------------------------------------------------------------
    // Layout helpers
    // ---------------------------------------------------------------------------
    private int dp(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private LinearLayout.LayoutParams layoutParams(int width, int height) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(width, height);
        lp.setMargins(0, dp(4), 0, dp(4));
        return lp;
    }

    private View spacer(int heightPx) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, heightPx));
        return v;
    }
}
