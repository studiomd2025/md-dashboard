package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.studiomd.dashboard.R

/** Legacy stub — no longer registered in manifest. */
class TimelineWidget : AppWidgetProvider() {
    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id ->
            mgr.updateAppWidget(id, RemoteViews(ctx.packageName, R.layout.widget_timeline))
        }
    }
    companion object {
        fun update(ctx: Context, mgr: AppWidgetManager, id: Int) {
            mgr.updateAppWidget(id, RemoteViews(ctx.packageName, R.layout.widget_timeline))
        }
    }
}
