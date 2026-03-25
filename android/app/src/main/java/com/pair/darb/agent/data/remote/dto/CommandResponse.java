package com.pair.darb.agent.data.remote.dto;

import com.google.gson.JsonObject;
import com.google.gson.annotations.SerializedName;

public class CommandResponse {

    @SerializedName("id")
    public String id;

    @SerializedName("command")
    public String command;

    @SerializedName("payload")
    public JsonObject payload;

    @SerializedName("status")
    public String status;
}
