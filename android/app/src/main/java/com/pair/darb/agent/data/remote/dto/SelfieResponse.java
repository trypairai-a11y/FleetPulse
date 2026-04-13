package com.pair.darb.agent.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class SelfieResponse {

    @SerializedName("shiftId")
    public String shiftId;

    @SerializedName("selfieUrl")
    public String selfieUrl;

    @SerializedName("isLate")
    public Boolean isLate;

    @SerializedName("lateMinutes")
    public Integer lateMinutes;

    @SerializedName("error")
    public String error;
}
