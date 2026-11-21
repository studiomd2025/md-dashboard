package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R

class MdFeedCardWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id -> update(ctx, mgr, id, mgr.getAppWidgetOptions(id)) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
        update(ctx, mgr, id, opts)
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        super.onReceive(ctx, intent)
        if (intent.action == ACTION_ITEM_CLICK) {
            val postId = intent.getStringExtra("post_id") ?: ""
            val launchIntent = Intent(ctx, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("https://localhost/?post=$postId")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            ctx.startActivity(launchIntent)
        }
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        ids.forEach { WidgetPrefs.removeWidget(ctx, it) }
    }

    companion object {
        const val ACTION_ITEM_CLICK = "com.studiomd.dashboard.widget.FEED_CARD_ITEM_CLICK"

        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            val theme = WidgetPrefs.loadTheme(ctx, id)
            val corner = WidgetPrefs.loadCorner(ctx, id)
            val maxPosts = WidgetPrefs.loadFeedMaxPosts(ctx, id)
            val filter = WidgetPrefs.loadFeedFilter(ctx, id)

            val views = RemoteViews(ctx.packageName, R.layout.widget_feed_card)

            // Apply corner radius & theme background
            val surfaceRes = WidgetTheme.getSurfaceDrawable(theme, corner)
            views.setInt(R.id.widget_feed_card_root, "setBackgroundResource", surfaceRes)

            if (!theme.isTransparent) {
                views.setInt(R.id.widget_feed_card_root, "setColorFilter", Color.parseColor(theme.bgHex))
            } else {
                views.setInt(R.id.widget_feed_card_root, "setColorFilter", 0)
            }

            val inkColor = WidgetTheme.getInkColor(ctx, theme)
            val accentColor = WidgetTheme.getAccentColor(ctx, theme)

            views.setTextColor(R.id.widget_feed_header, inkColor)
            views.setTextColor(R.id.widget_feed_open_app, accentColor)

            val filterLabel = when (filter) {
                "pinned" -> "Pinned Only"
                "tag" -> "#Tag"
                "date" -> "Date Range"
                else -> "All Posts"
            }
            views.setTextViewText(R.id.widget_feed_header, "$filterLabel · Max $maxPosts")

            // Header tap & "Open App" tap -> opens #/timeline
            val openAppPi = PendingIntent.getActivity(
                ctx, id + 70_000,
                Intent(ctx, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse("https://localhost/#/timeline")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_feed_header_container, openAppPi)
            views.setOnClickPendingIntent(R.id.widget_feed_open_app, openAppPi)

            // Bind RemoteViewsService for scrollable ListView
            val serviceIntent = Intent(ctx, WidgetFeedService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.widget_feed_list, serviceIntent)
            views.setEmptyView(R.id.widget_feed_list, R.id.widget_feed_empty_view)

            // Item click pending intent template
            val itemClickIntent = Intent(ctx, MdFeedCardWidgetProvider::class.java).apply {
                action = ACTION_ITEM_CLICK
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            }
            val itemClickPi = PendingIntent.getBroadcast(
                ctx, id + 75_000,
                itemClickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.widget_feed_list, itemClickPi)

            // Notify data changed to preserve existing cached views without white flash
            mgr.notifyAppWidgetViewDataChanged(id, R.id.widget_feed_list)
            mgr.updateAppWidget(id, views)
        }
    }
}
