package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.studiomd.dashboard.R
import kotlinx.coroutines.runBlocking
import java.net.HttpURLConnection
import java.net.URL

class WidgetFeedService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        val widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID
        )
        return WidgetFeedFactory(applicationContext, widgetId)
    }
}

class WidgetFeedFactory(
    private val ctx: Context,
    private val widgetId: Int
) : RemoteViewsService.RemoteViewsFactory {

    private var posts: List<WidgetPost> = emptyList()
    private var layoutStyle: String = "full"
    private var theme: WidgetTheme = WidgetTheme.TRANSPARENT

    override fun onCreate() {
        loadData()
    }

    override fun onDataSetChanged() {
        loadData()
    }

    private fun loadData() {
        try {
            theme = WidgetPrefs.loadTheme(ctx, widgetId)
            layoutStyle = WidgetPrefs.loadFeedLayoutStyle(ctx, widgetId)
            val maxPosts = WidgetPrefs.loadFeedMaxPosts(ctx, widgetId)
            val filter = WidgetPrefs.loadFeedFilter(ctx, widgetId)
            val tag = WidgetPrefs.loadFeedTag(ctx, widgetId)
            val dateFrom = WidgetPrefs.loadFeedDateFrom(ctx, widgetId)
            val dateTo = WidgetPrefs.loadFeedDateTo(ctx, widgetId)

            val feed = runBlocking { WidgetApiClient.fetchFeed(ctx) } ?: return
            var filtered = feed.posts

            if (filtered.isEmpty() && posts.isNotEmpty()) {
                // Keep existing cached posts if new fetch is empty/failed
                return
            }

            when (filter) {
                "pinned" -> filtered = filtered.filter { it.pinned }
                "tag" -> if (tag.isNotBlank()) {
                    val cleanTag = tag.removePrefix("#").trim()
                    filtered = filtered.filter { p ->
                        p.tags.any { it.removePrefix("#").equals(cleanTag, ignoreCase = true) }
                    }
                }
                "date" -> {
                    if (dateFrom.isNotBlank()) {
                        filtered = filtered.filter { it.publishedAt >= dateFrom }
                    }
                    if (dateTo.isNotBlank()) {
                        filtered = filtered.filter { it.publishedAt <= dateTo }
                    }
                }
                else -> {
                    // "all" - pinned first, then newest
                    filtered = filtered.sortedWith(compareByDescending<WidgetPost> { it.pinned }.thenByDescending { it.publishedAt })
                }
            }

            if (filtered.isNotEmpty()) {
                posts = filtered.take(maxPosts)
            }
        } catch (e: Exception) {
            Log.e("WidgetFeedFactory", "Error loading feed data", e)
        }
    }

    override fun getCount(): Int = posts.size

    override fun getViewAt(position: Int): RemoteViews {
        if (position !in posts.indices) return RemoteViews(ctx.packageName, R.layout.widget_feed_item_full)
        val post = posts[position]

        val layoutId = when (layoutStyle) {
            "horizontal" -> R.layout.widget_feed_item_horizontal
            "list" -> R.layout.widget_feed_item_list
            else -> R.layout.widget_feed_item_full
        }

        val views = RemoteViews(ctx.packageName, layoutId)

        val inkColor = WidgetTheme.getInkColor(ctx, theme)
        val subColor = WidgetTheme.getSubColor(ctx, theme)
        val accentColor = WidgetTheme.getAccentColor(ctx, theme)

        views.setTextColor(R.id.feed_item_title, inkColor)
        views.setTextColor(R.id.feed_item_date, subColor)

        if (layoutStyle != "list") {
            views.setTextColor(R.id.feed_item_excerpt, inkColor)
            views.setTextColor(R.id.feed_item_tags, accentColor)
        }

        // Title: clean title or excerpt snippet
        val cleanTitle = post.title.trim()
        val hasRealTitle = cleanTitle.isNotEmpty() && !cleanTitle.equals("Diary Entry", ignoreCase = true)

        if (layoutStyle == "list") {
            val listHeading = if (hasRealTitle) cleanTitle else post.excerpt.take(40)
            views.setTextViewText(R.id.feed_item_title, listHeading)
            views.setTextViewText(R.id.feed_item_date, WidgetTimeHelper.formatDate(post.publishedAt))
        } else {
            if (hasRealTitle) {
                views.setTextViewText(R.id.feed_item_title, cleanTitle)
                views.setViewVisibility(R.id.feed_item_title, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.feed_item_title, View.GONE)
            }

            views.setTextViewText(R.id.feed_item_date, WidgetTimeHelper.formatDate(post.publishedAt))
            views.setTextViewText(R.id.feed_item_excerpt, post.excerpt.ifBlank { post.title })

            if (post.tags.isNotEmpty()) {
                val tagsStr = post.tags.take(3).joinToString(" ") { if (it.startsWith("#")) it else "#$it" }
                views.setTextViewText(R.id.feed_item_tags, tagsStr)
                views.setViewVisibility(R.id.feed_item_tags, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.feed_item_tags, View.GONE)
            }

            // Pinned badge (Full View)
            if (layoutStyle == "full") {
                views.setViewVisibility(R.id.feed_item_pinned_badge, if (post.pinned) View.VISIBLE else View.GONE)
            }

            // Image with short timeout and sample scaling
            val imageUrl = post.wideImageUrl
            if (!imageUrl.isNullOrBlank()) {
                val bmp = fetchScaledBitmap(imageUrl)
                if (bmp != null) {
                    views.setImageViewBitmap(R.id.feed_item_image, bmp)
                    views.setViewVisibility(R.id.feed_item_image, View.VISIBLE)
                } else {
                    views.setViewVisibility(R.id.feed_item_image, View.GONE)
                }
            } else {
                views.setViewVisibility(R.id.feed_item_image, View.GONE)
            }
        }

        // Fill-in Intent for list item click -> opens ?post={id}
        val fillInIntent = Intent().apply {
            putExtra("post_id", post.id)
        }
        val rootId = when (layoutStyle) {
            "horizontal" -> R.id.feed_item_horiz_root
            "list" -> R.id.feed_item_list_root
            else -> R.id.feed_item_full_root
        }
        views.setOnClickFillInIntent(rootId, fillInIntent)

        return views
    }

    private fun fetchScaledBitmap(urlStr: String): Bitmap? {
        return try {
            val conn = URL(urlStr).openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            conn.inputStream.use { stream ->
                BitmapFactory.decodeStream(stream)
            }
        } catch (_: Exception) {
            null
        }
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 3
    override fun getItemId(position: Int): Long = posts.getOrNull(position)?.id.hashCode().toLong()
    override fun hasStableIds(): Boolean = true
    override fun onDestroy() {}
}
