package com.pair.darb.agent.ui.selfie;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.location.Location;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.common.util.concurrent.ListenableFuture;
import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.util.Constants;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SelfieActivity extends AppCompatActivity {

    private static final String TAG = "SelfieActivity";
    private static final int PERM_REQUEST_CODE = 300;

    private AgentRepository repository;
    private FusedLocationProviderClient fusedLocationClient;
    private ExecutorService cameraExecutor;

    private PreviewView previewView;
    private ImageCapture imageCapture;
    private ProgressBar progressBar;
    private Button btnCapture;
    private TextView tvHint;

    private String action;
    private String shiftId;

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        repository          = AgentRepository.getInstance(this);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        cameraExecutor      = Executors.newSingleThreadExecutor();

        action  = getIntent().getStringExtra(Constants.EXTRA_ACTION);
        shiftId = getIntent().getStringExtra(Constants.EXTRA_SHIFT_ID);

        setContentView(buildLayout());

        if (hasCameraPermission()) {
            startCamera();
        } else {
            ActivityCompat.requestPermissions(this,
                    new String[]{ Manifest.permission.CAMERA,
                                  Manifest.permission.ACCESS_FINE_LOCATION },
                    PERM_REQUEST_CODE);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cameraExecutor.shutdown();
    }

    // ---------------------------------------------------------------------------
    // Programmatic layout
    // ---------------------------------------------------------------------------
    private View buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.BLACK);

        // Title bar
        TextView tvTitle = new TextView(this);
        String titleText = Constants.ACTION_CLOCK_IN.equals(action) ? "Clock In — Selfie" : "Clock Out — Selfie";
        tvTitle.setText(titleText);
        tvTitle.setTextSize(18f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setGravity(Gravity.CENTER);
        tvTitle.setBackgroundColor(Color.parseColor("#111111"));
        tvTitle.setPadding(0, dp(12), 0, dp(12));
        root.addView(tvTitle, matchParams(dp(52)));

        // Camera preview container
        FrameLayout cameraContainer = new FrameLayout(this);
        cameraContainer.setBackgroundColor(Color.BLACK);

        previewView = new PreviewView(this);
        cameraContainer.addView(previewView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        // Face oval hint overlay
        tvHint = new TextView(this);
        tvHint.setText("( Position your face in the center )");
        tvHint.setTextColor(Color.parseColor("#CCFFFFFF"));
        tvHint.setTextSize(13f);
        tvHint.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams hintParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT);
        hintParams.gravity = Gravity.BOTTOM;
        hintParams.bottomMargin = dp(16);
        cameraContainer.addView(tvHint, hintParams);

        LinearLayout.LayoutParams cameraLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f);
        root.addView(cameraContainer, cameraLp);

        // Bottom bar
        LinearLayout bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.VERTICAL);
        bottomBar.setGravity(Gravity.CENTER);
        bottomBar.setBackgroundColor(Color.parseColor("#111111"));
        bottomBar.setPadding(dp(24), dp(16), dp(24), dp(24));

        progressBar = new ProgressBar(this);
        progressBar.setVisibility(View.GONE);
        bottomBar.addView(progressBar, centerParams(dp(40)));

        btnCapture = new Button(this);
        btnCapture.setText("Capture & Submit");
        btnCapture.setTextColor(Color.WHITE);
        btnCapture.setTypeface(null, Typeface.BOLD);
        btnCapture.setBackgroundColor(Color.parseColor("#F5A623"));
        btnCapture.setOnClickListener(v -> captureAndUpload());
        bottomBar.addView(btnCapture, matchParams(dp(52)));

        root.addView(bottomBar, matchParams(LinearLayout.LayoutParams.WRAP_CONTENT));

        return root;
    }

    // ---------------------------------------------------------------------------
    // Camera
    // ---------------------------------------------------------------------------
    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future =
                ProcessCameraProvider.getInstance(this);

        future.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = future.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                imageCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build();

                CameraSelector cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA;

                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture);

            } catch (Exception e) {
                Log.e(TAG, "Camera bind failed", e);
                Toast.makeText(this, "Camera error: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    // ---------------------------------------------------------------------------
    // Capture + upload
    // ---------------------------------------------------------------------------
    private void captureAndUpload() {
        if (imageCapture == null) {
            Toast.makeText(this, "Camera not ready", Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);

        imageCapture.takePicture(cameraExecutor, new ImageCapture.OnImageCapturedCallback() {
            @Override
            public void onCaptureSuccess(@NonNull ImageProxy image) {
                byte[] jpegBytes = imageProxyToJpeg(image);
                image.close();
                fetchLocationAndUpload(jpegBytes);
            }

            @Override
            public void onError(@NonNull ImageCaptureException exception) {
                Log.e(TAG, "Capture error", exception);
                runOnUiThread(() -> {
                    setLoading(false);
                    Toast.makeText(SelfieActivity.this,
                            "Capture failed: " + exception.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @SuppressLint("MissingPermission")
    private void fetchLocationAndUpload(byte[] jpegBytes) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            uploadSelfie(jpegBytes, 0.0, 0.0);
            return;
        }

        fusedLocationClient.getLastLocation().addOnSuccessListener(location -> {
            double lat = 0.0, lng = 0.0;
            if (location != null) {
                lat = location.getLatitude();
                lng = location.getLongitude();
            }
            uploadSelfie(jpegBytes, lat, lng);
        }).addOnFailureListener(e -> uploadSelfie(jpegBytes, 0.0, 0.0));
    }

    private void uploadSelfie(byte[] jpegBytes, double lat, double lng) {
        repository.uploadSelfie(jpegBytes, action, shiftId, lat, lng,
                new AgentRepository.SelfieUploadCallback() {
                    @Override
                    public void onSuccess(String returnedShiftId) {
                        runOnUiThread(() -> {
                            setLoading(false);
                            Intent result = new Intent();
                            result.putExtra(Constants.EXTRA_ACTION, action);
                            result.putExtra(Constants.EXTRA_SHIFT_ID, returnedShiftId);
                            setResult(RESULT_OK, result);
                            finish();
                        });
                    }

                    @Override
                    public void onError(String message) {
                        runOnUiThread(() -> {
                            setLoading(false);
                            Toast.makeText(SelfieActivity.this,
                                    "Upload failed: " + message, Toast.LENGTH_LONG).show();
                        });
                    }
                });
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    private byte[] imageProxyToJpeg(ImageProxy image) {
        ImageProxy.PlaneProxy[] planes = image.getPlanes();
        ByteBuffer buffer = planes[0].getBuffer();
        byte[] bytes = new byte[buffer.remaining()];
        buffer.get(bytes);

        // The bytes from ImageCapture are already JPEG when using JPEG format
        // but we convert via Bitmap to ensure correct rotation/format
        Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bmp == null) return bytes;

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, 85, out);
        return out.toByteArray();
    }

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERM_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Camera permission required", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }

    private void setLoading(boolean loading) {
        runOnUiThread(() -> {
            progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
            btnCapture.setEnabled(!loading);
        });
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams matchParams(int height) {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, height);
    }

    private LinearLayout.LayoutParams centerParams(int size) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(size, size);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        lp.bottomMargin = dp(8);
        return lp;
    }
}
