package com.pair.darb.agent.data.remote.api;

import com.pair.darb.agent.data.remote.dto.BasicResponse;
import com.pair.darb.agent.data.remote.dto.CommandResponse;
import com.pair.darb.agent.data.remote.dto.RegisterResponse;
import com.pair.darb.agent.data.remote.dto.SyncResponse;

import java.util.List;
import java.util.Map;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.Part;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface DarbApi {

    /**
     * Register / enroll this device with the backend.
     *
     * @param body Map containing: enrollmentCode, imei, model, osVersion
     */
    @POST("api/agent/register")
    Call<RegisterResponse> register(@Body Map<String, String> body);

    /**
     * Send a heartbeat ping with device telemetry.
     *
     * @param body Map containing: deviceId, batteryLevel, and any extra fields
     */
    @POST("api/agent/heartbeat")
    Call<BasicResponse> heartbeat(@Body Map<String, Object> body);

    /**
     * Upload a batch of captured orders (notifications parsed as orders).
     *
     * @param body Map containing: deviceId, driverId, orders (List)
     */
    @POST("api/agent/captured-orders")
    Call<SyncResponse> syncCapturedOrders(@Body Map<String, Object> body);

    /**
     * Upload a batch of location entries.
     *
     * @param body Map containing: deviceId, driverId, locations (List)
     */
    @POST("api/agent/location")
    Call<SyncResponse> syncLocations(@Body Map<String, Object> body);

    /**
     * Upload a batch of app-usage log entries.
     *
     * @param body Map containing: deviceId, driverId, logs (List)
     */
    @POST("api/agent/app-usage")
    Call<SyncResponse> syncAppUsage(@Body Map<String, Object> body);

    /**
     * Poll for pending commands for this device.
     *
     * @param deviceId The registered device ID
     */
    @GET("api/agent/commands")
    Call<List<CommandResponse>> getCommands(@Query("deviceId") String deviceId);

    /**
     * Acknowledge that a command has been received / executed.
     *
     * @param commandId The ID of the command to acknowledge
     */
    @POST("api/agent/commands/{id}/ack")
    Call<BasicResponse> ackCommand(@Path("id") String commandId);

    /**
     * Clock in to a shift, uploading a selfie photo and GPS coordinates.
     *
     * @param shiftId  The ID of the shift
     * @param selfie   Multipart image part (key: "selfie")
     * @param lat      Latitude as a request body part
     * @param lng      Longitude as a request body part
     */
    @Multipart
    @POST("api/shifts/{id}/clock-in")
    Call<BasicResponse> clockIn(
            @Path("id") String shiftId,
            @Part MultipartBody.Part selfie,
            @Part("lat") RequestBody lat,
            @Part("lng") RequestBody lng
    );

    /**
     * Clock out of a shift, uploading a selfie photo.
     *
     * @param shiftId The ID of the shift
     * @param selfie  Multipart image part (key: "selfie")
     */
    @Multipart
    @POST("api/shifts/{id}/clock-out")
    Call<BasicResponse> clockOut(
            @Path("id") String shiftId,
            @Part MultipartBody.Part selfie
    );

    /**
     * Unified selfie upload for clock-in / clock-out from the agent. The
     * backend locates (or creates) today's shift for CLOCK_IN, or completes
     * the provided shiftId for CLOCK_OUT, and returns the resolved shiftId.
     *
     * Multipart fields: deviceId, action, shiftId?, latitude?, longitude?, selfie
     */
    @Multipart
    @POST("api/agent/selfie")
    Call<com.pair.darb.agent.data.remote.dto.SelfieResponse> uploadSelfie(
            @Part MultipartBody.Part selfie,
            @Part("deviceId") RequestBody deviceId,
            @Part("action") RequestBody action,
            @Part("shiftId") RequestBody shiftId,
            @Part("latitude") RequestBody latitude,
            @Part("longitude") RequestBody longitude
    );
}
