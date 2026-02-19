package com.fleetpulse.agent.capture.parsers

import com.fleetpulse.agent.capture.ParsedNotification

interface PlatformParser {
    fun parse(title: String?, text: String?): ParsedNotification
}
