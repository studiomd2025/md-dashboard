package com.studiomd.dashboard

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL

data class WidgetContent(
    val latestPostTitle: String,
    val pinnedPostTitle: String,
    val countdownText: String
)

object WidgetDataFetcher {
    suspend fun fetchData(): WidgetContent = withContext(Dispatchers.IO) {
        try {
            val response = URL("https://mddashboard.onrender.com/api/widget-feed.json").readText()
            val json = JSONObject(response)

            val latest = json.optJSONObject("latestPost")
            val pinned = json.optJSONObject("pinnedPost")
            val countdown = json.optJSONObject("countdown")

            WidgetContent(
                latestPostTitle = latest?.optString("title") ?: "No latest posts",
                pinnedPostTitle = pinned?.optString("title") ?: "No pinned posts",
                countdownText = countdown?.optString("timeLeft") ?: "Active"
            )
        } catch (e: Exception) {
            WidgetContent(
                latestPostTitle = "Failed to load",
                pinnedPostTitle = "Check connection",
                countdownText = "--:--"
            )
        }
    }
}