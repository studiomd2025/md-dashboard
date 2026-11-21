package com.studiomd.dashboard.widget

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.webkit.CookieManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
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
    val wideImageUrl: String? = null,
    val hasMedia: Boolean = false,
    val isAnimatedGif: Boolean = false
)

data class WidgetCountdown(
    val id: String,
    val title: String,
    val targetAt: String,
    val location: String?,
    val displayFormat: String,   // "full" | "days-only" | "days-remaining" | "date-only"
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
// Server URL & Direct Firestore REST API Client
// ─────────────────────────────────────────────────────────────────────────────

object WidgetApiClient {

    private const val TAG = "WidgetApiClient"
    private const val PREFS_NAME = "md_widget_api"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_FEED_CACHE = "cached_feed_json"
    private const val FALLBACK_URL = "https://ais-pre-jlyggj2es4wxdx5r36t72p-456241029780.asia-northeast1.run.app"

    private const val FIRESTORE_QUERY_URL =
        "https://firestore.googleapis.com/v1/projects/project-0452fe0b-b1ea-4de7-a42/databases/ai-studio-mydiariesintrane-9f3ca7cf-96b7-41e9-bf7b-35c4bc36aabf/documents:runQuery?key=AIzaSyDHg786M0d3zqkIUD5MPr8wsmjvzjNttag"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveBaseUrl(ctx: Context, url: String) =
        prefs(ctx).edit().putString(KEY_BASE_URL, url.trimEnd('/')).apply()

    fun loadBaseUrl(ctx: Context): String =
        prefs(ctx).getString(KEY_BASE_URL, FALLBACK_URL) ?: FALLBACK_URL

    private fun saveFeedCache(ctx: Context, json: String) =
        prefs(ctx).edit().putString(KEY_FEED_CACHE, json).apply()

    private fun loadFeedCache(ctx: Context): String? =
        prefs(ctx).getString(KEY_FEED_CACHE, null)

    // ── Fetch widget feed ────────────────────────────────────────────────────

    suspend fun fetchFeed(ctx: Context): WidgetFeed? = withContext(Dispatchers.IO) {
        try {
            // Query Firestore REST API directly to bypass AI Studio's 302 auth cookie check
            val countdowns = fetchFirestoreCountdowns()
            val posts = fetchFirestorePosts()

            val feed = WidgetFeed(
                updatedAt = WidgetTimeHelper.updatedNow(),
                posts = posts,
                countdowns = countdowns
            )

            // Cache clean parsed JSON for offline/refresh persistence
            val serializedCache = serializeFeed(feed)
            saveFeedCache(ctx, serializedCache)

            feed
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching live feed from Firestore REST, loading cached feed", e)
            loadCachedFeed(ctx)
        }
    }

    suspend fun fetchTwitchStatus(ctx: Context, channel: String): TwitchStatus? = withContext(Dispatchers.IO) {
        try {
            val base = loadBaseUrl(ctx)
            val url = "$base/api/twitch-status?channel=${channel.trim()}"
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            val cookies = try { CookieManager.getInstance().getCookie(base) } catch (_: Exception) { null }
            if (!cookies.isNullOrBlank()) {
                conn.setRequestProperty("Cookie", cookies)
            }
            val raw = conn.inputStream.use { it.bufferedReader().readText() }.trim()
            if (!raw.startsWith("{")) return@withContext null

            val obj = JSONObject(raw)
            TwitchStatus(
                channel = obj.optString("channel", channel),
                isLive = obj.optBoolean("isLive", false),
                streamTitle = obj.optString("streamTitle").takeIf { it.isNotBlank() && it != "null" }
            )
        } catch (e: Exception) {
            null
        }
    }

    // ── Firestore REST API Queries ───────────────────────────────────────────

    private fun fetchFirestoreCountdowns(): List<WidgetCountdown> {
        val payload = JSONObject().apply {
            put("structuredQuery", JSONObject().apply {
                put("from", JSONArray().put(JSONObject().put("collectionId", "countdowns")))
            })
        }.toString()

        val raw = postJson(FIRESTORE_QUERY_URL, payload) ?: return emptyList()
        val root = JSONArray(raw)

        return (0 until root.length()).mapNotNull { i ->
            val elem = root.optJSONObject(i) ?: return@mapNotNull null
            val doc = elem.optJSONObject("document") ?: return@mapNotNull null
            val name = doc.optString("name", "")
            val id = name.substringAfterLast("/")
            val fields = doc.optJSONObject("fields") ?: return@mapNotNull null

            val title = optString(fields, "title")
            val targetAt = optString(fields, "targetAt")
            if (id.isBlank() || title.isBlank() || targetAt.isBlank()) return@mapNotNull null

            WidgetCountdown(
                id = id,
                title = title,
                targetAt = targetAt,
                location = optString(fields, "location").takeIf { it.isNotBlank() },
                displayFormat = optString(fields, "displayFormat").let {
                    if (it.isBlank() || it == "compact") "days-remaining" else it
                },
                tag = optString(fields, "tag").takeIf { it.isNotBlank() }
            )
        }.sortedBy { it.targetAt }
    }

    private fun fetchFirestorePosts(): List<WidgetPost> {
        val payload = JSONObject().apply {
            put("structuredQuery", JSONObject().apply {
                put("from", JSONArray().put(JSONObject().put("collectionId", "posts")))
                put("where", JSONObject().apply {
                    put("fieldFilter", JSONObject().apply {
                        put("field", JSONObject().put("fieldPath", "isDraft"))
                        put("op", "EQUAL")
                        put("value", JSONObject().put("booleanValue", false))
                    })
                })
            })
        }.toString()

        val raw = postJson(FIRESTORE_QUERY_URL, payload) ?: return emptyList()
        val root = JSONArray(raw)

        return (0 until root.length()).mapNotNull { i ->
            val elem = root.optJSONObject(i) ?: return@mapNotNull null
            val doc = elem.optJSONObject("document") ?: return@mapNotNull null
            val name = doc.optString("name", "")
            val id = name.substringAfterLast("/")
            val fields = doc.optJSONObject("fields") ?: return@mapNotNull null

            val title = optString(fields, "title").trim()
            val bodyHtml = optString(fields, "bodyHtml")
            val publishedAt = optString(fields, "publishedAt")
            val pinnedUntil = optString(fields, "pinnedUntil").takeIf { it.isNotBlank() }

            val excerpt = stripHtml(bodyHtml).ifBlank { if (title.isNotBlank() && !title.equals("Diary Entry", true)) title else "Post" }

            val manualTags = parseArrayValue(fields, "manualTags")
            val inlineTags = parseArrayValue(fields, "inlineTags")
            val tags = (manualTags + inlineTags).distinct().filter { it.isNotBlank() }

            val (imageUrl, isGif) = parseAttachmentsImage(fields)
            val hasMedia = !imageUrl.isNullOrBlank()

            WidgetPost(
                id = id,
                title = title,
                excerpt = excerpt,
                publishedAt = publishedAt,
                pinned = !pinnedUntil.isNullOrBlank(),
                pinnedUntil = pinnedUntil,
                tags = tags,
                wideImageUrl = imageUrl,
                hasMedia = hasMedia,
                isAnimatedGif = isGif
            )
        }.sortedByDescending { it.publishedAt }
    }

    // ── Helper parsing functions ─────────────────────────────────────────────

    private fun postJson(urlStr: String, jsonBody: String): String? {
        return try {
            val conn = URL(urlStr).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.doOutput = true

            OutputStreamWriter(conn.outputStream).use { it.write(jsonBody); it.flush() }

            if (conn.responseCode in 200..299) {
                conn.inputStream.use { it.bufferedReader().readText() }
            } else null
        } catch (e: Exception) {
            Log.e(TAG, "POST request failed for $urlStr", e)
            null
        }
    }

    private fun optString(fields: JSONObject, key: String): String {
        val f = fields.optJSONObject(key) ?: return ""
        val str = f.optString("stringValue", "")
        return if (str == "null") "" else str
    }

    private fun parseArrayValue(fields: JSONObject, key: String): List<String> {
        val f = fields.optJSONObject(key) ?: return emptyList()
        val arrVal = f.optJSONObject("arrayValue") ?: return emptyList()
        val vals = arrVal.optJSONArray("values") ?: return emptyList()
        return (0 until vals.length()).mapNotNull { i ->
            vals.optJSONObject(i)?.optString("stringValue")?.takeIf { it.isNotBlank() && it != "null" }
        }
    }

    private fun parseAttachmentsImage(fields: JSONObject): Pair<String?, Boolean> {
        val attObj = fields.optJSONObject("attachments") ?: return Pair(null, false)
        val arrVal = attObj.optJSONObject("arrayValue") ?: return Pair(null, false)
        val vals = arrVal.optJSONArray("values") ?: return Pair(null, false)

        for (i in 0 until vals.length()) {
            val item = vals.optJSONObject(i) ?: continue
            val mapVal = item.optJSONObject("mapValue") ?: continue
            val mapFields = mapVal.optJSONObject("fields") ?: continue

            val type = optString(mapFields, "type").lowercase()
            val url = optString(mapFields, "url")
            if (url.isBlank()) continue

            if (type == "image" || type == "gif" || url.endsWith(".png", true) || url.endsWith(".jpg", true) || url.endsWith(".jpeg", true) || url.endsWith(".webp", true) || url.endsWith(".gif", true)) {
                val isGif = type == "gif" || url.endsWith(".gif", true)
                return Pair(url, isGif)
            }
        }
        return Pair(null, false)
    }

    private fun stripHtml(html: String): String {
        if (html.isBlank()) return ""
        return html.replace(Regex("<[^>]*>"), " ")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    // ── Local SharedPreferences Cache Serialization ──────────────────────────

    private fun serializeFeed(feed: WidgetFeed): String {
        val root = JSONObject()
        root.put("updatedAt", feed.updatedAt)

        val postsArr = JSONArray()
        feed.posts.forEach { p ->
            postsArr.put(JSONObject().apply {
                put("id", p.id)
                put("title", p.title)
                put("excerpt", p.excerpt)
                put("publishedAt", p.publishedAt)
                put("pinned", p.pinned)
                put("pinnedUntil", p.pinnedUntil ?: "")
                put("tags", JSONArray(p.tags))
                put("wideImageUrl", p.wideImageUrl ?: "")
                put("hasMedia", p.hasMedia)
                put("isAnimatedGif", p.isAnimatedGif)
            })
        }
        root.put("posts", postsArr)

        val cdArr = JSONArray()
        feed.countdowns.forEach { c ->
            cdArr.put(JSONObject().apply {
                put("id", c.id)
                put("title", c.title)
                put("targetAt", c.targetAt)
                put("location", c.location ?: "")
                put("displayFormat", c.displayFormat)
                put("tag", c.tag ?: "")
            })
        }
        root.put("countdowns", cdArr)

        return root.toString()
    }

    private fun loadCachedFeed(ctx: Context): WidgetFeed? {
        val raw = loadFeedCache(ctx) ?: return null
        return try {
            val root = JSONObject(raw)
            val postsArr = root.optJSONArray("posts") ?: JSONArray()
            val posts = (0 until postsArr.length()).map { i ->
                val obj = postsArr.getJSONObject(i)
                val img = obj.optString("wideImageUrl").takeIf { it.isNotBlank() }
                WidgetPost(
                    id = obj.optString("id"),
                    title = obj.optString("title"),
                    excerpt = obj.optString("excerpt"),
                    publishedAt = obj.optString("publishedAt"),
                    pinned = obj.optBoolean("pinned"),
                    pinnedUntil = obj.optString("pinnedUntil").takeIf { it.isNotBlank() },
                    tags = (0 until (obj.optJSONArray("tags")?.length() ?: 0)).map { j -> obj.getJSONArray("tags").getString(j) },
                    wideImageUrl = img,
                    hasMedia = obj.optBoolean("hasMedia", !img.isNullOrBlank()),
                    isAnimatedGif = obj.optBoolean("isAnimatedGif")
                )
            }

            val cdArr = root.optJSONArray("countdowns") ?: JSONArray()
            val countdowns = (0 until cdArr.length()).map { i ->
                val obj = cdArr.getJSONObject(i)
                WidgetCountdown(
                    id = obj.optString("id"),
                    title = obj.optString("title"),
                    targetAt = obj.optString("targetAt"),
                    location = obj.optString("location").takeIf { it.isNotBlank() },
                    displayFormat = obj.optString("displayFormat"),
                    tag = obj.optString("tag").takeIf { it.isNotBlank() }
                )
            }

            WidgetFeed(
                updatedAt = root.optString("updatedAt"),
                posts = posts,
                countdowns = countdowns
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error deserializing cached feed", e)
            null
        }
    }
}
