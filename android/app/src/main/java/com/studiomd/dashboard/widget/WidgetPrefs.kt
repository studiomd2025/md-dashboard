package com.studiomd.dashboard.widget

import android.content.Context
import android.content.SharedPreferences

/**
 * Per-widget and app-synced SharedPreferences storage.
 * Key convention: "<prefix>_<widgetId>"
 */
object WidgetPrefs {

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences("md_widget_prefs", Context.MODE_PRIVATE)

    // ── theme ────────────────────────────────────────────────────────────────

    fun saveTheme(ctx: Context, widgetId: Int, themeId: String) =
        prefs(ctx).edit().putString("theme_$widgetId", themeId).apply()

    fun loadTheme(ctx: Context, widgetId: Int): WidgetTheme =
        WidgetTheme.fromId(prefs(ctx).getString("theme_$widgetId", "white") ?: "white")

    // ── corner radius ────────────────────────────────────────────────────────

    fun saveCorner(ctx: Context, widgetId: Int, cornerId: String) =
        prefs(ctx).edit().putString("corner_$widgetId", cornerId).apply()

    fun loadCorner(ctx: Context, widgetId: Int): WidgetCorner =
        WidgetCorner.fromId(prefs(ctx).getString("corner_$widgetId", "crisp") ?: "crisp")

    // ── countdown widget ─────────────────────────────────────────────────────

    fun saveCountdownId(ctx: Context, widgetId: Int, countdownId: String) =
        prefs(ctx).edit().putString("cd_id_$widgetId", countdownId).apply()

    fun loadCountdownId(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("cd_id_$widgetId", "") ?: ""

    fun saveCountdownFormat(ctx: Context, widgetId: Int, format: String) =
        prefs(ctx).edit().putString("cd_format_$widgetId", format).apply()

    fun hasCountdownFormat(ctx: Context, widgetId: Int): Boolean =
        prefs(ctx).contains("cd_format_$widgetId")

    fun loadCountdownFormat(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("cd_format_$widgetId", "days-remaining") ?: "days-remaining"

    // App-synced active countdown selection (from Mobile Widget Studio)
    fun saveSelectedCountdownId(ctx: Context, countdownId: String) =
        prefs(ctx).edit().putString("app_selected_cd_id", countdownId).apply()

    fun loadSelectedCountdownId(ctx: Context): String =
        prefs(ctx).getString("app_selected_cd_id", "") ?: ""

    fun saveSelectedCountdownFormat(ctx: Context, format: String) =
        prefs(ctx).edit().putString("app_selected_cd_format", format).apply()

    fun loadSelectedCountdownFormat(ctx: Context): String =
        prefs(ctx).getString("app_selected_cd_format", "") ?: ""

    // ── single post widget ───────────────────────────────────────────────────

    fun saveSinglePostId(ctx: Context, widgetId: Int, postId: String) =
        prefs(ctx).edit().putString("single_post_id_$widgetId", postId).apply()

    fun loadSinglePostId(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("single_post_id_$widgetId", "") ?: ""

    fun saveAnimateGif(ctx: Context, widgetId: Int, animate: Boolean) =
        prefs(ctx).edit().putBoolean("animate_gif_$widgetId", animate).apply()

    fun loadAnimateGif(ctx: Context, widgetId: Int): Boolean =
        prefs(ctx).getBoolean("animate_gif_$widgetId", true)

    // ── live tile widget ─────────────────────────────────────────────────────

    fun saveLiveChannel(ctx: Context, widgetId: Int, channel: Int) =
        prefs(ctx).edit().putInt("live_ch_$widgetId", channel).apply()

    fun loadLiveChannel(ctx: Context, widgetId: Int): Int =
        prefs(ctx).getInt("live_ch_$widgetId", 1).coerceIn(1, 3)

    // ── feed card widget ─────────────────────────────────────────────────────

    fun saveFeedLayoutStyle(ctx: Context, widgetId: Int, style: String) =
        prefs(ctx).edit().putString("feed_layout_$widgetId", style).apply()

    fun loadFeedLayoutStyle(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("feed_layout_$widgetId", "full") ?: "full"

    fun saveFeedMaxPosts(ctx: Context, widgetId: Int, max: Int) =
        prefs(ctx).edit().putInt("feed_max_$widgetId", max).apply()

    fun loadFeedMaxPosts(ctx: Context, widgetId: Int): Int =
        prefs(ctx).getInt("feed_max_$widgetId", 3).coerceIn(1, 6)

    fun saveFeedFilter(ctx: Context, widgetId: Int, filter: String) =
        prefs(ctx).edit().putString("feed_filter_$widgetId", filter).apply()

    fun loadFeedFilter(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("feed_filter_$widgetId", "all") ?: "all"

    fun saveFeedTag(ctx: Context, widgetId: Int, tag: String) =
        prefs(ctx).edit().putString("feed_tag_$widgetId", tag).apply()

    fun loadFeedTag(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("feed_tag_$widgetId", "") ?: ""

    fun saveFeedDateFrom(ctx: Context, widgetId: Int, from: String) =
        prefs(ctx).edit().putString("feed_date_from_$widgetId", from).apply()

    fun loadFeedDateFrom(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("feed_date_from_$widgetId", "") ?: ""

    fun saveFeedDateTo(ctx: Context, widgetId: Int, to: String) =
        prefs(ctx).edit().putString("feed_date_to_$widgetId", to).apply()

    fun loadFeedDateTo(ctx: Context, widgetId: Int): String =
        prefs(ctx).getString("feed_date_to_$widgetId", "") ?: ""

    // ── cleanup on widget removal ─────────────────────────────────────────────

    fun removeWidget(ctx: Context, widgetId: Int) {
        prefs(ctx).edit().apply {
            remove("theme_$widgetId")
            remove("corner_$widgetId")
            remove("cd_id_$widgetId")
            remove("cd_format_$widgetId")
            remove("single_post_id_$widgetId")
            remove("animate_gif_$widgetId")
            remove("live_ch_$widgetId")
            remove("feed_layout_$widgetId")
            remove("feed_max_$widgetId")
            remove("feed_filter_$widgetId")
            remove("feed_tag_$widgetId")
            remove("feed_date_from_$widgetId")
            remove("feed_date_to_$widgetId")
            apply()
        }
    }
}
