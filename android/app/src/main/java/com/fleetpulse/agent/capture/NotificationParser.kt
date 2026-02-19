package com.fleetpulse.agent.capture

import com.fleetpulse.agent.capture.parsers.CarriageParser
import com.fleetpulse.agent.capture.parsers.DeliverooParser
import com.fleetpulse.agent.capture.parsers.KeetaParser
import com.fleetpulse.agent.capture.parsers.TalabatParser

data class ParsedNotification(
    val orderRef: String? = null,
    val status: String? = null,
    val amount: Double? = null,
    val customerArea: String? = null,
    val restaurant: String? = null
)

object NotificationParser {

    private val parsers = mapOf(
        "com.talabat.talabatcaptain" to TalabatParser,
        "com.keeta.driver" to KeetaParser,
        "com.deliveroo.rider" to DeliverooParser,
        "com.jahez.driver" to CarriageParser
    )

    fun parse(packageName: String, title: String?, text: String?): ParsedNotification {
        val parser = parsers[packageName] ?: return ParsedNotification()
        return parser.parse(title, text)
    }
}
