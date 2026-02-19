package com.fleetpulse.agent.capture.parsers

import com.fleetpulse.agent.capture.ParsedNotification

object TalabatParser : PlatformParser {

    private val ORDER_REF_PATTERN = Regex("""#(\w+[-]?\d+)""")
    private val AMOUNT_PATTERN = Regex("""([\d.]+)\s*(?:KWD|د\.ك|KD)""", RegexOption.IGNORE_CASE)
    private val ASSIGNED_KEYWORDS = listOf("new order", "طلب جديد", "assigned", "تم تعيين")
    private val DELIVERED_KEYWORDS = listOf("delivered", "تم التوصيل", "completed", "مكتمل")
    private val PICKED_KEYWORDS = listOf("picked", "تم الاستلام", "pick up", "استلم")

    override fun parse(title: String?, text: String?): ParsedNotification {
        val combined = "${title.orEmpty()} ${text.orEmpty()}"

        val orderRef = ORDER_REF_PATTERN.find(combined)?.groupValues?.get(1)
        val amount = AMOUNT_PATTERN.find(combined)?.groupValues?.get(1)?.toDoubleOrNull()

        val status = when {
            DELIVERED_KEYWORDS.any { combined.contains(it, ignoreCase = true) } -> "delivered"
            PICKED_KEYWORDS.any { combined.contains(it, ignoreCase = true) } -> "picked_up"
            ASSIGNED_KEYWORDS.any { combined.contains(it, ignoreCase = true) } -> "assigned"
            else -> "captured"
        }

        return ParsedNotification(
            orderRef = orderRef,
            status = status,
            amount = amount
        )
    }
}
