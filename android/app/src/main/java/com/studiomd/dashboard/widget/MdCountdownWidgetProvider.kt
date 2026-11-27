package com.studiomd.dashboard.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MdCountdownWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id -> update(ctx, mgr, id, mgr.getAppWidgetOptions(id)) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
        update(ctx, mgr, id, opts)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        ids.forEach {
            cancelTickBoundaryRefresh(ctx, it)
            WidgetPrefs.removeWidget(ctx, it)
        }
    }

    companion object {
        private const val TAG = "MdCountdownWidget"
        private const val DAY_MS = 86_400_000L
        private const val TEN_HOURS_MS = 36_000_000L
        private const val ONE_HOUR_MS = 3_600_000L

        private data class CountdownStyleState(
            val views: RemoteViews,
            val isHorizontal: Boolean,
            val isSmallest: Boolean,
            val isExpanded: Boolean
        )

        private fun buildBaseViews(
            ctx: Context,
            id: Int,
            opts: Bundle
        ): CountdownStyleState {
            val minW = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 140)
            val minH = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 80)
            val theme = WidgetPrefs.loadTheme(ctx, id)
            val corner = WidgetPrefs.loadCorner(ctx, id)

            val views = RemoteViews(ctx.packageName, R.layout.widget_md_countdown)

            val surfaceRes = WidgetTheme.getSurfaceDrawable(theme, corner)
            views.setViewVisibility(R.id.widget_countdown_bg, View.VISIBLE)
            views.setInt(R.id.widget_countdown_bg, "setImageResource", surfaceRes)
            if (theme.isTransparent) {
                views.setInt(R.id.widget_countdown_bg, "setColorFilter", 0)
            } else {
                views.setInt(R.id.widget_countdown_bg, "setColorFilter", android.graphics.Color.parseColor(theme.bgHex))
            }

            val inkColor = WidgetTheme.getInkColor(ctx, theme)
            val subColor = WidgetTheme.getSubColor(ctx, theme)
            val accentColor = WidgetTheme.getAccentColor(ctx, theme)

            views.setTextColor(R.id.widget_countdown_value, inkColor)
            views.setTextColor(R.id.widget_countdown_chronometer, inkColor)
            views.setTextColor(R.id.widget_countdown_title, subColor)
            views.setTextColor(R.id.widget_countdown_horiz_value, inkColor)
            views.setTextColor(R.id.widget_countdown_horiz_chronometer, inkColor)
            views.setTextColor(R.id.widget_countdown_horiz_title, subColor)
            views.setTextColor(R.id.widget_countdown_tags, accentColor)

            views.setInt(R.id.widget_countdown_value, "setMaxLines", 1)
            views.setInt(R.id.widget_countdown_chronometer, "setMaxLines", 1)
            views.setInt(R.id.widget_countdown_horiz_value, "setMaxLines", 1)
            views.setInt(R.id.widget_countdown_horiz_chronometer, "setMaxLines", 1)

            val isHorizontal = (minW >= 220 && minH < 120)
            if (isHorizontal) {
                views.setViewVisibility(R.id.widget_countdown_horiz_container, View.VISIBLE)
                views.setViewVisibility(R.id.widget_countdown_vert_container, View.GONE)
            } else {
                views.setViewVisibility(R.id.widget_countdown_horiz_container, View.GONE)
                views.setViewVisibility(R.id.widget_countdown_vert_container, View.VISIBLE)
            }

            val isSmallest = (minW < 220 && minH < 120)
            if (isSmallest) {
                views.setTextViewTextSize(R.id.widget_countdown_value, TypedValue.COMPLEX_UNIT_SP, 24f)
                views.setTextViewTextSize(R.id.widget_countdown_chronometer, TypedValue.COMPLEX_UNIT_SP, 24f)
                views.setTextViewTextSize(R.id.widget_countdown_horiz_value, TypedValue.COMPLEX_UNIT_SP, 24f)
                views.setTextViewTextSize(R.id.widget_countdown_horiz_chronometer, TypedValue.COMPLEX_UNIT_SP, 24f)
                views.setViewVisibility(R.id.widget_countdown_bottom_section, View.GONE)
                views.setViewVisibility(R.id.widget_countdown_title, View.GONE)
            } else {
                views.setTextViewTextSize(R.id.widget_countdown_value, TypedValue.COMPLEX_UNIT_SP, 34f)
                views.setTextViewTextSize(R.id.widget_countdown_chronometer, TypedValue.COMPLEX_UNIT_SP, 34f)
                views.setTextViewTextSize(R.id.widget_countdown_horiz_value, TypedValue.COMPLEX_UNIT_SP, 28f)
                views.setTextViewTextSize(R.id.widget_countdown_horiz_chronometer, TypedValue.COMPLEX_UNIT_SP, 28f)
                views.setViewVisibility(R.id.widget_countdown_bottom_section, View.VISIBLE)
                if (!isHorizontal) views.setViewVisibility(R.id.widget_countdown_title, View.VISIBLE)
            }

            val isExpanded = (minH >= 172)
            return CountdownStyleState(views, isHorizontal, isSmallest, isExpanded)
        }

        private fun boundaryPendingIntent(ctx: Context, widgetId: Int): PendingIntent {
            val intent = Intent(ctx, MdCountdownWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            return PendingIntent.getBroadcast(
                ctx,
                widgetId + 70_000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun cancelTickBoundaryRefresh(ctx: Context, widgetId: Int) {
            try {
                val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                alarmManager.cancel(boundaryPendingIntent(ctx, widgetId))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to cancel tick boundary alarm for widget $widgetId", e)
            }
        }

        private fun scheduleTickBoundaryRefresh(ctx: Context, widgetId: Int, delayMs: Long) {
            if (delayMs <= 0L) return
            try {
                val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val triggerAtMs = System.currentTimeMillis() + delayMs
                val pi = boundaryPendingIntent(ctx, widgetId)
                val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
                    alarmManager.canScheduleExactAlarms()
                if (canExact) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to schedule tick boundary alarm for widget $widgetId", e)
            }
        }

        private fun disableChronometers(views: RemoteViews) {
            val nowElapsed = SystemClock.elapsedRealtime()
            views.setChronometer(R.id.widget_countdown_chronometer, nowElapsed, null, false)
            views.setChronometer(R.id.widget_countdown_horiz_chronometer, nowElapsed, null, false)
            views.setViewVisibility(R.id.widget_countdown_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_countdown_horiz_chronometer, View.GONE)
            views.setViewVisibility(R.id.widget_countdown_value, View.VISIBLE)
            views.setViewVisibility(R.id.widget_countdown_horiz_value, View.VISIBLE)
        }

        private fun bindFullTimerChronometer(
            ctx: Context,
            widgetId: Int,
            styleState: CountdownStyleState,
            targetIso: String
        ) {
            val views = styleState.views
            val targetMs = WidgetTimeHelper.parseIsoMillis(targetIso)
            val nowMs = System.currentTimeMillis()
            val diffMs = if (targetMs != null) targetMs - nowMs else -1L

            if (diffMs <= 0L) {
                disableChronometers(views)
                views.setTextViewText(R.id.widget_countdown_value, "00:00:00:00")
                views.setTextViewText(R.id.widget_countdown_horiz_value, "00:00:00:00")
                cancelTickBoundaryRefresh(ctx, widgetId)
                return
            }

            val totalDays = diffMs / DAY_MS
            val withinDayMs = diffMs % DAY_MS
            val formatStr = when {
                withinDayMs >= TEN_HOURS_MS -> "%02d:%%s".format(totalDays)
                withinDayMs >= ONE_HOUR_MS -> "%02d:0%%s".format(totalDays)
                else -> "%02d:00:%%s".format(totalDays)
            }
            val baseElapsed = SystemClock.elapsedRealtime() + withinDayMs

            // Use native launcher-driven Chronometer so seconds tick live at 1Hz without waking the app
            views.setViewVisibility(R.id.widget_countdown_value, View.GONE)
            views.setViewVisibility(R.id.widget_countdown_horiz_value, View.GONE)

            if (styleState.isHorizontal) {
                views.setChronometer(R.id.widget_countdown_chronometer, baseElapsed, null, false)
                views.setViewVisibility(R.id.widget_countdown_chronometer, View.GONE)

                views.setViewVisibility(R.id.widget_countdown_horiz_chronometer, View.VISIBLE)
                views.setChronometerCountDown(R.id.widget_countdown_horiz_chronometer, true)
                views.setChronometer(R.id.widget_countdown_horiz_chronometer, baseElapsed, formatStr, true)
            } else {
                views.setChronometer(R.id.widget_countdown_horiz_chronometer, baseElapsed, null, false)
                views.setViewVisibility(R.id.widget_countdown_horiz_chronometer, View.GONE)

                views.setViewVisibility(R.id.widget_countdown_chronometer, View.VISIBLE)
                views.setChronometerCountDown(R.id.widget_countdown_chronometer, true)
                views.setChronometer(R.id.widget_countdown_chronometer, baseElapsed, formatStr, true)
            }

            // Refresh widget at the next format/day boundary (10h -> 9h, 1h -> 0h, day rollover, or arrival)
            val nextBoundaryDelayMs = when {
                withinDayMs >= TEN_HOURS_MS -> (withinDayMs - TEN_HOURS_MS) + 250L
                withinDayMs >= ONE_HOUR_MS -> (withinDayMs - ONE_HOUR_MS) + 250L
                else -> withinDayMs + 250L
            }
            scheduleTickBoundaryRefresh(ctx, widgetId, nextBoundaryDelayMs)
        }

        private fun bindCountdownData(
            ctx: Context,
            id: Int,
            styleState: CountdownStyleState,
            countdowns: List<WidgetCountdown>
        ) {
            val views = styleState.views
            val perWidgetId = WidgetPrefs.loadCountdownId(ctx, id)
            val appSyncedId = WidgetPrefs.loadSelectedCountdownId(ctx)
            val effectiveId = perWidgetId.ifEmpty { appSyncedId }

            val cd = if (effectiveId.isNotEmpty()) {
                countdowns.firstOrNull { it.id == effectiveId } ?: countdowns.firstOrNull()
            } else {
                countdowns.firstOrNull()
            }

            val targetId = cd?.id ?: effectiveId
            val targetUri = if (targetId.isNotEmpty()) "https://localhost/#/?countdown=$targetId" else "https://localhost/#/next"
            val pi = PendingIntent.getActivity(
                ctx, id + 60_000,
                Intent(ctx, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse(targetUri)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_countdown_root, pi)

            if (cd != null) {
                val explicitPerWidgetFormat = if (WidgetPrefs.hasCountdownFormat(ctx, id)) {
                    WidgetPrefs.loadCountdownFormat(ctx, id)
                } else {
                    ""
                }
                val appSyncedFormat = WidgetPrefs.loadSelectedCountdownFormat(ctx)
                val effectiveFormat = explicitPerWidgetFormat
                    .ifBlank { appSyncedFormat }
                    .ifBlank { cd.displayFormat }
                    .ifBlank { "days-remaining" }

                if (effectiveFormat.equals("full", ignoreCase = true)) {
                    bindFullTimerChronometer(ctx, id, styleState, cd.targetAt)
                } else {
                    disableChronometers(views)
                    cancelTickBoundaryRefresh(ctx, id)
                    val (valStr, _) = WidgetTimeHelper.formatCountdown(cd.targetAt, effectiveFormat, cd.timeZone)
                    views.setTextViewText(R.id.widget_countdown_value, valStr)
                    views.setTextViewText(R.id.widget_countdown_horiz_value, valStr)
                }

                views.setTextViewText(R.id.widget_countdown_title, cd.title)
                views.setTextViewText(R.id.widget_countdown_horiz_title, cd.title)

                if (!cd.tag.isNullOrBlank() && styleState.isExpanded) {
                    val tagText = if (cd.tag.startsWith("#")) cd.tag else "#${cd.tag}"
                    views.setTextViewText(R.id.widget_countdown_tags, tagText)
                    views.setViewVisibility(R.id.widget_countdown_tags, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.widget_countdown_tags, View.GONE)
                }
            } else {
                disableChronometers(views)
                cancelTickBoundaryRefresh(ctx, id)
                views.setTextViewText(R.id.widget_countdown_value, "D-Day")
                views.setTextViewText(R.id.widget_countdown_title, ctx.getString(R.string.widget_countdown_empty))
                views.setTextViewText(R.id.widget_countdown_horiz_value, "D-Day")
                views.setTextViewText(R.id.widget_countdown_horiz_title, ctx.getString(R.string.widget_countdown_empty))
                views.setViewVisibility(R.id.widget_countdown_tags, View.GONE)
            }
        }

        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            try {
                val initialState = buildBaseViews(ctx, id, opts)
                val cachedCountdowns = WidgetApiClient.getCachedFeed(ctx)?.countdowns ?: emptyList()
                if (cachedCountdowns.isNotEmpty()) {
                    bindCountdownData(ctx, id, initialState, cachedCountdowns)
                } else {
                    // Show clean loading state synchronously rather than stale "D-00"
                    disableChronometers(initialState.views)
                    val pi = PendingIntent.getActivity(
                        ctx, id + 60_000,
                        Intent(ctx, MainActivity::class.java).apply {
                            action = Intent.ACTION_VIEW
                            data = Uri.parse("https://localhost/#/next")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        },
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    initialState.views.setOnClickPendingIntent(R.id.widget_countdown_root, pi)
                    initialState.views.setTextViewText(R.id.widget_countdown_value, "…")
                    initialState.views.setTextViewText(R.id.widget_countdown_title, ctx.getString(R.string.widget_loading))
                    initialState.views.setTextViewText(R.id.widget_countdown_horiz_value, "…")
                    initialState.views.setTextViewText(R.id.widget_countdown_horiz_title, ctx.getString(R.string.widget_loading))
                    initialState.views.setViewVisibility(R.id.widget_countdown_tags, View.GONE)
                }
                mgr.updateAppWidget(id, initialState.views)

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val feed = WidgetApiClient.fetchFeed(ctx)
                        val countdowns = feed?.countdowns ?: cachedCountdowns
                        val freshState = buildBaseViews(ctx, id, opts)
                        bindCountdownData(ctx, id, freshState, countdowns)
                        mgr.updateAppWidget(id, freshState.views)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error updating countdown widget data", e)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating countdown widget base layout", e)
            }
        }
    }
}
