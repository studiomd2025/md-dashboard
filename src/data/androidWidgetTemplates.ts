// Android Studio starter widget templates (com.studiomd.dashboard)
export const ANDROID_WIDGET_PACKAGE = 'com.studiomd.dashboard';

export interface AndroidWidgetTemplate {
  id: string;
  label: string;
  path: string;
  summary: string;
  code: string;
}

export const ANDROID_WIDGET_TEMPLATES: AndroidWidgetTemplate[] = [
  {
    id: 'countdown-xml',
    label: 'widget_md_countdown.xml',
    path: 'android/app/src/main/res/layout/widget_md_countdown.xml',
    summary: 'Clockless MD Countdown layout with single-line timer protection and responsive tag footer',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_countdown_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_surface_bg"
    android:gravity="center"
    android:orientation="vertical"
    android:padding="14dp">

    <TextView
        android:id="@+id/widget_countdown_timer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:gravity="center"
        android:maxLines="1"
        android:text="D-00"
        android:textColor="@color/widget_ink_primary"
        android:textSize="26sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/widget_countdown_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:ellipsize="end"
        android:gravity="center"
        android:maxLines="1"
        android:text="Upcoming Event"
        android:textColor="@color/widget_ink_secondary"
        android:textSize="13sp"
        android:textStyle="bold" />

    <ImageView
        android:id="@+id/widget_countdown_divider"
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="8dp"
        android:layout_marginBottom="6dp"
        android:background="@drawable/widget_divider"
        android:contentDescription="@null" />

    <TextView
        android:id="@+id/widget_countdown_tags"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:gravity="center"
        android:maxLines="1"
        android:text="#StudioLaunch2026"
        android:textColor="@color/widget_ink_muted"
        android:textSize="11sp" />

</LinearLayout>
`,
  },
  {
    id: 'live-xml',
    label: 'widget_md_live.xml',
    path: 'android/app/src/main/res/layout/widget_md_live.xml',
    summary: 'MD LIVE adaptive station widget layout with live badge, callsign, and #/live deep link',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_live_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_surface_bg"
    android:orientation="vertical"
    android:padding="14dp">

    <LinearLayout
        android:id="@+id/widget_live_header"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_live_brand"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="MD LIVE"
            android:textColor="@color/widget_ink_primary"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_live_badge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_live_badge_offline"
            android:paddingLeft="8dp"
            android:paddingTop="2dp"
            android:paddingRight="8dp"
            android:paddingBottom="2dp"
            android:text="OFFLINE"
            android:textColor="#FFFFFF"
            android:textSize="10sp"
            android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:gravity="center_vertical"
        android:orientation="vertical">

        <TextView
            android:id="@+id/widget_live_channel"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Channel 1"
            android:textColor="@color/widget_ink_primary"
            android:textSize="18sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_live_callsign"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="2dp"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="MDTV_ch1"
            android:textColor="@color/widget_ink_secondary"
            android:textSize="12sp" />

        <TextView
            android:id="@+id/widget_live_status_line"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="6dp"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Off Air · Standby"
            android:textColor="@color/widget_ink_muted"
            android:textSize="11sp" />

        <TextView
            android:id="@+id/widget_live_tags"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="6dp"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="#MyDiariesLive #Ch1"
            android:textColor="@color/widget_ink_muted"
            android:textSize="10sp"
            android:visibility="gone" />
    </LinearLayout>

    <TextView
        android:id="@+id/widget_live_footer"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:gravity="end"
        android:maxLines="1"
        android:text="Open Station ↗"
        android:textColor="@color/widget_accent"
        android:textSize="11sp"
        android:textStyle="bold" />

</LinearLayout>
`,
  },
  {
    id: 'dashboard-xml',
    label: 'widget_md_dashboard.xml',
    path: 'android/app/src/main/res/layout/widget_md_dashboard.xml',
    summary: 'Auto-responsive Single Post layout with uncropped fitCenter media and Open ↗ deep link',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_surface_bg"
    android:orientation="vertical"
    android:padding="14dp">

    <ImageView
        android:id="@+id/widget_post_image"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="8dp"
        android:adjustViewBounds="true"
        android:contentDescription="Diary media"
        android:maxHeight="140dp"
        android:scaleType="fitCenter"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_post_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:ellipsize="end"
        android:maxLines="2"
        android:textColor="@color/widget_ink_primary"
        android:textSize="15sp"
        android:textStyle="bold"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_post_meta"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:ellipsize="end"
        android:maxLines="1"
        android:text="2026.11.21"
        android:textColor="@color/widget_ink_muted"
        android:textSize="11sp" />

    <TextView
        android:id="@+id/widget_post_excerpt"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="6dp"
        android:layout_weight="1"
        android:ellipsize="end"
        android:maxLines="4"
        android:text="Loading diary post..."
        android:textColor="@color/widget_ink_secondary"
        android:textSize="12sp" />

    <TextView
        android:id="@+id/widget_open_cta"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:gravity="end"
        android:maxLines="1"
        android:text="Open ↗"
        android:textColor="@color/widget_accent"
        android:textSize="11sp"
        android:textStyle="bold" />

</LinearLayout>
`,
  },
  {
    id: 'drawable',
    label: 'widget_surface_bg.xml',
    path: 'android/app/src/main/res/drawable/widget_surface_bg.xml',
    summary: 'Color surface shape + separated transparent zero-border surface XML (matches corner radius slider)',
    code: `<!-- Save as res/drawable/widget_surface_bg.xml (Color Surface) -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <corners android:radius="12dp" />
    <stroke
        android:width="1dp"
        android:color="#1A0F172A" />
</shape>

<!-- Optional Pure Transparent Surface: res/drawable/widget_surface_transparent.xml -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
    <corners android:radius="12dp" />
</shape>
`,
  },
  {
    id: 'provider-info',
    label: 'md_dashboard_widget_info.xml',
    path: 'android/app/src/main/res/xml/md_dashboard_widget_info.xml',
    summary: 'Reconfigurable AppWidgetProviderInfo enabling long-press Settings on Samsung One UI / Android',
    code: `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:configure="com.studiomd.dashboard.WidgetConfigActivity"
    android:description="@string/widget_single_post_description"
    android:initialLayout="@layout/widget_md_dashboard"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen"
    android:widgetFeatures="reconfigurable" />
`,
  },
  {
    id: 'provider-kt',
    label: 'MdDashboardWidgetProvider.kt',
    path: 'android/app/src/main/java/com/studiomd/dashboard/MdDashboardWidgetProvider.kt',
    summary: 'Starter Kotlin provider reading /api/widget-feed.json (no Diary Entry fallback, yyyy.m.d, ?post= deep link)',
    code: `package com.studiomd.dashboard

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import kotlin.concurrent.thread

class MdDashboardWidgetProvider : AppWidgetProvider() {

    companion object {
        const val BASE_URL = "https://ais-pre-jlyggj2es4wxdx5r36t72p-456241029780.asia-northeast1.run.app"
        private const val TAG = "MDWidget"

        fun formatYmdDate(iso: String?): String {
            if (iso.isNullOrBlank()) return ""
            return try {
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                val date = parser.parse(iso.take(19)) ?: return iso.take(10)
                val out = SimpleDateFormat("yyyy.M.d", Locale.getDefault())
                out.format(date)
            } catch (_: Exception) {
                iso.take(10).replace("-", ".")
            }
        }

        fun applyTransparentTheme(context: Context, views: RemoteViews, isTransparent: Boolean) {
            if (!isTransparent) return
            val nightModeFlags =
                context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            val isNight = nightModeFlags == Configuration.UI_MODE_NIGHT_YES
            val primaryInk = if (isNight) Color.WHITE else Color.parseColor("#0F172A")
            val secondaryInk = if (isNight) Color.parseColor("#E2E8F0") else Color.parseColor("#334155")
            val mutedInk = if (isNight) Color.parseColor("#CBD5E1") else Color.parseColor("#475569")

            views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_surface_transparent)
            views.setTextColor(R.id.widget_post_title, primaryInk)
            views.setTextColor(R.id.widget_post_excerpt, secondaryInk)
            views.setTextColor(R.id.widget_post_meta, mutedInk)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val baseViews = RemoteViews(context.packageName, R.layout.widget_md_dashboard)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, baseViews)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to push initial widget view", e)
        }

        thread {
            try {
                val conn = (URL("\${BASE_URL}/api/widget-feed.json").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 8000
                }
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val root = JSONObject(body)
                val items = root.optJSONArray("items")
                val first = if (items != null && items.length() > 0) items.getJSONObject(0) else null

                val views = RemoteViews(context.packageName, R.layout.widget_md_dashboard)
                if (first != null) {
                    val postId = first.optString("id", "")
                    val rawTitle = first.optString("title", "").trim()
                    val title = if (rawTitle.equals("Diary Entry", ignoreCase = true)) "" else rawTitle
                    val excerpt = first.optString("excerpt", "").trim()
                    val ymd = formatYmdDate(first.optString("publishedAt", ""))

                    if (title.isNotEmpty()) {
                        views.setViewVisibility(R.id.widget_post_title, View.VISIBLE)
                        views.setTextViewText(R.id.widget_post_title, title)
                    } else {
                        views.setViewVisibility(R.id.widget_post_title, View.GONE)
                    }

                    views.setTextViewText(R.id.widget_post_meta, ymd)
                    views.setTextViewText(
                        R.id.widget_post_excerpt,
                        if (excerpt.isNotEmpty()) excerpt else "Tap to open post"
                    )

                    val deepLink = if (postId.isNotEmpty()) {
                        "\${BASE_URL}/?post=\$postId"
                    } else {
                        BASE_URL
                    }
                    val intent = Intent(context, MainActivity::class.java).apply {
                        action = Intent.ACTION_VIEW
                        data = Uri.parse(deepLink)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val pendingIntent = PendingIntent.getActivity(
                        context,
                        appWidgetId,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
                }
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                Log.e(TAG, "Widget feed refresh failed", e)
            }
        }
    }
}
`,
  },
  {
    id: 'manifest',
    label: 'AndroidManifest.xml (Snippet)',
    path: 'android/app/src/main/AndroidManifest.xml',
    summary: 'Required INTERNET permission, Config Activity, Reconfigurable Receivers, and BIND_REMOTEVIEWS Service',
    code: `<!-- Ensure INTERNET permission is outside <application> -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Inside <application> -->
<activity
    android:name=".WidgetConfigActivity"
    android:exported="true"
    android:theme="@style/AppTheme">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_CONFIGURE" />
    </intent-filter>
</activity>

<receiver
    android:name=".widget.MdDashboardWidgetProvider"
    android:exported="true"
    android:label="MD Single Post">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/md_dashboard_widget_info" />
</receiver>

<!-- Required for scrollable ListView widgets (MD Feed Card) -->
<service
    android:name=".widget.WidgetFeedService"
    android:exported="false"
    android:permission="android.permission.BIND_REMOTEVIEWS" />
`,
  },
];
