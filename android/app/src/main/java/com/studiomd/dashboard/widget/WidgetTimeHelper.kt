package com.studiomd.dashboard.widget

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Formatting utilities shared across all widget types.
 * Strictly adheres to WIDGET_SPEC.md rules:
 * - Dates MUST be formatted as yyyy.m.d (NEVER relative e.g. "3 h ago").
 * - Countdown formats: "full" (00:00:00:00), "adaptive" (2 months / 3 days …),
 *   "days-remaining" (D-# / D-DAY / D+#), "date-only" (yyyy.m.d).
 */
object WidgetTimeHelper {

    /**
     * Format post date strictly as yyyy.m.d (e.g. 2026.11.21).
     * No leading zero on month or day per spec convention.
     */
    fun formatDate(isoDate: String): String {
        return try {
            val date = parseIso(isoDate) ?: return isoDate.take(10).replace("-", ".")
            SimpleDateFormat("yyyy.M.d", Locale.US).format(date)
        } catch (_: Exception) {
            isoDate.take(10).replace("-", ".")
        }
    }

    /** Legacy alias pointing directly to strict yyyy.m.d date */
    fun relativeDate(isoDate: String): String = formatDate(isoDate)

    /** Short absolute date, strictly yyyy.m.d */
    fun absoluteDate(isoDate: String): String = formatDate(isoDate)

    // ── Countdown formatting ──────────────────────────────────────────────────

    /**
     * @param targetIso  ISO 8601 string of the event target time
     * @param format     "full" | "adaptive" | "days-remaining" | "date-only"
     *                   (legacy "days-only" is treated as "adaptive")
     * @return Pair<displayValue, formatLabel>
     */
    fun formatCountdown(targetIso: String, format: String): Pair<String, String> {
        return try {
            val target = parseIso(targetIso) ?: return Pair("D-??", "")
            val nowMs  = System.currentTimeMillis()
            val diffMs = target.time - nowMs

            val totalDays = TimeUnit.MILLISECONDS.toDays(Math.abs(diffMs))
            val hours     = TimeUnit.MILLISECONDS.toHours(Math.abs(diffMs)) % 24
            val minutes   = TimeUnit.MILLISECONDS.toMinutes(Math.abs(diffMs)) % 60
            val seconds   = TimeUnit.MILLISECONDS.toSeconds(Math.abs(diffMs)) % 60

            when (format) {

                // ── Full Timer: 00 : 00 : 00 : 00 ────────────────────────────
                "full" -> {
                    if (diffMs <= 0) {
                        Pair("00 : 00 : 00 : 00", "")
                    } else {
                        Pair(
                            "%02d : %02d : %02d : %02d".format(totalDays, hours, minutes, seconds),
                            ""
                        )
                    }
                }

                // ── Adaptive Remaining: largest human unit ────────────────────
                // Maps from "adaptive" key; "days-only" kept for backward compat
                "adaptive", "days-only" -> {
                    if (diffMs <= 0) return Pair("🎉 Event is live!", "")
                    val aMonths = (totalDays / 30).toInt()
                    val aWeeks  = (totalDays / 7).toInt()
                    val value = when {
                        aMonths >= 2   -> "$aMonths months"
                        aMonths == 1   -> "1 month"
                        aWeeks  >= 2   -> "$aWeeks weeks"
                        aWeeks  == 1   -> "1 week"
                        totalDays >= 2 -> "$totalDays days"
                        totalDays == 1L -> "1 day"
                        hours >= 1     -> "${hours}h ${minutes}m"
                        minutes >= 1   -> "${minutes}m ${seconds}s"
                        else           -> "< 1 minute"
                    }
                    Pair(value, "")
                }

                // ── Days Remaining: D-# / D-DAY / D+# ────────────────────────
                "days-remaining" -> {
                    when {
                        diffMs > 86_400_000L     -> Pair("D-$totalDays", "")
                        diffMs in 0..86_400_000L -> Pair("D-DAY", "")
                        else                     -> Pair("D+$totalDays", "")
                    }
                }

                // ── Target Date Only: yyyy.M.d ────────────────────────────────
                "date-only" -> {
                    Pair(SimpleDateFormat("yyyy.M.d", Locale.US).format(target), "")
                }

                // Default fallback: Days Remaining
                else -> {
                    when {
                        diffMs > 86_400_000L     -> Pair("D-$totalDays", "")
                        diffMs in 0..86_400_000L -> Pair("D-DAY", "")
                        else                     -> Pair("D+$totalDays", "")
                    }
                }
            }
        } catch (_: Exception) {
            Pair("D-??", "")
        }
    }

    private fun parseIso(isoDate: String): Date? {
        val formats = arrayOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSS",
            "yyyy-MM-dd'T'HH:mm:ss"
        )
        for (fmt in formats) {
            try {
                val sdf = SimpleDateFormat(fmt, Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val d = sdf.parse(isoDate)
                if (d != null) return d
            } catch (_: Exception) {}
        }
        return null
    }

    fun updatedNow(): String =
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
}
