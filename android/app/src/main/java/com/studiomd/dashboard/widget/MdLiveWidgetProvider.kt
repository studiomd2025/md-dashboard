package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MdLiveWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id -> update(ctx, mgr, id, mgr.getAppWidgetOptions(id)) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
        update(ctx, mgr, id, opts)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        ids.forEach { WidgetPrefs.removeWidget(ctx, it) }
    }

    companion object {
        private const val TAG = "MdLiveWidgetProvider"

        private val CHANNELS = mapOf(
            1 to Triple("Channel 1", "MDTV_ch1", "MDTV_ch1"),
            2 to Triple("Channel 2", "MDMT_ch2", "MDMT_ch2"),
            3 to Triple("Channel 3", "MDRS_ch3", "MDRS_ch3")
        )

        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            try {
                val minW = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 140)
                val minH = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 80)
                val theme = WidgetPrefs.loadTheme(ctx, id)
                val corner = WidgetPrefs.loadCorner(ctx, id)
                val ch = WidgetPrefs.loadLiveChannel(ctx, id)
                val (chName, callsign, apiKey) = CHANNELS[ch] ?: CHANNELS[1]!!

                val views = RemoteViews(ctx.packageName, R.layout.widget_md_live)

                // Background surface handling (via ImageView)
                val surfaceRes = WidgetTheme.getSurfaceDrawable(theme, corner)
                views.setViewVisibility(R.id.widget_live_bg, View.VISIBLE)
                views.setInt(R.id.widget_live_bg, "setImageResource", surfaceRes)
                if (theme.isTransparent) {
                    views.setInt(R.id.widget_live_bg, "setColorFilter", 0)
                } else {
                    views.setInt(R.id.widget_live_bg, "setColorFilter", Color.parseColor(theme.bgHex))
                }

                val inkColor = WidgetTheme.getInkColor(ctx, theme)
                val subColor = WidgetTheme.getSubColor(ctx, theme)
                val accentColor = WidgetTheme.getAccentColor(ctx, theme)

                views.setTextColor(R.id.widget_live_brand, subColor)
                views.setTextColor(R.id.widget_live_channel, inkColor)
                views.setTextColor(R.id.widget_live_callsign, subColor)
                views.setTextColor(R.id.widget_live_open, accentColor)
                views.setTextColor(R.id.widget_live_tags, accentColor)

                views.setInt(R.id.widget_live_brand, "setMaxLines", 1)

                // Deep-link: Tapping MD LIVE widget opens #/live directly in MainActivity
                val liveUri = "https://localhost/#/live"
                val pi = PendingIntent.getActivity(
                    ctx, id + 50_000,
                    Intent(ctx, MainActivity::class.java).apply {
                        action = Intent.ACTION_VIEW
                        data = Uri.parse(liveUri)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_live_root, pi)
                views.setOnClickPendingIntent(R.id.widget_live_open, pi)

                // Adaptive breakpoints per WIDGET_SPEC.md:
                // - Smallest (w < 195 && h < 145): status badge top-right + Ch # + callsign centered; brand & footer hidden.
                // - Horizontal (w >= 195 && h < 145): Channel # left + status badge right; brand, callsign & footer hidden.
                // - Vertical (145 <= h < 185): brand header + status badge + Channel # + callsign + NOW STREAMING + footer.
                // - Expanded Tall (h >= 185): same + event #hashtags strip above footer.
                val isSmallest = (minW < 195 && minH < 145)
                val isHorizontal = (minW >= 195 && minH < 145)
                val isExpanded = (minH >= 185)

                when {
                    isSmallest -> {
                        views.setViewVisibility(R.id.widget_live_brand, View.GONE)
                        views.setViewVisibility(R.id.widget_live_divider, View.GONE)
                        views.setViewVisibility(R.id.widget_live_open, View.GONE)
                        views.setViewVisibility(R.id.widget_live_tags, View.GONE)
                        views.setViewVisibility(R.id.widget_live_callsign, View.VISIBLE)
                        views.setTextViewText(R.id.widget_live_channel, "Ch $ch")
                    }
                    isHorizontal -> {
                        views.setViewVisibility(R.id.widget_live_brand, View.GONE)
                        views.setViewVisibility(R.id.widget_live_callsign, View.GONE)
                        views.setViewVisibility(R.id.widget_live_divider, View.GONE)
                        views.setViewVisibility(R.id.widget_live_open, View.GONE)
                        views.setViewVisibility(R.id.widget_live_tags, View.GONE)
                        views.setTextViewText(R.id.widget_live_channel, chName)
                    }
                    else -> {
                        views.setViewVisibility(R.id.widget_live_brand, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_live_callsign, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_live_divider, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_live_open, View.VISIBLE)
                        views.setViewVisibility(R.id.widget_live_tags, if (isExpanded) View.VISIBLE else View.GONE)
                        views.setTextViewText(R.id.widget_live_channel, chName)
                    }
                }

                views.setTextViewText(R.id.widget_live_callsign, callsign)

                // Initial offline state
                views.setTextViewText(R.id.widget_live_status, ctx.getString(R.string.widget_live_status_offline))
                views.setInt(R.id.widget_live_status, "setBackgroundResource", R.drawable.widget_live_badge_offline)
                views.setTextColor(R.id.widget_live_status, Color.parseColor("#64748B"))
                views.setViewVisibility(R.id.widget_live_now_streaming, View.GONE)
                views.setTextViewText(R.id.widget_live_open, ctx.getString(R.string.widget_live_open_station))

                mgr.updateAppWidget(id, views)

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val feed = WidgetApiClient.fetchFeed(ctx)
                        val cdTag = feed?.countdowns?.firstOrNull()?.tag
                        val realTag = if (!cdTag.isNullOrBlank()) {
                            if (cdTag.startsWith("#")) cdTag else "#$cdTag"
                        } else {
                            "#StudioLaunch2026"
                        }
                        if (isExpanded) {
                            views.setTextViewText(R.id.widget_live_tags, realTag)
                        }

                        val status = WidgetApiClient.fetchTwitchStatus(ctx, apiKey)
                        if (status?.isLive == true) {
                            views.setTextViewText(R.id.widget_live_status, ctx.getString(R.string.widget_live_status_live))
                            views.setInt(R.id.widget_live_status, "setBackgroundResource", R.drawable.widget_live_badge_live)
                            views.setTextColor(R.id.widget_live_status, Color.WHITE)

                            if (!isSmallest && !isHorizontal) {
                                val streamText = if (!status.streamTitle.isNullOrBlank()) "🔴 ${status.streamTitle}" else "🔴 NOW STREAMING"
                                views.setTextViewText(R.id.widget_live_now_streaming, streamText)
                                views.setViewVisibility(R.id.widget_live_now_streaming, View.VISIBLE)
                                views.setTextViewText(R.id.widget_live_open, "Watch Broadcast ↗")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error fetching live data", e)
                    }

                    mgr.updateAppWidget(id, views)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating live widget", e)
            }
        }
    }
}
