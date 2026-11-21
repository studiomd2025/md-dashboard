package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
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
        ids.forEach { WidgetPrefs.removeWidget(ctx, it) }
    }

    companion object {
        private const val TAG = "MdCountdownWidget"

        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            try {
                val minW = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 140)
                val minH = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 80)
                val theme = WidgetPrefs.loadTheme(ctx, id)
                val corner = WidgetPrefs.loadCorner(ctx, id)
                val format = WidgetPrefs.loadCountdownFormat(ctx, id)
                val cdId = WidgetPrefs.loadCountdownId(ctx, id)

                val views = RemoteViews(ctx.packageName, R.layout.widget_md_countdown)

                // Background surface handling (via ImageView)
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
                views.setTextColor(R.id.widget_countdown_title, subColor)
                views.setTextColor(R.id.widget_countdown_horiz_value, inkColor)
                views.setTextColor(R.id.widget_countdown_horiz_title, subColor)
                views.setTextColor(R.id.widget_countdown_tags, accentColor)

                // Single-line timer protection
                views.setInt(R.id.widget_countdown_value, "setMaxLines", 1)
                views.setInt(R.id.widget_countdown_horiz_value, "setMaxLines", 1)

                // Deep link: tap opens MainActivity to #/next or specific countdown
                val targetUri = if (cdId.isNotEmpty()) "https://localhost/#/?countdown=$cdId" else "https://localhost/#/next"
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

                // Breakpoint handling:
                // Smallest: w < 220 && h < 120
                // Horizontal: w >= 220 && h < 120
                // Vertical: 120 <= h < 172
                // Expanded: h >= 172
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
                    views.setTextViewTextSize(R.id.widget_countdown_value, TypedValue.COMPLEX_UNIT_SP, 22f)
                    views.setViewVisibility(R.id.widget_countdown_title, View.GONE)
                } else {
                    views.setTextViewTextSize(R.id.widget_countdown_value, TypedValue.COMPLEX_UNIT_SP, 28f)
                    if (!isHorizontal) views.setViewVisibility(R.id.widget_countdown_title, View.VISIBLE)
                }

                val isExpanded = (minH >= 172)

                mgr.updateAppWidget(id, views)

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val feed = WidgetApiClient.fetchFeed(ctx)
                        val countdowns = feed?.countdowns ?: emptyList()
                        val cd = if (cdId.isNotEmpty()) {
                            countdowns.firstOrNull { it.id == cdId } ?: countdowns.firstOrNull()
                        } else {
                            countdowns.firstOrNull()
                        }

                        if (cd != null) {
                            val (valStr, _) = WidgetTimeHelper.formatCountdown(cd.targetAt, format)
                            views.setTextViewText(R.id.widget_countdown_value, valStr)
                            views.setTextViewText(R.id.widget_countdown_title, cd.title)
                            views.setTextViewText(R.id.widget_countdown_horiz_value, valStr)
                            views.setTextViewText(R.id.widget_countdown_horiz_title, cd.title)

                            if (!cd.tag.isNullOrBlank() && isExpanded) {
                                val tagText = if (cd.tag.startsWith("#")) cd.tag else "#${cd.tag}"
                                views.setTextViewText(R.id.widget_countdown_tags, tagText)
                                views.setViewVisibility(R.id.widget_countdown_tags, View.VISIBLE)
                            } else {
                                views.setViewVisibility(R.id.widget_countdown_tags, View.GONE)
                            }
                        }

                        mgr.updateAppWidget(id, views)
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
