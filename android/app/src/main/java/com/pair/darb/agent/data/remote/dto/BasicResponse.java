package com.pair.darb.agent.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class BasicResponse {

    @SerializedName("message")
    public String message;

    @SerializedName("status")
    public String status;
}
