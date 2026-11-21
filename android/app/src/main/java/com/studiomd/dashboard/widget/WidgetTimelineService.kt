package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.studiomd.dashboard.R
import kotlinx.coroutines.runBlocking

/**
 * RemoteViewsService that feeds timeline rows to the ListView inside
 * [TimelineWidget] and [PinnedWidget].
 */
class WidgetTimelineService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        val widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        return WidgetTimelineFactory(applicationContext, widgetId, pinnedOnly = false)
    }
}

/**
 * RemoteViewsService for the Pinned Posts widget (shows only pinned posts).
 */
class WidgetPinnedService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        val widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        return WidgetTimelineFactory(applicationContext, widgetId, pinnedOnly = true)
    }
}

/**
 * Shared RemoteViewsFactory that populates list rows for both the Timeline
 * and Pinned Posts widgets.
 *
 * @param pinnedOnly  When true, only pinned posts are shown.
 */
class WidgetTimelineFactory(
    private val ctx: Context,
    private val widgetId: Int,
    private val pinnedOnly: Boolean
) : RemoteViewsService.RemoteViewsFactory {

    private var posts: List<WidgetPost> = emptyList()

    override fun onCreate() { loadData() }

    override fun onDataSetChanged() { loadData() }

    private fun loadData() {
        val feed = runBlocking { WidgetApiClient.fetchFeed(ctx) } ?: return
        val limit = if (pinnedOnly) 10
                    else 5
        posts = feed.posts
            .let { all -> if (pinnedOnly) all.filter { it.pinned } else all }
            .take(limit)
    }

    override fun getCount(): Int = posts.size

    override fun getViewAt(position: Int): RemoteViews {
        val post = posts[position]
        val layoutId = if (pinnedOnly) R.layout.widget_pinned_item
                       else R.layout.widget_timeline_item
        val views = RemoteViews(ctx.packageName, layoutId)

        if (pinnedOnly) {
            views.setTextViewText(R.id.item_pinned_title, post.title)
            val until = post.pinnedUntil?.let { WidgetTimeHelper.absoluteDate(it) } ?: ""
            views.setTextViewText(R.id.item_pinned_until, if (until.isNotEmpty()) "Until $until" else "")
        } else {
            views.setTextViewText(R.id.item_title, post.title)
            views.setTextViewText(R.id.item_date, WidgetTimeHelper.relativeDate(post.publishedAt))
            views.setViewVisibility(
                R.id.item_pin_badge,
                if (post.pinned) android.view.View.VISIBLE else android.view.View.GONE
            )
        }

        // Fill-in intent for item tap (uses template set by provider)
        val fillInIntent = Intent().apply {
            putExtra("post_id", post.id)
        }
        views.setOnClickFillInIntent(
            if (pinnedOnly) R.id.item_pinned_title else R.id.item_title,
            fillInIntent
        )

        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount(): Int = 1
    override fun getItemId(position: Int): Long = posts.getOrNull(position)?.id.hashCode().toLong()
    override fun hasStableIds(): Boolean = true
    override fun onDestroy() {}
}
