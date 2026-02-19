package com.fleetpulse.agent.util

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

object DateTimeUtils {
    private val KUWAIT_ZONE = ZoneId.of("Asia/Kuwait")
    private val ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT

    fun nowIso(): String {
        return Instant.now().toString()
    }

    fun nowKuwait(): ZonedDateTime {
        return ZonedDateTime.now(KUWAIT_ZONE)
    }

    fun toIso(instant: Instant): String {
        return instant.toString()
    }

    fun fromEpochMillis(millis: Long): String {
        return Instant.ofEpochMilli(millis).toString()
    }

    fun daysAgoIso(days: Int): String {
        return Instant.now().minus(days.toLong(), ChronoUnit.DAYS).toString()
    }

    fun formatKuwaitTime(iso: String): String {
        return try {
            val instant = Instant.parse(iso)
            val kuwaitTime = instant.atZone(KUWAIT_ZONE)
            kuwaitTime.format(DateTimeFormatter.ofPattern("HH:mm"))
        } catch (e: Exception) {
            iso
        }
    }

    fun formatKuwaitDate(iso: String): String {
        return try {
            val instant = Instant.parse(iso)
            val kuwaitTime = instant.atZone(KUWAIT_ZONE)
            kuwaitTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        } catch (e: Exception) {
            iso
        }
    }
}
