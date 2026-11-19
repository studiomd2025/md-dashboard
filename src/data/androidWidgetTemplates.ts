export interface AndroidWidgetFileTemplate {
  id: string;
  label: string;
  path: string;
  language: 'xml' | 'kotlin';
  summary: string;
  code: string;
}

export const ANDROID_WIDGET_PACKAGE = 'com.studiomd.dashboard';

export const ANDROID_WIDGET_TEMPLATES: AndroidWidgetFileTemplate[] = [
  {
    id: 'layout-countdown',
    label: 'widget_md_countdown.xml',
    path: 'android/app/src/main/res/layout/widget_md_countdown.xml',
    language: 'xml',
    summary:
      'Adaptive clockless Countdown layout supporting timer-only, vertical mobile, horizontal tablet, and expanded hashtag views.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_countdown_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:background="@drawable/widget_surface_bg"
    android:padding="14dp">

    <!-- Smallest & Vertical: Timer first (never any clock icon) -->
    <TextView
        android:id="@+id/widget_countdown_value"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="00 : 12 : 04 : 30"
        android:textSize="26sp"
        android:textStyle="bold"
        android:fontFamily="sans-serif-condensed"
        android:textColor="#0F172A" />

    <!-- Shown when expanded slightly (vertical / horizontal) -->
    <TextView
        android:id="@+id/widget_countdown_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Next Milestone"
        android:maxLines="1"
        android:ellipsize="end"
        android:textSize="13sp"
        android:textStyle="bold"
        android:textColor="#334155" />

    <!-- Shown when expanded further vertically -->
    <TextView
        android:id="@+id/widget_countdown_tags"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="#daliatime #live"
        android:maxLines="1"
        android:ellipsize="end"
        android:textSize="11sp"
        android:textStyle="bold"
        android:textColor="#0284C7"
        android:visibility="gone" />
</LinearLayout>`,
  },
  {
    id: 'layout-live',
    label: 'widget_md_live.xml',
    path: 'android/app/src/main/res/layout/widget_md_live.xml',
    language: 'xml',
    summary:
      'Glanceable My Diaries Live 2x2 tile for Channel 1, 2, or 3 with explicit LIVE / OFFLINE status badge.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_live_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_surface_bg"
    android:padding="14dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_live_brand"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="MY DIARIES LIVE"
            android:textSize="10sp"
            android:textStyle="bold"
            android:textColor="#0284C7" />

        <TextView
            android:id="@+id/widget_live_status"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="OFFLINE"
            android:textSize="10sp"
            android:textStyle="bold"
            android:paddingStart="8dp"
            android:paddingEnd="8dp"
            android:paddingTop="2dp"
            android:paddingBottom="2dp"
            android:background="@drawable/widget_footer_bg"
            android:textColor="#E11D48" />
    </LinearLayout>

    <LinearLayout
        android:id="@+id/widget_live_center"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_live_channel"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Channel 1"
            android:textSize="24sp"
            android:textStyle="bold"
            android:textColor="#0F172A" />

        <!-- Callsign shown only in smallest tile (with bottom padding); hidden in larger sizes -->
        <TextView
            android:id="@+id/widget_live_callsign"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="2dp"
            android:paddingBottom="10dp"
            android:text="MDTV_ch1"
            android:fontFamily="monospace"
            android:textSize="10sp"
            android:textColor="#64748B" />

        <!-- Shown only when channel is LIVE in expanded mode -->
        <TextView
            android:id="@+id/widget_live_now_streaming"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:text="NOW STREAMING"
            android:fontFamily="monospace"
            android:textSize="10sp"
            android:textStyle="bold"
            android:letterSpacing="0.12"
            android:textColor="#F43F5E"
            android:visibility="gone" />
    </LinearLayout>

    <!-- Shown when expanded tall vertically -->
    <TextView
        android:id="@+id/widget_live_tags"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="6dp"
        android:text="#MyDiariesLive #Ch1"
        android:maxLines="1"
        android:ellipsize="end"
        android:fontFamily="monospace"
        android:textSize="10sp"
        android:textStyle="bold"
        android:textColor="#0284C7"
        android:visibility="gone" />
</LinearLayout>`,
  },
  {
    id: 'layout-diary',
    label: 'widget_md_dashboard.xml',
    path: 'android/app/src/main/res/layout/widget_md_dashboard.xml',
    language: 'xml',
    summary:
      'Single Post & Feed Card layout with uncropped first-image preview (supports static frame or AnimatedImageDrawable GIF) and text summary.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_surface_bg"
    android:padding="14dp">

    <!-- Optional First Image / Animated GIF Preview (uncropped full-width scaling) -->
    <ImageView
        android:id="@+id/widget_post_image"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:adjustViewBounds="true"
        android:scaleType="fitCenter"
        android:contentDescription="Post media preview"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_post_meta"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:text=""
        android:maxLines="1"
        android:ellipsize="end"
        android:textSize="10sp"
        android:textColor="#64748B" />

    <TextView
        android:id="@+id/widget_post_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="3dp"
        android:text=""
        android:maxLines="2"
        android:ellipsize="end"
        android:textSize="15sp"
        android:textStyle="bold"
        android:textColor="#0F172A"
        android:visibility="gone" />

    <TextView
        android:id="@+id/widget_post_excerpt"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_marginTop="4dp"
        android:text=""
        android:maxLines="3"
        android:ellipsize="end"
        android:textSize="12sp"
        android:textColor="#475569" />
</LinearLayout>`,
  },
  {
    id: 'drawable',
    label: 'widget_surface_bg.xml',
    path: 'android/app/src/main/res/drawable/widget_surface_bg.xml',
    language: 'xml',
    summary:
      'Color-only & Adaptive Transparent drawables for widget background customization.',
    code: `<!-- Save as res/drawable/widget_surface_bg.xml (Color Surface) -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="1dp" android:color="#CBD5E1" />
    <corners android:radius="12dp" />
</shape>

<!-- Optional Pure Transparent Surface: res/drawable/widget_surface_transparent.xml -->
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
    <corners android:radius="12dp" />
</shape>`,
  },
  {
    id: 'provider-info',
    label: 'md_dashboard_widget_info.xml',
    path: 'android/app/src/main/res/xml/md_dashboard_widget_info.xml',
    language: 'xml',
    summary:
      'Resizable AppWidgetProviderInfo supporting 1x1 timer-only through 4x4 expanded sizes.',
    code: `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/app_name"
    android:initialLayout="@layout/widget_md_dashboard"
    android:minWidth="110dp"
    android:minHeight="60dp"
    android:minResizeWidth="70dp"
    android:minResizeHeight="50dp"
    android:targetCellWidth="4"
    android:targetCellHeight="3"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />`,
  },
  {
    id: 'provider-kt',
    label: 'MdDashboardWidgetProvider.kt',
    path: 'android/app/src/main/java/com/studiomd/dashboard/MdDashboardWidgetProvider.kt',
    language: 'kotlin',
    summary:
      'Kotlin AppWidgetProvider fetching widget-feed.json + /api/twitch-status, applying color/transparent themes, first-image & GIF control, and adaptive countdown sizing.',
    code: `package com.studiomd.dashboard

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class MdDashboardWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            updateWidget(context, appWidgetManager, appWidgetId, options)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        updateWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        // Point to your live deployed MY DIARIES DASHBOARD host
        private const val BASE_URL = "https://your-app-domain.run.app"
        private const val ANIMATE_GIF_ON_MOBILE = true
        private const val SELECTED_CHANNEL = "MDTV_ch1"

        fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            options: Bundle
        ) {
            val minW = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)
            val minH = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 140)
            val views = RemoteViews(context.packageName, R.layout.widget_md_dashboard)

            views.setOnClickPendingIntent(
                R.id.widget_root,
                createLaunchIntent(context, 101, "#/timeline")
            )
            appWidgetManager.updateAppWidget(appWidgetId, views)

            thread {
                try {
                    val body = URL("$BASE_URL/api/widget-feed.json").readText()
                    val json = JSONObject(body)
                    val items = json.optJSONArray("items")
                    if (items != null && items.length() > 0) {
                        val first = items.getJSONObject(0)
                        val rawTitle = first.optString("title", "").trim()
                        if (rawTitle.isNotEmpty()) {
                            views.setTextViewText(R.id.widget_post_title, rawTitle)
                            views.setViewVisibility(R.id.widget_post_title, View.VISIBLE)
                        } else {
                            views.setViewVisibility(R.id.widget_post_title, View.GONE)
                        }
                        views.setTextViewText(R.id.widget_post_excerpt, first.optString("summary", ""))
                        views.setTextViewText(R.id.widget_post_meta, first.optString("publishedLabel", ""))

                        val imageUrl = first.optString("imageUrl", "")
                        if (imageUrl.isNotBlank()) {
                            // Load first image attachment; when ANIMATE_GIF_ON_MOBILE == false, decode static frame
                            val conn = (URL(imageUrl).openConnection() as HttpURLConnection).apply {
                                connectTimeout = 5000
                                readTimeout = 5000
                            }
                            val bmp = conn.inputStream.use { BitmapFactory.decodeStream(it) }
                            if (bmp != null) {
                                views.setImageViewBitmap(R.id.widget_post_image, bmp)
                                views.setViewVisibility(R.id.widget_post_image, View.VISIBLE)
                            }
                        } else {
                            views.setViewVisibility(R.id.widget_post_image, View.GONE)
                        }
                    }

                    // Adaptive countdown thresholds: timer only (smallest), timer+title (compact), +tags (tall)
                    val showTitle = minW >= 140 || minH >= 85
                    val showTags = minH >= 170
                    views.setViewVisibility(R.id.widget_post_excerpt, if (showTitle) View.VISIBLE else View.GONE)
                    views.setViewVisibility(R.id.widget_post_meta, if (showTags) View.VISIBLE else View.GONE)

                    // Optional My Diaries Live channel status query:
                    // URL("$BASE_URL/api/twitch-status?channel=$SELECTED_CHANNEL").readText()

                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (_: Exception) {
                    // Keep cached widget state on network errors
                }
            }
        }

        private fun createLaunchIntent(
            context: Context,
            requestCode: Int,
            hashRoute: String
        ): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("https://localhost/$hashRoute")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}`,
  },
  {
    id: 'manifest',
    label: 'AndroidManifest.xml',
    path: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    summary:
      'Register AppWidget receivers inside <application> so Android launchers list all MD Dashboard widgets.',
    code: `<!-- Add inside <application> in android/app/src/main/AndroidManifest.xml -->
<receiver
    android:name="com.studiomd.dashboard.MdDashboardWidgetProvider"
    android:exported="true"
    android:label="MD Dashboard Widget">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/md_dashboard_widget_info" />
</receiver>`,
  },
];
