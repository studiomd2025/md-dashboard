package com.studiomd.dashboard.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray

/**
 * Capacitor plugin bridging the React web app to the native widget and notification system.
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
    fun syncCountdownSelection(call: PluginCall) {
        val ctx = context
        val countdownId = call.getString("countdownId")?.trim().orEmpty()
        if (countdownId.isEmpty()) {
            call.reject("countdownId is required")
            return
        }

        WidgetPrefs.saveSelectedCountdownId(ctx, countdownId)

        val rawFormat = call.getString("displayFormat")?.trim().orEmpty()
        if (rawFormat.isNotEmpty()) {
            val normalizedFormat = when (rawFormat) {
                "d-day", "compact" -> "days-remaining"
                "adaptive" -> "days-only"
                else -> rawFormat
            }
            WidgetPrefs.saveSelectedCountdownFormat(ctx, normalizedFormat)
        }

        val title = call.getString("title")?.trim().orEmpty()
        val targetAt = call.getString("targetAt")?.trim().orEmpty()
        if (title.isNotEmpty() && targetAt.isNotEmpty()) {
            val existing = WidgetApiClient.getCachedFeed(ctx)?.countdowns?.toMutableList() ?: mutableListOf()
            val item = WidgetCountdown(
                id = countdownId,
                title = title,
                targetAt = targetAt,
                location = call.getString("location")?.takeIf { it.isNotBlank() },
                displayFormat = rawFormat.ifBlank { "days-remaining" },
                tag = call.getString("tag")?.takeIf { it.isNotBlank() },
                timeZone = call.getString("timeZone")?.takeIf { it.isNotBlank() }
            )
            val idx = existing.indexOfFirst { it.id == countdownId }
            if (idx >= 0) existing[idx] = item else existing.add(0, item)
            WidgetApiClient.upsertCountdownsInCache(ctx, existing)
        }

        val mgr = AppWidgetManager.getInstance(ctx)
        val applyToWidgets = call.getBoolean("applyToPlacedWidgets", true) ?: true
        mgr.getAppWidgetIds(ComponentName(ctx, MdCountdownWidgetProvider::class.java)).forEach { id ->
            if (applyToWidgets || WidgetPrefs.loadCountdownId(ctx, id).isEmpty()) {
                WidgetPrefs.saveCountdownId(ctx, id, countdownId)
            }
            MdCountdownWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
        }

        call.resolve()
    }

    @PluginMethod
    fun syncCountdowns(call: PluginCall) {
        val ctx = context
        val jsonStr = call.getString("countdownsJson")?.trim().orEmpty()
        if (jsonStr.isEmpty()) {
            call.resolve()
            return
        }
        try {
            val arr = JSONArray(jsonStr)
            val list = (0 until arr.length()).mapNotNull { i ->
                val obj = arr.optJSONObject(i) ?: return@mapNotNull null
                val id = obj.optString("id").trim()
                val title = obj.optString("title").trim()
                val targetAt = obj.optString("targetAt").trim()
                if (id.isEmpty() || title.isEmpty() || targetAt.isEmpty()) return@mapNotNull null
                val fmt = obj.optString("displayFormat").trim().let {
                    when {
                        it.isEmpty() || it == "d-day" || it == "compact" -> "days-remaining"
                        it == "adaptive" -> "days-only"
                        else -> it
                    }
                }
                WidgetCountdown(
                    id = id,
                    title = title,
                    targetAt = targetAt,
                    location = obj.optString("location").takeIf { it.isNotBlank() },
                    displayFormat = fmt,
                    tag = obj.optString("tag").takeIf { it.isNotBlank() },
                    timeZone = obj.optString("timeZone").takeIf { it.isNotBlank() }
                )
            }
            if (list.isNotEmpty()) {
                WidgetApiClient.upsertCountdownsInCache(ctx, list)
                val mgr = AppWidgetManager.getInstance(ctx)
                mgr.getAppWidgetIds(ComponentName(ctx, MdCountdownWidgetProvider::class.java)).forEach { id ->
                    MdCountdownWidgetProvider.update(ctx, mgr, id, mgr.getAppWidgetOptions(id))
                }
                val nowMs = System.currentTimeMillis()
                list.mapNotNull { WidgetTimeHelper.parseIsoMillis(it.targetAt) }
                    .filter { it > nowMs }
                    .minOrNull()
                    ?.let { MdNotificationManager.scheduleNextWakeup(ctx, it) }
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Invalid countdownsJson", e)
        }
    }

    @PluginMethod
    fun notifyEvent(call: PluginCall) {
        val ctx = context
        val key = call.getString("key")?.trim().orEmpty()
        val title = call.getString("title")?.trim().orEmpty()
        val body = call.getString("body")?.trim().orEmpty()
        val url = call.getString("url")?.trim().orEmpty().ifEmpty { "https://localhost/#/timeline" }
        val openExternal = call.getBoolean("openExternal", false) ?: false

        if (key.isEmpty() || title.isEmpty()) {
            call.reject("key and title are required")
            return
        }

        val shown = MdNotificationManager.notifyDirectly(ctx, key, title, body, url, openExternal)
        call.resolve(JSObject().apply { put("shown", shown) })
    }

    @PluginMethod
    fun checkNotificationsNow(call: PluginCall) {
        val ctx = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            MdNotificationManager.checkAllAndNotify(ctx)
            call.resolve()
        }
    }

    @PluginMethod
    fun getNotificationStatus(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("enabled", MdNotificationManager.hasNotificationPermission(context))
        })
    }

    @PluginMethod
    fun getServerUrl(call: PluginCall) {
        call.resolve(JSObject().apply {
            put("url", WidgetApiClient.loadBaseUrl(context))
        })
    }
}
