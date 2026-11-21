package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

class MdDashboardWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            updateWidget(context, appWidgetManager, appWidgetId, options)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        updateWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        const val ACTION_REFRESH = "com.studiomd.dashboard.widget.DASHBOARD_REFRESH"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            options: Bundle
        ) {
            val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
            val views = RemoteViews(context.packageName, R.layout.widget_md_dashboard)

            // Deep link to Timeline view
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("https://localhost/#/timeline")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pi = PendingIntent.getActivity(
                context,
                appWidgetId + 70_000,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val feed = WidgetApiClient.fetchFeed(context)
                    val post = feed?.posts?.firstOrNull()

                    if (post != null) {
                        val rawTitle = post.title.trim()
                        if (rawTitle.isNotEmpty()) {
                            views.setTextViewText(R.id.widget_post_title, rawTitle)
                            views.setViewVisibility(R.id.widget_post_title, View.VISIBLE)
                        } else {
                            views.setViewVisibility(R.id.widget_post_title, View.GONE)
                        }

                        views.setTextViewText(R.id.widget_post_excerpt, post.excerpt)

                        val metaParts = mutableListOf<String>()
                        if (post.publishedAt.isNotBlank()) {
                            metaParts.add(WidgetTimeHelper.relativeDate(post.publishedAt))
                        }
                        if (post.tags.isNotEmpty()) {
                            metaParts.add(post.tags.take(3).joinToString(" ") { if (it.startsWith("#")) it else "#$it" })
                        }
                        views.setTextViewText(R.id.widget_post_meta, metaParts.joinToString(" • "))
                        views.setViewVisibility(R.id.widget_post_meta, if (minH >= 90) View.VISIBLE else View.GONE)

                        val imageUrl = post.wideImageUrl
                        if (!imageUrl.isNullOrBlank()) {
                            try {
                                val conn = (URL(imageUrl).openConnection() as HttpURLConnection).apply {
                                    connectTimeout = 5000
                                    readTimeout = 5000
                                }
                                val bmp = conn.inputStream.use { BitmapFactory.decodeStream(it) }
                                if (bmp != null) {
                                    views.setImageViewBitmap(R.id.widget_post_image, bmp)
                                    views.setViewVisibility(R.id.widget_post_image, View.VISIBLE)
                                } else {
                                    views.setViewVisibility(R.id.widget_post_image, View.GONE)
                                }
                            } catch (_: Exception) {
                                views.setViewVisibility(R.id.widget_post_image, View.GONE)
                            }
                        } else {
                            views.setViewVisibility(R.id.widget_post_image, View.GONE)
                        }
                    } else {
                        views.setTextViewText(R.id.widget_post_excerpt, "No recent posts yet")
                        views.setViewVisibility(R.id.widget_post_title, View.GONE)
                        views.setViewVisibility(R.id.widget_post_image, View.GONE)
                        views.setViewVisibility(R.id.widget_post_meta, View.GONE)
                    }

                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (_: Exception) {
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }
        }
    }
}
