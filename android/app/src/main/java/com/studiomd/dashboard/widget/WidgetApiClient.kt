package com.studiomd.dashboard.widget

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.URL

// ─────────────────────────────────────────────────────────────────────────────
// Data models (lightweight, widget-only)
// ─────────────────────────────────────────────────────────────────────────────

data class WidgetPost(
    val id: String,
    val title: String,
    val excerpt: String,
    val publishedAt: String,
    val pinned: Boolean,
    val pinnedUntil: String?,
    val tags: List<String>,
    val wideImageUrl: String? = null
)

data class WidgetCountdown(
    val id: String,
    val title: String,
    val targetAt: String,
    val location: String?,
    val displayFormat: String,   // "compact" | "days-only" | "full"
    val tag: String? = null
)

data class TwitchStatus(
    val channel: String,
    val isLive: Boolean,
    val streamTitle: String? = null
)

data class WidgetFeed(
    val updatedAt: String,
    val posts: List<WidgetPost>,
    val countdowns: List<WidgetCountdown>
)

// ─────────────────────────────────────────────────────────────────────────────
// Server URL persistence  (set once at app launch via WidgetBridge)
// ─────────────────────────────────────────────────────────────────────────────

object WidgetApiClient {

    private const val PREFS_NAME = "md_widget_api"
    private const val KEY_BASE_URL = "base_url"
    private const val FALLBACK_URL = "https://mddashboard.onrender.com"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveBaseUrl(ctx: Context, url: String) =
        prefs(ctx).edit().putString(KEY_BASE_URL, url.trimEnd('/')).apply()

    fun loadBaseUrl(ctx: Context): String =
        prefs(ctx).getString(KEY_BASE_URL, FALLBACK_URL) ?: FALLBACK_URL

    // ── Fetch widget feed ────────────────────────────────────────────────────

    suspend fun fetchFeed(ctx: Context): WidgetFeed? = withContext(Dispatchers.IO) {
        try {
            val base = loadBaseUrl(ctx)
            val raw = URL("$base/api/widget-feed.json").readText()
            parseFeed(raw)
        } catch (e: Exception) {
            null
        }
    }

    suspend fun fetchTwitchStatus(ctx: Context, channel: String): TwitchStatus? = withContext(Dispatchers.IO) {
        try {
            val base = loadBaseUrl(ctx)
            val raw = URL("$base/api/twitch-status?channel=${channel.trim()}").readText()
            val obj = JSONObject(raw)
            TwitchStatus(
                channel = obj.optString("channel", channel),
                isLive = obj.optBoolean("isLive", false),
                streamTitle = obj.optString("streamTitle").takeIf { it.isNotBlank() }
            )
        } catch (e: Exception) {
            null
        }
    }

    // ── Parse ────────────────────────────────────────────────────────────────

    private fun parseFeed(json: String): WidgetFeed {
        val root = JSONObject(json)
        val updatedAt = root.optString("updatedAt", "")

        val items = root.optJSONArray("items") ?: JSONArray()
        val posts = (0 until items.length()).map { i ->
            val obj = items.getJSONObject(i)
            val img = obj.optString("wideImageUrl").takeIf { it.isNotBlank() }
                ?: obj.optString("imageUrl").takeIf { it.isNotBlank() }
            WidgetPost(
                id = obj.optString("id"),
                title = obj.optString("title"),
                excerpt = obj.optString("excerpt").ifBlank { obj.optString("summary") },
                publishedAt = obj.optString("publishedAt").ifBlank { obj.optString("publishedLabel") },
                pinned = obj.optBoolean("pinned", false),
                pinnedUntil = obj.optString("pinnedUntil").takeIf { it.isNotBlank() },
                tags = parseStringArray(obj.optJSONArray("tags")),
                wideImageUrl = img
            )
        }

        val cds = root.optJSONArray("countdowns") ?: JSONArray()
        val countdowns = (0 until cds.length()).map { i ->
            val obj = cds.getJSONObject(i)
            WidgetCountdown(
                id = obj.optString("id"),
                title = obj.optString("title"),
                targetAt = obj.optString("targetAt"),
                location = obj.optString("location").takeIf { it.isNotBlank() },
                displayFormat = obj.optString("displayFormat", "compact")
                    .let { if (it.isBlank()) "compact" else it },
                tag = obj.optString("tag").takeIf { it.isNotBlank() }
            )
        }

        return WidgetFeed(updatedAt = updatedAt, posts = posts, countdowns = countdowns)
    }

    private fun parseStringArray(arr: JSONArray?): List<String> {
        arr ?: return emptyList()
        return (0 until arr.length()).map { arr.getString(it) }
    }
}
