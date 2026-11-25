package com.studiomd.dashboard.widget

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object MdNotificationManager {

    private const val TAG = "MdNotificationManager"
    const val CHANNEL_ID = "md_dashboard_alerts"
    private const val CHANNEL_NAME = "MD Dashboard Alerts"
    private const val PREFS_NAME = "md_notifications_prefs"
    private const val KEY_NOTIFIED = "notified_keys"
    private const val KEY_KNOWN_SCHEDULED = "known_scheduled_keys"
    private const val KEY_KNOWN_COUNTDOWNS = "known_countdown_keys"
    private const val KEY_BLOGGER_BASELINE = "blogger_baseline_set"
    private const val KEY_BLOGGER_LAST_MS = "blogger_last_published_ms"

    private const val BLOGGER_FEED_URL =
        "https://officialmdmemo.blogspot.com/feeds/posts/default?alt=json&max-results=5"

    private const val POLL_INTERVAL_MS = 15L * 60_000L
    private const val RECENT_CATCHUP_WINDOW_MS = 48L * 3600_000L

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Scheduled posts, countdown target dates, and MD Memo updates"
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    fun hasNotificationPermission(ctx: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }
        }
        return NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    fun schedulePeriodicChecks(ctx: Context) {
        try {
            ensureChannel(ctx)
            val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val pi = PendingIntent.getBroadcast(
                ctx,
                91_001,
                Intent(ctx, MdNotificationReceiver::class.java).apply {
                    action = MdNotificationReceiver.ACTION_POLL
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + POLL_INTERVAL_MS,
                POLL_INTERVAL_MS,
                pi
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule periodic notification checks", e)
        }
    }

    fun scheduleNextWakeup(ctx: Context, triggerAtMs: Long) {
        try {
            val nowMs = System.currentTimeMillis()
            if (triggerAtMs <= nowMs) return
            val alarmManager = ctx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val pi = PendingIntent.getBroadcast(
                ctx,
                91_002,
                Intent(ctx, MdNotificationReceiver::class.java).apply {
                    action = MdNotificationReceiver.ACTION_WAKEUP_CHECK
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs + 2000L, pi)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs + 2000L, pi)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule wakeup check", e)
        }
    }

    fun notifyDirectly(
        ctx: Context,
        key: String,
        title: String,
        body: String,
        url: String,
        openExternal: Boolean = false
    ): Boolean {
        val sp = prefs(ctx)
        val notified = sp.getStringSet(KEY_NOTIFIED, emptySet())?.toMutableSet() ?: mutableSetOf()
        if (notified.contains(key)) return false

        val shown = showSystemNotification(ctx, key.hashCode(), title, body, url, openExternal)
        notified.add(key)
        sp.edit().putStringSet(KEY_NOTIFIED, notified).apply()
        return shown
    }

    suspend fun checkAllAndNotify(ctx: Context) = withContext(Dispatchers.IO) {
        ensureChannel(ctx)
        val nowMs = System.currentTimeMillis()
        val sp = prefs(ctx)
        val notified = sp.getStringSet(KEY_NOTIFIED, emptySet())?.toMutableSet() ?: mutableSetOf()
        val knownScheduled = sp.getStringSet(KEY_KNOWN_SCHEDULED, emptySet())?.toMutableSet() ?: mutableSetOf()
        val knownCountdowns = sp.getStringSet(KEY_KNOWN_COUNTDOWNS, emptySet())?.toMutableSet() ?: mutableSetOf()
        var earliestFutureWakeupMs: Long? = null

        val trackWakeup: (Long) -> Unit = { futureMs ->
            if (futureMs > nowMs && (earliestFutureWakeupMs == null || futureMs < earliestFutureWakeupMs!!)) {
                earliestFutureWakeupMs = futureMs
            }
        }

        // 1. Check Firestore Scheduled Posts & Countdowns
        try {
            val feed = WidgetApiClient.fetchFeed(ctx)
            if (feed != null) {
                // a) Scheduled posts when due
                for (post in feed.scheduledPosts) {
                    val schedStr = post.scheduledFor ?: continue
                    val schedMs = WidgetTimeHelper.parseIsoMillis(schedStr) ?: continue
                    val key = "post:${post.id}:$schedStr"
                    if (schedMs <= nowMs) {
                        val withinWindow = (nowMs - schedMs) <= RECENT_CATCHUP_WINDOW_MS
                        if (!notified.contains(key) && (withinWindow || knownScheduled.contains(key))) {
                            val cleanTitle = post.title.trim()
                            val body = when {
                                cleanTitle.isNotEmpty() && !cleanTitle.equals("Diary Entry", ignoreCase = true) -> cleanTitle
                                post.excerpt.isNotBlank() -> post.excerpt.take(110)
                                else -> "A scheduled post is now live."
                            }
                            showSystemNotification(
                                ctx,
                                key.hashCode(),
                                "Scheduled Post Published",
                                body,
                                "https://localhost/?post=${post.id}",
                                openExternal = false
                            )
                            notified.add(key)
                        }
                        knownScheduled.remove(key)
                    } else {
                        knownScheduled.add(key)
                        trackWakeup(schedMs)
                    }
                }

                // b) Countdown target date reached — ONLY Event Title and date
                for (cd in feed.countdowns) {
                    val targetMs = WidgetTimeHelper.parseIsoMillis(cd.targetAt) ?: continue
                    val key = "cd:${cd.id}:${cd.targetAt}"
                    if (targetMs <= nowMs) {
                        val withinWindow = (nowMs - targetMs) <= RECENT_CATCHUP_WINDOW_MS
                        if (!notified.contains(key) && (withinWindow || knownCountdowns.contains(key))) {
                            val dateOnly = WidgetTimeHelper.formatDate(cd.targetAt, cd.timeZone)
                            showSystemNotification(
                                ctx,
                                key.hashCode(),
                                cd.title,
                                dateOnly,
                                "https://localhost/#/?countdown=${cd.id}",
                                openExternal = false
                            )
                            notified.add(key)
                        }
                        knownCountdowns.remove(key)
                    } else {
                        knownCountdowns.add(key)
                        trackWakeup(targetMs)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Firestore posts/countdowns for notifications", e)
        }

        // 2. Check https://officialmdmemo.blogspot.com Blogger feed
        try {
            checkBloggerFeed(ctx, sp, notified)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Blogger feed", e)
        }

        sp.edit()
            .putStringSet(KEY_NOTIFIED, notified)
            .putStringSet(KEY_KNOWN_SCHEDULED, knownScheduled)
            .putStringSet(KEY_KNOWN_COUNTDOWNS, knownCountdowns)
            .apply()

        earliestFutureWakeupMs?.let { scheduleNextWakeup(ctx, it) }
    }

    private fun checkBloggerFeed(
        ctx: Context,
        sp: SharedPreferences,
        notified: MutableSet<String>
    ) {
        val conn = (URL(BLOGGER_FEED_URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10000
            readTimeout = 10000
            instanceFollowRedirects = true
        }
        val raw = try {
            if (conn.responseCode !in 200..299) return
            conn.inputStream.use { it.bufferedReader().readText() }
        } finally {
            conn.disconnect()
        }

        val root = JSONObject(raw)
        val feed = root.optJSONObject("feed") ?: return
        val entries = feed.optJSONArray("entry") ?: return

        data class BlogEntry(val id: String, val title: String, val publishedMs: Long, val url: String)

        val parsed = (0 until entries.length()).mapNotNull { i ->
            val obj = entries.optJSONObject(i) ?: return@mapNotNull null
            val id = obj.optJSONObject("id")?.optString("\$t").orEmpty().trim()
            if (id.isEmpty()) return@mapNotNull null
            val title = obj.optJSONObject("title")?.optString("\$t").orEmpty().trim()
            val pubStr = obj.optJSONObject("published")?.optString("\$t").orEmpty().trim()
            val pubMs = WidgetTimeHelper.parseIsoMillis(pubStr) ?: 0L
            var linkUrl = "https://officialmdmemo.blogspot.com"
            val links = obj.optJSONArray("link")
            if (links != null) {
                for (j in 0 until links.length()) {
                    val lObj = links.optJSONObject(j) ?: continue
                    if (lObj.optString("rel") == "alternate") {
                        val href = lObj.optString("href").trim()
                        if (href.isNotEmpty()) {
                            linkUrl = href
                            break
                        }
                    }
                }
            }
            BlogEntry(id, title, pubMs, linkUrl)
        }.sortedBy { it.publishedMs }

        if (parsed.isEmpty()) return

        val baselineSet = sp.getBoolean(KEY_BLOGGER_BASELINE, false)
        var lastPublishedMs = sp.getLong(KEY_BLOGGER_LAST_MS, 0L)

        if (!baselineSet) {
            parsed.forEach { entry ->
                notified.add("blog:${entry.id}")
                if (entry.publishedMs > lastPublishedMs) lastPublishedMs = entry.publishedMs
            }
            sp.edit()
                .putBoolean(KEY_BLOGGER_BASELINE, true)
                .putLong(KEY_BLOGGER_LAST_MS, lastPublishedMs)
                .apply()
            return
        }

        for (entry in parsed) {
            val key = "blog:${entry.id}"
            if (!notified.contains(key) && (entry.publishedMs == 0L || entry.publishedMs > lastPublishedMs)) {
                showSystemNotification(
                    ctx,
                    key.hashCode(),
                    "New on MD Memo",
                    entry.title.ifBlank { "New blog post published" },
                    entry.url,
                    openExternal = true
                )
                notified.add(key)
                if (entry.publishedMs > lastPublishedMs) {
                    lastPublishedMs = entry.publishedMs
                }
            }
        }
        sp.edit().putLong(KEY_BLOGGER_LAST_MS, lastPublishedMs).apply()
    }

    private fun showSystemNotification(
        ctx: Context,
        notificationId: Int,
        title: String,
        body: String,
        url: String,
        openExternal: Boolean
    ): Boolean {
        ensureChannel(ctx)
        if (!hasNotificationPermission(ctx)) return false

        val intent = if (openExternal) {
            Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        } else {
            Intent(ctx, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse(url)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        }

        val pi = PendingIntent.getActivity(
            ctx,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pi)
            .build()

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                return false
            }
            NotificationManagerCompat.from(ctx).notify(notificationId, notification)
            true
        } catch (se: SecurityException) {
            Log.w(TAG, "Missing POST_NOTIFICATIONS permission", se)
            false
        }
    }
}
