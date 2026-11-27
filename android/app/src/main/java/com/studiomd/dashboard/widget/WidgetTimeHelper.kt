package com.studiomd.dashboard.widget

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

/**
 * Formatting utilities shared across all widget types and notifications.
 * - Post dates are formatted as yyyy.M.d (e.g. 2026.11.21).
 * - Countdown formats: "full" (00 : 00 : 00 : 00), "adaptive" / "days-only",
 *   "days-remaining" / "d-day" (D-10 -> ... -> D-1 -> D-Day -> D+1 ...), "date-only" (yyyy.M.d).
 */
object WidgetTimeHelper {

    fun resolveTimeZone(tzId: String?): TimeZone {
        val trimmed = tzId?.trim().orEmpty()
        if (trimmed.isEmpty() || trimmed.equals("MDT", ignoreCase = true)) {
            return TimeZone.getTimeZone("GMT+8")
        }
        return TimeZone.getTimeZone(trimmed)
    }

    /**
     * Format date strictly as yyyy.M.d (e.g. 2026.11.21).
     */
    fun formatDate(isoDate: String, timeZoneId: String? = null): String {
        return try {
            val date = parseIso(isoDate) ?: return isoDate.take(10).replace("-", ".")
            SimpleDateFormat("yyyy.M.d", Locale.US).apply {
                timeZone = if (timeZoneId != null) resolveTimeZone(timeZoneId) else TimeZone.getDefault()
            }.format(date)
        } catch (_: Exception) {
            isoDate.take(10).replace("-", ".")
        }
    }

    /** Legacy alias pointing directly to strict yyyy.M.d date */
    fun relativeDate(isoDate: String): String = formatDate(isoDate)

    /** Short absolute date, strictly yyyy.M.d */
    fun absoluteDate(isoDate: String): String = formatDate(isoDate)

    fun parseIsoMillis(isoDate: String): Long? = parseIso(isoDate)?.time

    /**
     * @param targetIso  ISO 8601 string of the event target time
     * @param format     "full" | "adaptive" | "days-only" | "days-remaining" | "d-day" | "date-only"
     * @param timeZoneId Optional countdown timezone ID (defaults to MDT = GMT+8)
     * @return Pair<displayValue, formatLabel>
     */
    fun formatCountdown(
        targetIso: String,
        format: String,
        timeZoneId: String? = null
    ): Pair<String, String> {
        return try {
            val target = parseIso(targetIso) ?: return Pair("D-Day", "")
            val nowMs = System.currentTimeMillis()
            val diffMs = target.time - nowMs

            val totalDays = TimeUnit.MILLISECONDS.toDays(Math.abs(diffMs))
            val hours = TimeUnit.MILLISECONDS.toHours(Math.abs(diffMs)) % 24
            val minutes = TimeUnit.MILLISECONDS.toMinutes(Math.abs(diffMs)) % 60
            val seconds = TimeUnit.MILLISECONDS.toSeconds(Math.abs(diffMs)) % 60

            when (format.lowercase(Locale.US)) {

                // ── Full Timer: 00:00:00:00 ────────────────────────────
                "full" -> {
                    if (diffMs <= 0) {
                        Pair("00:00:00:00", "")
                    } else {
                        Pair(
                            "%02d:%02d:%02d:%02d".format(totalDays, hours, minutes, seconds),
                            ""
                        )
                    }
                }

                // ── Adaptive Remaining: largest human unit ────────────────────
                "adaptive", "days-only" -> {
                    if (diffMs <= 0) return Pair("Event arrived", "")
                    val aMonths = (totalDays / 30).toInt()
                    val aWeeks = (totalDays / 7).toInt()
                    val value = when {
                        aMonths >= 2 -> "$aMonths months"
                        aMonths == 1 -> "1 month"
                        aWeeks >= 2 -> "$aWeeks weeks"
                        aWeeks == 1 -> "1 week"
                        totalDays >= 2 -> "$totalDays days"
                        totalDays == 1L -> "1 day"
                        hours >= 1 -> "${hours}h ${minutes}m"
                        minutes >= 1 -> "${minutes}m ${seconds}s"
                        else -> "< 1 minute"
                    }
                    Pair(value, "")
                }

                // ── Target Date Only: yyyy.M.d ────────────────────────────────
                "date-only" -> {
                    Pair(formatDate(targetIso, timeZoneId ?: "MDT"), "")
                }

                // ── Days Remaining: D-# / D-Day / D+# (calendar day diff) ────
                "days-remaining", "d-day", "compact", "" -> {
                    Pair(formatDDayValue(target.time, nowMs, timeZoneId), "")
                }

                // Default fallback: Days Remaining
                else -> {
                    Pair(formatDDayValue(target.time, nowMs, timeZoneId), "")
                }
            }
        } catch (_: Exception) {
            Pair("D-Day", "")
        }
    }

    private fun formatDDayValue(targetMs: Long, nowMs: Long, timeZoneId: String?): String {
        val tz = resolveTimeZone(timeZoneId)
        val targetCal = Calendar.getInstance(tz).apply { timeInMillis = targetMs }
        val nowCal = Calendar.getInstance(tz).apply { timeInMillis = nowMs }

        val targetMidnightUtc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(
                targetCal.get(Calendar.YEAR),
                targetCal.get(Calendar.MONTH),
                targetCal.get(Calendar.DAY_OF_MONTH)
            )
        }.timeInMillis

        val nowMidnightUtc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(
                nowCal.get(Calendar.YEAR),
                nowCal.get(Calendar.MONTH),
                nowCal.get(Calendar.DAY_OF_MONTH)
            )
        }.timeInMillis

        val dayDiff = Math.round((nowMidnightUtc - targetMidnightUtc).toDouble() / 86_400_000.0).toInt()
        return when {
            dayDiff == 0 -> "D-Day"
            dayDiff > 0 -> "D+$dayDiff"
            else -> "D-${-dayDiff}"
        }
    }

    private fun parseIso(isoDate: String): Date? {
        val trimmed = isoDate.trim()
        if (trimmed.isEmpty()) return null

        // Normalize "+HH:mm" / "-HH:mm" offset suffix -> "+HHmm" / "-HHmm" for SimpleDateFormat compatibility
        val normalized = Regex("([+-]\\d{2}):(\\d{2})$").replace(trimmed) { m ->
            "${m.groupValues[1]}${m.groupValues[2]}"
        }

        val formats = arrayOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm:ss'Z'" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm'Z'" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm:ssZ" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mmZ" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm:ss.SSS" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm:ss" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd'T'HH:mm" to TimeZone.getTimeZone("UTC"),
            "yyyy-MM-dd" to TimeZone.getTimeZone("UTC")
        )
        for ((fmt, tz) in formats) {
            try {
                val sdf = SimpleDateFormat(fmt, Locale.US).apply {
                    timeZone = tz
                    isLenient = false
                }
                val d = sdf.parse(normalized)
                if (d != null) return d
            } catch (_: Exception) {}
        }
        return null
    }

    fun updatedNow(): String =
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
}
