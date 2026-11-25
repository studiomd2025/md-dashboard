package com.studiomd.dashboard.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.studiomd.dashboard.MainActivity
import com.studiomd.dashboard.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.max
import kotlin.math.roundToInt
import kotlin.math.sqrt

class MdSinglePostWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { id -> update(ctx, mgr, id, mgr.getAppWidgetOptions(id)) }
    }

    override fun onAppWidgetOptionsChanged(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
        update(ctx, mgr, id, opts)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        ids.forEach { WidgetPrefs.removeWidget(ctx, it) }
    }

    companion object {
        private const val TAG = "MdSinglePostWidget"
        private const val MAX_WIDGET_IMAGE_DIM_PX = 720
        private const val MAX_WIDGET_BITMAP_BYTES = 1_400_000

        /**
         * Downloads and downsamples a remote image so the decoded Bitmap safely fits within
         * Android RemoteViews bitmap memory limits and Binder IPC transaction budgets.
         */
        fun loadScaledWidgetBitmap(
            urlStr: String,
            maxWidthPx: Int = MAX_WIDGET_IMAGE_DIM_PX,
            maxHeightPx: Int = MAX_WIDGET_IMAGE_DIM_PX,
            maxBytes: Int = MAX_WIDGET_BITMAP_BYTES,
            connectTimeoutMs: Int = 8000,
            readTimeoutMs: Int = 10000
        ): Bitmap? {
            var conn: HttpURLConnection? = null
            return try {
                conn = (URL(urlStr).openConnection() as HttpURLConnection).apply {
                    connectTimeout = connectTimeoutMs
                    readTimeout = readTimeoutMs
                    instanceFollowRedirects = true
                }
                if (conn.responseCode !in 200..299) {
                    Log.w(TAG, "Image HTTP ${conn.responseCode} for $urlStr")
                    return null
                }
                val bytes = conn.inputStream.use { it.readBytes() }
                if (bytes.isEmpty()) return null

                val boundsOpts = BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, boundsOpts)
                val srcW = boundsOpts.outWidth
                val srcH = boundsOpts.outHeight
                if (srcW <= 0 || srcH <= 0) return null

                var sampleSize = 1
                while (
                    (srcW / sampleSize) > maxWidthPx * 2 ||
                    (srcH / sampleSize) > maxHeightPx * 2
                ) {
                    sampleSize *= 2
                }

                val decodeOpts = BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                var bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOpts)
                    ?: return null

                if (bmp.width > maxWidthPx || bmp.height > maxHeightPx) {
                    val scale = minOf(
                        maxWidthPx.toFloat() / bmp.width.toFloat(),
                        maxHeightPx.toFloat() / bmp.height.toFloat()
                    )
                    val dstW = max(1, (bmp.width * scale).roundToInt())
                    val dstH = max(1, (bmp.height * scale).roundToInt())
                    val scaled = Bitmap.createScaledBitmap(bmp, dstW, dstH, true)
                    if (scaled != bmp) {
                        bmp.recycle()
                        bmp = scaled
                    }
                }

                // Final safety clamp on uncompressed byte size for RemoteViews Binder/memory limits
                val byteCount = bmp.allocationByteCount
                if (byteCount > maxBytes && bmp.width > 1 && bmp.height > 1) {
                    val ratio = sqrt(maxBytes.toDouble() / byteCount.toDouble())
                    val dstW = max(1, (bmp.width * ratio).roundToInt())
                    val dstH = max(1, (bmp.height * ratio).roundToInt())
                    val clamped = Bitmap.createScaledBitmap(bmp, dstW, dstH, true)
                    if (clamped != bmp) {
                        bmp.recycle()
                        bmp = clamped
                    }
                }

                bmp
            } catch (e: OutOfMemoryError) {
                Log.e(TAG, "OOM decoding widget bitmap for $urlStr", e)
                null
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching/decoding widget bitmap for $urlStr", e)
                null
            } finally {
                conn?.disconnect()
            }
        }

        private fun buildBaseViews(
            ctx: Context,
            id: Int,
            opts: Bundle,
            theme: WidgetTheme,
            corner: WidgetCorner
        ): RemoteViews {
            val minH = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 140)
            val views = RemoteViews(ctx.packageName, R.layout.widget_single_post)

            val surfaceRes = WidgetTheme.getSurfaceDrawable(theme, corner)
            views.setViewVisibility(R.id.widget_single_post_bg, View.VISIBLE)
            views.setInt(R.id.widget_single_post_bg, "setImageResource", surfaceRes)
            if (theme.isTransparent) {
                views.setInt(R.id.widget_single_post_bg, "setColorFilter", 0)
            } else {
                views.setInt(R.id.widget_single_post_bg, "setColorFilter", Color.parseColor(theme.bgHex))
            }

            val inkColor = WidgetTheme.getInkColor(ctx, theme)
            val subColor = WidgetTheme.getSubColor(ctx, theme)
            val accentColor = WidgetTheme.getAccentColor(ctx, theme)

            views.setTextColor(R.id.widget_single_post_title, inkColor)
            views.setTextColor(R.id.widget_single_post_timestamp, subColor)
            views.setTextColor(R.id.widget_single_post_caption, inkColor)
            views.setTextColor(R.id.widget_single_post_open, accentColor)
            views.setTextColor(R.id.widget_single_post_placeholder_text, subColor)

            views.setInt(R.id.widget_single_post_caption, "setMaxLines", if (minH < 150) 1 else 3)

            val fallbackPi = PendingIntent.getActivity(
                ctx,
                id + 55_000,
                Intent(ctx, MainActivity::class.java).apply {
                    action = Intent.ACTION_VIEW
                    data = Uri.parse("https://localhost/#/timeline")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_single_post_root, fallbackPi)
            views.setOnClickPendingIntent(R.id.widget_single_post_open, fallbackPi)

            return views
        }

        private fun showPlaceholder(views: RemoteViews, message: String) {
            views.setViewVisibility(R.id.widget_single_post_image, View.GONE)
            views.setViewVisibility(R.id.widget_single_post_image_placeholder, View.VISIBLE)
            views.setTextViewText(R.id.widget_single_post_placeholder_text, message)
        }

        fun update(ctx: Context, mgr: AppWidgetManager, id: Int, opts: Bundle) {
            try {
                val theme = WidgetPrefs.loadTheme(ctx, id)
                val corner = WidgetPrefs.loadCorner(ctx, id)
                val postId = WidgetPrefs.loadSinglePostId(ctx, id)

                val initialViews = buildBaseViews(ctx, id, opts, theme, corner)
                initialViews.setViewVisibility(R.id.widget_single_post_title, View.GONE)
                initialViews.setTextViewText(R.id.widget_single_post_timestamp, "")
                initialViews.setTextViewText(
                    R.id.widget_single_post_caption,
                    ctx.getString(R.string.widget_loading)
                )
                showPlaceholder(initialViews, "Loading post…")
                mgr.updateAppWidget(id, initialViews)

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val feed = WidgetApiClient.fetchFeed(ctx)
                        val posts = feed?.posts ?: emptyList()
                        val post = if (postId.isNotEmpty()) {
                            posts.firstOrNull { it.id == postId } ?: posts.firstOrNull()
                        } else {
                            posts.firstOrNull()
                        }

                        val textViews = buildBaseViews(ctx, id, opts, theme, corner)

                        if (post != null) {
                            val targetPostId = post.id
                            val pi = PendingIntent.getActivity(
                                ctx,
                                id + 55_000,
                                Intent(ctx, MainActivity::class.java).apply {
                                    action = Intent.ACTION_VIEW
                                    data = Uri.parse("https://localhost/?post=$targetPostId")
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                                },
                                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                            )
                            textViews.setOnClickPendingIntent(R.id.widget_single_post_root, pi)
                            textViews.setOnClickPendingIntent(R.id.widget_single_post_open, pi)

                            val cleanTitle = post.title.trim()
                            val hasTitle = cleanTitle.isNotEmpty() && !cleanTitle.equals("Diary Entry", ignoreCase = true)
                            if (hasTitle) {
                                textViews.setTextViewText(R.id.widget_single_post_title, cleanTitle)
                                textViews.setViewVisibility(R.id.widget_single_post_title, View.VISIBLE)
                            } else {
                                textViews.setViewVisibility(R.id.widget_single_post_title, View.GONE)
                            }

                            val dateFormatted = WidgetTimeHelper.formatDate(post.publishedAt)
                            val tagStr = if (post.tags.isNotEmpty()) {
                                " · " + post.tags.take(2).joinToString(" ") { if (it.startsWith("#")) it else "#$it" }
                            } else ""
                            textViews.setTextViewText(R.id.widget_single_post_timestamp, "$dateFormatted$tagStr")

                            val captionText = post.excerpt.ifBlank {
                                if (hasTitle) cleanTitle else "View post"
                            }
                            textViews.setTextViewText(R.id.widget_single_post_caption, captionText)

                            val imageUrl = post.wideImageUrl?.takeIf { it.isNotBlank() && it != "null" }
                            if (imageUrl != null) {
                                // Push text + loading placeholder immediately before fetching the image
                                showPlaceholder(textViews, "Loading image…")
                                mgr.updateAppWidget(id, textViews)

                                val bmp = loadScaledWidgetBitmap(imageUrl)
                                val mediaViews = buildBaseViews(ctx, id, opts, theme, corner).apply {
                                    setOnClickPendingIntent(R.id.widget_single_post_root, pi)
                                    setOnClickPendingIntent(R.id.widget_single_post_open, pi)
                                    if (hasTitle) {
                                        setTextViewText(R.id.widget_single_post_title, cleanTitle)
                                        setViewVisibility(R.id.widget_single_post_title, View.VISIBLE)
                                    } else {
                                        setViewVisibility(R.id.widget_single_post_title, View.GONE)
                                    }
                                    setTextViewText(R.id.widget_single_post_timestamp, "$dateFormatted$tagStr")
                                    setTextViewText(R.id.widget_single_post_caption, captionText)
                                }

                                if (bmp != null) {
                                    mediaViews.setViewVisibility(R.id.widget_single_post_image_placeholder, View.GONE)
                                    mediaViews.setImageViewBitmap(R.id.widget_single_post_image, bmp)
                                    mediaViews.setViewVisibility(R.id.widget_single_post_image, View.VISIBLE)
                                    try {
                                        mgr.updateAppWidget(id, mediaViews)
                                    } catch (e: Exception) {
                                        Log.e(TAG, "RemoteViews rejected bitmap for post $targetPostId, falling back", e)
                                        val fallbackViews = buildBaseViews(ctx, id, opts, theme, corner).apply {
                                            setOnClickPendingIntent(R.id.widget_single_post_root, pi)
                                            setOnClickPendingIntent(R.id.widget_single_post_open, pi)
                                            if (hasTitle) {
                                                setTextViewText(R.id.widget_single_post_title, cleanTitle)
                                                setViewVisibility(R.id.widget_single_post_title, View.VISIBLE)
                                            } else {
                                                setViewVisibility(R.id.widget_single_post_title, View.GONE)
                                            }
                                            setTextViewText(R.id.widget_single_post_timestamp, "$dateFormatted$tagStr")
                                            setTextViewText(R.id.widget_single_post_caption, captionText)
                                            showPlaceholder(this, "Image unavailable")
                                        }
                                        mgr.updateAppWidget(id, fallbackViews)
                                    }
                                } else {
                                    showPlaceholder(mediaViews, "Image unavailable")
                                    mgr.updateAppWidget(id, mediaViews)
                                }
                            } else if (post.hasMedia) {
                                showPlaceholder(textViews, "Media unavailable")
                                mgr.updateAppWidget(id, textViews)
                            } else {
                                textViews.setViewVisibility(R.id.widget_single_post_image, View.GONE)
                                textViews.setViewVisibility(R.id.widget_single_post_image_placeholder, View.GONE)
                                mgr.updateAppWidget(id, textViews)
                            }
                        } else {
                            textViews.setViewVisibility(R.id.widget_single_post_title, View.GONE)
                            textViews.setTextViewText(R.id.widget_single_post_timestamp, "")
                            textViews.setTextViewText(
                                R.id.widget_single_post_caption,
                                ctx.getString(R.string.widget_single_empty)
                            )
                            showPlaceholder(textViews, "Image unavailable")
                            mgr.updateAppWidget(id, textViews)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error updating single post data", e)
                        val errViews = buildBaseViews(ctx, id, opts, theme, corner).apply {
                            setViewVisibility(R.id.widget_single_post_title, View.GONE)
                            setTextViewText(R.id.widget_single_post_timestamp, "")
                            setTextViewText(
                                R.id.widget_single_post_caption,
                                ctx.getString(R.string.widget_error)
                            )
                            showPlaceholder(this, "Image unavailable")
                        }
                        try {
                            mgr.updateAppWidget(id, errViews)
                        } catch (_: Exception) {}
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating single post base layout", e)
            }
        }
    }
}
