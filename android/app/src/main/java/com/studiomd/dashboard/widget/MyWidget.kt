package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import com.studiomd.dashboard.R

class MyWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        // Update all active instances of this widget
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Instantiate RemoteViews mapped to your layout XML file
            val views = RemoteViews(context.packageName, R.layout.widget_layout)

            // Bind dashboard data points or status messages
            views.setTextViewText(R.id.widget_title_text, "MD Dashboard: Online")
            views.setTextViewText(R.id.widget_status_text, "Synced successfully")

            // Instruct the widget manager to render the updates
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onEnabled(context: Context) {
        // Executed when the first widget instance is placed
    }

    override fun onDisabled(context: Context) {
        // Executed when the last widget instance is removed
    }
}