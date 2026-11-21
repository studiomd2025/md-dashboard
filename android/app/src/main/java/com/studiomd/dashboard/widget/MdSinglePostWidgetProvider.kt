package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
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

class MdSinglePostWidgetProvider : AppWidgetProvider() {

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
        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            val minH = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 140)
            val theme = WidgetPrefs.loadTheme(ctx, id)
            val corner = WidgetPrefs.loadCorner(ctx, id)
            val postId = WidgetPrefs.loadSinglePostId(ctx, id)
            val views = RemoteViews(ctx.packageName, R.layout.widget_single_post)

            // Apply corner radius & theme background
            val surfaceRes = WidgetTheme.getSurfaceDrawable(theme, corner)
            views.setInt(R.id.widget_single_post_root, "setBackgroundResource", surfaceRes)

            if (!theme.isTransparent) {
                views.setInt(R.id.widget_single_post_root, "setColorFilter", Color.parseColor(theme.bgHex))
            } else {
                views.setInt(R.id.widget_single_post_root, "setColorFilter", 0)
            }

            val inkColor = WidgetTheme.getInkColor(ctx, theme)
            val subColor = WidgetTheme.getSubColor(ctx, theme)
            val accentColor = WidgetTheme.getAccentColor(ctx, theme)

            views.setTextColor(R.id.widget_single_post_title, inkColor)
            views.setTextColor(R.id.widget_single_post_timestamp, subColor)
            views.setTextColor(R.id.widget_single_post_caption, inkColor)
            views.setTextColor(R.id.widget_single_post_open, accentColor)

            // Adaptive sizing: if widget height is small, reduce excerpt lines
            views.setInt(R.id.widget_single_post_caption, "setMaxLines", if (minH < 150) 1 else 3)

            CoroutineScope(Dispatchers.IO).launch {
                val feed = WidgetApiClient.fetchFeed(ctx)
                val posts = feed?.posts ?: emptyList()
                val post = if (postId.isNotEmpty()) {
                    posts.firstOrNull { it.id == postId } ?: posts.firstOrNull()
                } else {
                    posts.firstOrNull()
                }

                if (post != null) {
                    val targetPostId = post.id

                    val pi = PendingIntent.getActivity(
                        ctx, id + 55_000,
                        Intent(ctx, MainActivity::class.java).apply {
                            action = Intent.ACTION_VIEW
                            data = Uri.parse("https://localhost/?post=$targetPostId")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        },
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_single_post_root, pi)
                    views.setOnClickPendingIntent(R.id.widget_single_post_open, pi)

                    val cleanTitle = post.title.trim()
                    if (cleanTitle.isNotEmpty() && !cleanTitle.equals("Diary Entry", ignoreCase = true)) {
                        views.setTextViewText(R.id.widget_single_post_title, cleanTitle)
                        views.setViewVisibility(R.id.widget_single_post_title, View.VISIBLE)
                    } else {
                        views.setViewVisibility(R.id.widget_single_post_title, View.GONE)
                    }

                    val dateFormatted = WidgetTimeHelper.formatDate(post.publishedAt)
                    val tagStr = if (post.tags.isNotEmpty()) {
                        " · " + post.tags.take(2).joinToString(" ") { if (it.startsWith("#")) it else "#$it" }
                    } else ""
                    views.setTextViewText(R.id.widget_single_post_timestamp, "$dateFormatted$tagStr")

                    views.setTextViewText(
                        R.id.widget_single_post_caption,
                        post.excerpt.ifBlank { if (cleanTitle.isNotEmpty()) cleanTitle else "View post" }
                    )

                    val imageUrl = post.wideImageUrl
                    if (!imageUrl.isNullOrBlank()) {
                        try {
                            val conn = URL(imageUrl).openConnection() as HttpURLConnection
                            conn.connectTimeout = 6000
                            conn.readTimeout = 6000
                            val bmp = conn.inputStream.use { BitmapFactory.decodeStream(it) }
                            if (bmp != null) {
                                views.setImageViewBitmap(R.id.widget_single_post_image, bmp)
                                views.setViewVisibility(R.id.widget_single_post_image, View.VISIBLE)
                            } else {
                                views.setViewVisibility(R.id.widget_single_post_image, View.GONE)
                            }
                        } catch (_: Exception) {
                            views.setViewVisibility(R.id.widget_single_post_image, View.GONE)
                        }
                    } else {
                        views.setViewVisibility(R.id.widget_single_post_image, View.GONE)
                    }
                } else {
                    views.setTextViewText(R.id.widget_single_post_caption, ctx.getString(R.string.widget_single_empty))
                    views.setViewVisibility(R.id.widget_single_post_title, View.GONE)
                    views.setViewVisibility(R.id.widget_single_post_image, View.GONE)
                    views.setTextViewText(R.id.widget_single_post_timestamp, "")
                }

                mgr.updateAppWidget(id, views)
            }
        }
    }
}
