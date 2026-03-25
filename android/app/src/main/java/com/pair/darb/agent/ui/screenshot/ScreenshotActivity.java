package com.pair.darb.agent.ui.screenshot;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.pair.darb.agent.repository.AgentRepository;
import com.pair.darb.agent.util.Constants;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class ScreenshotActivity extends AppCompatActivity {

    private AgentRepository repository;

    private ImageView ivPreview;
    private Spinner spnType;
    private Button btnPickGallery;
    private Button btnPickCamera;
    private Button btnUpload;
    private ProgressBar progressBar;
    private TextView tvStatus;

    private byte[] selectedImageBytes = null;

    private final ActivityResultLauncher<Intent> galleryLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
                    this::handleGalleryResult);

    private final ActivityResultLauncher<Intent> cameraLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
                    this::handleCameraResult);

    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = AgentRepository.getInstance(this);
        setContentView(buildLayout());
    }

    // ---------------------------------------------------------------------------
    // Programmatic layout
    // ---------------------------------------------------------------------------
    private View buildLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0A0A0A"));
        root.setPadding(dp(20), dp(20), dp(20), dp(20));

        // Title
        TextView tvTitle = new TextView(this);
        tvTitle.setText("Upload Screenshot");
        tvTitle.setTextSize(20f);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setTextColor(Color.parseColor("#F5A623"));
        tvTitle.setGravity(Gravity.CENTER);
        root.addView(tvTitle, matchWrap());

        root.addView(spacer(dp(16)));

        // Image preview
        ivPreview = new ImageView(this);
        ivPreview.setBackgroundColor(Color.parseColor("#1A1A1A"));
        ivPreview.setScaleType(ImageView.ScaleType.FIT_CENTER);
        root.addView(ivPreview, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(220)));

        root.addView(spacer(dp(16)));

        // Buttons row: gallery / camera
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);

        btnPickGallery = new Button(this);
        btnPickGallery.setText("Pick from Gallery");
        btnPickGallery.setTextColor(Color.WHITE);
        btnPickGallery.setBackgroundColor(Color.parseColor("#333333"));
        btnPickGallery.setOnClickListener(v -> pickFromGallery());
        LinearLayout.LayoutParams halfLp = new LinearLayout.LayoutParams(0, dp(48), 1f);
        halfLp.setMargins(0, 0, dp(8), 0);
        btnRow.addView(btnPickGallery, halfLp);

        btnPickCamera = new Button(this);
        btnPickCamera.setText("Use Camera");
        btnPickCamera.setTextColor(Color.WHITE);
        btnPickCamera.setBackgroundColor(Color.parseColor("#333333"));
        btnPickCamera.setOnClickListener(v -> pickFromCamera());
        btnRow.addView(btnPickCamera, new LinearLayout.LayoutParams(0, dp(48), 1f));

        root.addView(btnRow, matchWrap());

        root.addView(spacer(dp(16)));

        // Type label
        TextView tvTypeLabel = new TextView(this);
        tvTypeLabel.setText("Screenshot Type");
        tvTypeLabel.setTextSize(13f);
        tvTypeLabel.setTextColor(Color.parseColor("#AAAAAA"));
        root.addView(tvTypeLabel, matchWrap());

        root.addView(spacer(dp(6)));

        // Type spinner
        spnType = new Spinner(this);
        spnType.setBackgroundColor(Color.parseColor("#1E1E1E"));
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item,
                new String[]{
                        Constants.SCREENSHOT_TYPE_ORDER,
                        Constants.SCREENSHOT_TYPE_SHIFT,
                        Constants.SCREENSHOT_TYPE_CASH
                });
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spnType.setAdapter(adapter);
        root.addView(spnType, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48)));

        root.addView(spacer(dp(24)));

        // Status text
        tvStatus = new TextView(this);
        tvStatus.setTextColor(Color.parseColor("#FF5555"));
        tvStatus.setGravity(Gravity.CENTER);
        tvStatus.setVisibility(View.GONE);
        root.addView(tvStatus, matchWrap());

        // Progress
        progressBar = new ProgressBar(this);
        progressBar.setVisibility(View.GONE);
        LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(dp(40), dp(40));
        pbLp.gravity = Gravity.CENTER_HORIZONTAL;
        root.addView(progressBar, pbLp);

        root.addView(spacer(dp(8)));

        // Upload button
        btnUpload = new Button(this);
        btnUpload.setText("Upload");
        btnUpload.setTextColor(Color.WHITE);
        btnUpload.setTypeface(null, Typeface.BOLD);
        btnUpload.setBackgroundColor(Color.parseColor("#F5A623"));
        btnUpload.setOnClickListener(v -> uploadScreenshot());
        root.addView(btnUpload, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        return root;
    }

    // ---------------------------------------------------------------------------
    // Gallery / camera pickers
    // ---------------------------------------------------------------------------
    private void pickFromGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        intent.setType("image/*");
        galleryLauncher.launch(intent);
    }

    private void pickFromCamera() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraLauncher.launch(intent);
    }

    private void handleGalleryResult(ActivityResult result) {
        if (result.getResultCode() == RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try (InputStream is = getContentResolver().openInputStream(uri)) {
                    if (is != null) {
                        selectedImageBytes = readStream(is);
                        Bitmap bmp = BitmapFactory.decodeByteArray(
                                selectedImageBytes, 0, selectedImageBytes.length);
                        ivPreview.setImageBitmap(bmp);
                        tvStatus.setVisibility(View.GONE);
                    }
                } catch (IOException e) {
                    showError("Failed to read image");
                }
            }
        }
    }

    private void handleCameraResult(ActivityResult result) {
        if (result.getResultCode() == RESULT_OK && result.getData() != null) {
            Bitmap bmp = (Bitmap) result.getData().getExtras().get("data");
            if (bmp != null) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                bmp.compress(Bitmap.CompressFormat.JPEG, 90, baos);
                selectedImageBytes = baos.toByteArray();
                ivPreview.setImageBitmap(bmp);
                tvStatus.setVisibility(View.GONE);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Upload
    // ---------------------------------------------------------------------------
    private void uploadScreenshot() {
        if (selectedImageBytes == null) {
            showError("Please select an image first");
            return;
        }

        String type = (String) spnType.getSelectedItem();
        setLoading(true);

        repository.uploadScreenshot(selectedImageBytes, type,
                new AgentRepository.UploadCallback() {
                    @Override
                    public void onSuccess() {
                        runOnUiThread(() -> {
                            setLoading(false);
                            Toast.makeText(ScreenshotActivity.this,
                                    "Uploaded successfully", Toast.LENGTH_SHORT).show();
                            finish();
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

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------
    private byte[] readStream(InputStream is) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
        return baos.toByteArray();
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnUpload.setEnabled(!loading);
    }

    private void showError(String msg) {
        tvStatus.setText(msg);
        tvStatus.setVisibility(View.VISIBLE);
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
    }

    private View spacer(int heightPx) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, heightPx));
        return v;
    }
}
