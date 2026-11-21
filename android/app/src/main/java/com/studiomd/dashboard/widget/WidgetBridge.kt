package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin bridging the React web app to the native widget system.
 *
 * JS usage:
 * ```ts
 * await MdWidgetBridge.setServerUrl({ url: window.location.origin });
 * await MdWidgetBridge.refreshAllWidgets();
 * ```
 */
@CapacitorPlugin(name = "MdWidgetBridge")
class WidgetBridge : Plugin() {

    @PluginMethod
    fun setServerUrl(call: PluginCall) {
        val url = call.getString("url")
        if (url.isNullOrBlank()) { call.reject("url is required"); return }
        WidgetApiClient.saveBaseUrl(context, url)
        call.resolve()
    }

    @PluginMethod
    fun refreshAllWidgets(call: PluginCall) {
        val ctx = context
        val mgr = AppWidgetManager.getInstance(ctx)

        // Refresh the 4 active widget providers
        mgr.getAppWidgetIds(ComponentName(ctx, MdCountdownWidgetProvider::class.java)).forEach { id ->
            MdCountdownWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
        }
        mgr.getAppWidgetIds(ComponentName(ctx, MdSinglePostWidgetProvider::class.java)).forEach { id ->
            MdSinglePostWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
        }
        mgr.getAppWidgetIds(ComponentName(ctx, MdLiveWidgetProvider::class.java)).forEach { id ->
            MdLiveWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
        }
        mgr.getAppWidgetIds(ComponentName(ctx, MdFeedCardWidgetProvider::class.java)).forEach { id ->
            MdFeedCardWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
        }

        call.resolve()
    }

    @PluginMethod
    fun getServerUrl(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().apply {
            put("url", WidgetApiClient.loadBaseUrl(context))
        })
    }
}
