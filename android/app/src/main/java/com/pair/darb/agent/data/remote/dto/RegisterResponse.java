package com.pair.darb.agent.data.remote.dto;

import com.google.gson.annotations.SerializedName;

public class RegisterResponse {

    @SerializedName("deviceId")
    public String deviceId;

    @SerializedName("driver")
    public Driver driver;

    @SerializedName("company")
    public Company company;

    public static class Driver {

        @SerializedName("id")
        public String id;

        @SerializedName("name")
        public String name;

        @SerializedName("platform")
        public String platform;
    }

    public static class Company {

        @SerializedName("id")
        public String id;

        @SerializedName("name")
        public String name;
    }
}
