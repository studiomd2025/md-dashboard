package com.studiomd.dashboard.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.core.content.ContextCompat
import com.studiomd.dashboard.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// ─────────────────────────────────────────────────────────────────────────────
// Base config activity — shared theme swatches + corner buttons
// ─────────────────────────────────────────────────────────────────────────────

abstract class MdBaseWidgetConfigActivity : Activity() {

    protected var widgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectedTheme: WidgetTheme = WidgetTheme.TRANSPARENT
    private var selectedCorner: WidgetCorner = WidgetCorner.CRISP

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(RESULT_CANCELED)

        widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }

        // ── Root scroll layout ────────────────────────────────────────────────
        val scroll = ScrollView(this).apply { isVerticalScrollBarEnabled = false }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
            setBackgroundColor(Color.WHITE)
        }
        scroll.addView(root)
        setContentView(scroll)

        // ── Title ─────────────────────────────────────────────────────────────
        root.addView(textView(configTitle(), 18f, true, "#0F172A").apply {
            setPadding(0, 0, 0, dp(20))
        })

        // ── Widget-specific content (injected by subclass) ────────────────────
        onExtraContent(root)

        // ── Section: Widget Theme ─────────────────────────────────────────────
        root.addView(textView("Widget Theme", 13f, false, "#64748B").apply {
            setPadding(0, dp(20), 0, dp(10))
        })
        selectedTheme = WidgetPrefs.loadTheme(this, widgetId)
        root.addView(buildThemeSwatches { selectedTheme = it })

        // ── Section: Corner Roundness ─────────────────────────────────────────
        root.addView(textView("Corner Roundness", 13f, false, "#64748B").apply {
            setPadding(0, dp(16), 0, dp(10))
        })
        selectedCorner = WidgetPrefs.loadCorner(this, widgetId)
        root.addView(buildCornerButtons { selectedCorner = it })

        // ── Save button ───────────────────────────────────────────────────────
        val saveBtn = Button(this).apply {
            text = getString(R.string.widget_save)
            setBackgroundColor(Color.parseColor("#0284C7"))
            setTextColor(Color.WHITE)
            textSize = 15f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48)).apply {
                topMargin = dp(24)
            }
        }
        root.addView(saveBtn)
        saveBtn.setOnClickListener {
            WidgetPrefs.saveTheme(this, widgetId, selectedTheme.id)
            WidgetPrefs.saveCorner(this, widgetId, selectedCorner.id)
            onSave()
            triggerWidgetUpdate()
            setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
            finish()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun buildThemeSwatches(onPick: (WidgetTheme) -> Unit): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.START
        }
        val dotSize = dp(32); val gap = dp(8)
        WidgetTheme.ALL.forEach { theme ->
            val dot = View(this).apply {
                layoutParams = LinearLayout.LayoutParams(dotSize, dotSize).apply { rightMargin = gap }
                if (theme.isTransparent) {
                    background = ContextCompat.getDrawable(context, R.drawable.widget_theme_transparent_swatch)
                } else {
                    val gd = GradientDrawable().apply {
                        shape = GradientDrawable.OVAL
                        setColor(Color.parseColor(theme.bgHex))
                        setStroke(dp(2), Color.parseColor(theme.strokeHex))
                    }
                    background = gd
                }
                contentDescription = theme.displayName
            }
            dot.setOnClickListener {
                onPick(theme)
                // Visually highlight selected swatch
                WidgetTheme.ALL.forEachIndexed { i, t ->
                    val v = row.getChildAt(i) as? View ?: return@forEachIndexed
                    if (t.isTransparent) {
                        // Keep transparent indicator, highlight outline
                        v.alpha = if (t == theme) 1.0f else 0.7f
                    } else {
                        val gd = v.background as? GradientDrawable ?: return@forEachIndexed
                        gd.setStroke(dp(2), if (t == theme) Color.parseColor("#0284C7") else Color.parseColor(t.strokeHex))
                    }
                }
            }
            row.addView(dot)
        }
        return row
    }

    private fun buildCornerButtons(onPick: (WidgetCorner) -> Unit): LinearLayout {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.START
        }
        WidgetCorner.ALL.forEach { corner ->
            val btn = Button(this).apply {
                text = corner.displayName
                textSize = 13f
                layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT,
                    dp(36)).apply { rightMargin = dp(8) }
                setOnClickListener {
                    onPick(corner)
                    WidgetCorner.ALL.forEachIndexed { i, c ->
                        val b = row.getChildAt(i) as? Button ?: return@forEachIndexed
                        if (c == corner) {
                            b.setBackgroundColor(Color.parseColor("#0284C7"))
                            b.setTextColor(Color.WHITE)
                        } else {
                            b.setBackgroundColor(Color.parseColor("#F1F5F9"))
                            b.setTextColor(Color.parseColor("#1E293B"))
                        }
                    }
                }
            }
            if (corner == selectedCorner) {
                btn.setBackgroundColor(Color.parseColor("#0284C7"))
                btn.setTextColor(Color.WHITE)
            } else {
                btn.setBackgroundColor(Color.parseColor("#F1F5F9"))
                btn.setTextColor(Color.parseColor("#1E293B"))
            }
            row.addView(btn)
        }
        return row
    }

    protected fun textView(text: String, sp: Float, bold: Boolean, hex: String): TextView =
        TextView(this).apply {
            this.text = text
            textSize = sp
            setTextColor(Color.parseColor(hex))
            if (bold) setTypeface(null, android.graphics.Typeface.BOLD)
        }

    protected fun dp(v: Int): Int = (v * resources.displayMetrics.density + 0.5f).toInt()

    protected abstract fun configTitle(): String
    protected open fun onExtraContent(root: LinearLayout) {}
    protected open fun onSave() {}
    protected abstract fun triggerWidgetUpdate()
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Countdown Config
// ─────────────────────────────────────────────────────────────────────────────

class MdCountdownConfigActivity : MdBaseWidgetConfigActivity() {

    private var countdowns: List<WidgetCountdown> = emptyList()
    private var selectedId: String = ""
    private var selectedFormat: String = "days-remaining"

    override fun configTitle() = getString(R.string.widget_countdown_name) + " Settings"

    override fun onExtraContent(root: LinearLayout) {
        root.addView(textView(getString(R.string.widget_countdown_choose), 13f, false, "#64748B").apply {
            setPadding(0, 0, 0, dp(8))
        })
        val cdSpinner = Spinner(this)
        root.addView(cdSpinner)

        root.addView(textView(getString(R.string.widget_countdown_format_label), 13f, false, "#64748B").apply {
            setPadding(0, dp(14), 0, dp(8))
        })
        // Format options matching Image 2 exactly
        val fmtKeys = listOf("full", "adaptive", "days-remaining", "date-only")
        val fmtLabels = arrayOf(
            "Full Timer (00 : 00 : 00 : 00)",
            "Adaptive Remaining (e.g. 2 months, 2 weeks, 3 days)",
            "Days Remaining (D-# / D-DAY / D+#)",
            "Target Date Only"
        )

        val fmtSpinner = Spinner(this).also {
            val fmtAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, fmtLabels)
            fmtAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            it.adapter = fmtAdapter
        }
        root.addView(fmtSpinner)
        selectedFormat = WidgetPrefs.loadCountdownFormat(this, widgetId)
        fmtSpinner.setSelection(fmtKeys.indexOf(selectedFormat).coerceAtLeast(0))
        fmtSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                selectedFormat = fmtKeys.getOrElse(pos) { "days-remaining" }
            }
            override fun onNothingSelected(p: AdapterView<*>?) {}
        }

        CoroutineScope(Dispatchers.IO).launch {
            val feed = WidgetApiClient.fetchFeed(this@MdCountdownConfigActivity)
            countdowns = feed?.countdowns ?: emptyList()
            withContext(Dispatchers.Main) {
                val titles = if (countdowns.isNotEmpty()) {
                    countdowns.map { it.title }.toTypedArray()
                } else {
                    arrayOf("No upcoming events")
                }
                val cdAdapter = ArrayAdapter(this@MdCountdownConfigActivity,
                    android.R.layout.simple_spinner_item, titles)
                cdAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                cdSpinner.adapter = cdAdapter

                val savedId = WidgetPrefs.loadCountdownId(this@MdCountdownConfigActivity, widgetId)
                val idx = countdowns.indexOfFirst { it.id == savedId }.coerceAtLeast(0)
                cdSpinner.setSelection(idx)
                if (countdowns.isNotEmpty()) selectedId = countdowns[idx].id

                cdSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                        selectedId = countdowns.getOrNull(pos)?.id ?: ""
                    }
                    override fun onNothingSelected(p: AdapterView<*>?) {}
                }
            }
        }
    }

    override fun onSave() {
        if (selectedId.isNotEmpty()) WidgetPrefs.saveCountdownId(this, widgetId, selectedId)
        WidgetPrefs.saveCountdownFormat(this, widgetId, selectedFormat)
    }

    override fun triggerWidgetUpdate() {
        MdCountdownWidgetProvider.update(this, AppWidgetManager.getInstance(this),
            widgetId, AppWidgetManager.getInstance(this).getAppWidgetOptions(widgetId))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Single Post Config (NO View Mode selector)
// ─────────────────────────────────────────────────────────────────────────────

class MdSinglePostConfigActivity : MdBaseWidgetConfigActivity() {

    private var posts: List<WidgetPost> = emptyList()
    private var selectedPostId: String = ""
    private var animateGif: Boolean = true

    override fun configTitle() = getString(R.string.widget_single_post_name) + " Settings"

    override fun onExtraContent(root: LinearLayout) {
        root.addView(textView(getString(R.string.widget_single_choose), 13f, false, "#64748B").apply {
            setPadding(0, 0, 0, dp(8))
        })
        val spinner = Spinner(this)
        root.addView(spinner)

        // Animate GIF checkbox
        val gifRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(14), 0, 0)
        }
        val gifCheck = CheckBox(this).apply {
            isChecked = WidgetPrefs.loadAnimateGif(this@MdSinglePostConfigActivity, widgetId)
            setOnCheckedChangeListener { _, c -> animateGif = c }
        }
        gifRow.addView(gifCheck)
        gifRow.addView(textView(getString(R.string.widget_animate_gif), 13f, false, "#1E293B"))
        root.addView(gifRow)
        animateGif = gifCheck.isChecked

        CoroutineScope(Dispatchers.IO).launch {
            val feed = WidgetApiClient.fetchFeed(this@MdSinglePostConfigActivity)
            posts = feed?.posts ?: emptyList()
            withContext(Dispatchers.Main) {
                // Format label per WIDGET_SPEC.md:
                // 1. Non-empty title (ignoring "Diary Entry")
                // 2. Otherwise excerpt (up to ~42 chars), annotated [Image]/[GIF] if media present
                // 3. Otherwise [Image Post — yyyy.m.d]
                val labels = posts.map { p ->
                    val cleanTitle = p.title.trim()
                    val hasMedia = !p.wideImageUrl.isNullOrBlank()
                    val mediaTag = if (hasMedia) "[Image] " else ""
                    val dateStr = WidgetTimeHelper.formatDate(p.publishedAt)

                    when {
                        cleanTitle.isNotEmpty() && !cleanTitle.equals("Diary Entry", ignoreCase = true) ->
                            "$mediaTag$cleanTitle"
                        p.excerpt.isNotBlank() ->
                            "$mediaTag${p.excerpt.take(42)}"
                        hasMedia ->
                            "[Image Post — $dateStr]"
                        else ->
                            dateStr
                    }
                }.toTypedArray()

                val adapter = ArrayAdapter(this@MdSinglePostConfigActivity,
                    android.R.layout.simple_spinner_item, labels)
                adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                spinner.adapter = adapter

                val savedId = WidgetPrefs.loadSinglePostId(this@MdSinglePostConfigActivity, widgetId)
                val idx = posts.indexOfFirst { it.id == savedId }.coerceAtLeast(0)
                spinner.setSelection(idx)
                if (posts.isNotEmpty()) selectedPostId = posts[idx].id

                spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                    override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                        selectedPostId = posts.getOrNull(pos)?.id ?: ""
                    }
                    override fun onNothingSelected(p: AdapterView<*>?) {}
                }
            }
        }
    }

    override fun onSave() {
        if (selectedPostId.isNotEmpty()) WidgetPrefs.saveSinglePostId(this, widgetId, selectedPostId)
        WidgetPrefs.saveAnimateGif(this, widgetId, animateGif)
    }

    override fun triggerWidgetUpdate() {
        MdSinglePostWidgetProvider.update(this, AppWidgetManager.getInstance(this),
            widgetId, AppWidgetManager.getInstance(this).getAppWidgetOptions(widgetId))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MD LIVE Config
// ─────────────────────────────────────────────────────────────────────────────

class MdLiveConfigActivity : MdBaseWidgetConfigActivity() {

    private var selectedChannel: Int = 1

    override fun configTitle() = getString(R.string.widget_live_name) + " Settings"

    override fun onExtraContent(root: LinearLayout) {
        root.addView(textView(getString(R.string.widget_live_channel_label), 13f, false, "#64748B").apply {
            setPadding(0, 0, 0, dp(10))
        })
        selectedChannel = WidgetPrefs.loadLiveChannel(this, widgetId)

        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val chLabels = listOf("Channel 1", "Channel 2", "Channel 3")
        chLabels.forEachIndexed { i, label ->
            val ch = i + 1
            val btn = Button(this).apply {
                text = label
                textSize = 13f
                layoutParams = LinearLayout.LayoutParams(0, dp(40), 1f).apply {
                    rightMargin = if (i < 2) dp(6) else 0
                }
                setOnClickListener {
                    selectedChannel = ch
                    chLabels.forEachIndexed { j, _ ->
                        val b = row.getChildAt(j) as? Button ?: return@forEachIndexed
                        if (j + 1 == ch) {
                            b.setBackgroundColor(Color.parseColor("#0284C7"))
                            b.setTextColor(Color.WHITE)
                        } else {
                            b.setBackgroundColor(Color.parseColor("#F1F5F9"))
                            b.setTextColor(Color.parseColor("#1E293B"))
                        }
                    }
                }
            }
            if (ch == selectedChannel) {
                btn.setBackgroundColor(Color.parseColor("#0284C7"))
                btn.setTextColor(Color.WHITE)
            } else {
                btn.setBackgroundColor(Color.parseColor("#F1F5F9"))
                btn.setTextColor(Color.parseColor("#1E293B"))
            }
            row.addView(btn)
        }
        root.addView(row)
    }

    override fun onSave() {
        WidgetPrefs.saveLiveChannel(this, widgetId, selectedChannel)
    }

    override fun triggerWidgetUpdate() {
        MdLiveWidgetProvider.update(this, AppWidgetManager.getInstance(this),
            widgetId, AppWidgetManager.getInstance(this).getAppWidgetOptions(widgetId))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Feed Card Config
// ─────────────────────────────────────────────────────────────────────────────

class MdFeedCardConfigActivity : MdBaseWidgetConfigActivity() {

    private var layoutStyle: String = "full"
    private var maxPosts: Int = 3
    private var filter: String = "all"
    private var selectedTag: String = ""

    override fun configTitle() = getString(R.string.widget_feed_card_name) + " Settings"

    override fun onExtraContent(root: LinearLayout) {
        // ── Layout Style: Full View (default) | Horizontal | List ──────────
        root.addView(textView("Layout Style", 13f, false, "#64748B").apply {
            setPadding(0, 0, 0, dp(8))
        })
        layoutStyle = WidgetPrefs.loadFeedLayoutStyle(this, widgetId)
        val styleRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val styles = listOf("full" to "Full View", "horizontal" to "Horizontal", "list" to "List")
        styles.forEachIndexed { i, (key, label) ->
            val btn = Button(this).apply {
                text = label
                textSize = 12f
                layoutParams = LinearLayout.LayoutParams(0, dp(38), 1f).apply {
                    rightMargin = if (i < 2) dp(4) else 0
                }
                setOnClickListener {
                    layoutStyle = key
                    styles.forEachIndexed { j, _ ->
                        val b = styleRow.getChildAt(j) as? Button ?: return@forEachIndexed
                        if (j == i) {
                            b.setBackgroundColor(Color.parseColor("#0284C7"))
                            b.setTextColor(Color.WHITE)
                        } else {
                            b.setBackgroundColor(Color.parseColor("#F1F5F9"))
                            b.setTextColor(Color.parseColor("#1E293B"))
                        }
                    }
                }
            }
            if (key == layoutStyle) {
                btn.setBackgroundColor(Color.parseColor("#0284C7"))
                btn.setTextColor(Color.WHITE)
            } else {
                btn.setBackgroundColor(Color.parseColor("#F1F5F9"))
                btn.setTextColor(Color.parseColor("#1E293B"))
            }
            styleRow.addView(btn)
        }
        root.addView(styleRow)

        // ── Filter: All Posts | Pinned | Certain Hashtag | Date Range ──────
        root.addView(textView("Filter", 13f, false, "#64748B").apply {
            setPadding(0, dp(14), 0, dp(8))
        })
        filter = WidgetPrefs.loadFeedFilter(this, widgetId)
        val filterRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val filters = listOf("all" to "All", "pinned" to "Pinned", "tag" to "#Tag", "date" to "Date Range")
        filters.forEachIndexed { i, (key, label) ->
            val btn = Button(this).apply {
                text = label
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(0, dp(36), 1f).apply {
                    rightMargin = if (i < 3) dp(4) else 0
                }
                setOnClickListener {
                    filter = key
                    filters.forEachIndexed { j, _ ->
                        val b = filterRow.getChildAt(j) as? Button ?: return@forEachIndexed
                        if (j == i) {
                            b.setBackgroundColor(Color.parseColor("#0284C7"))
                            b.setTextColor(Color.WHITE)
                        } else {
                            b.setBackgroundColor(Color.parseColor("#F1F5F9"))
                            b.setTextColor(Color.parseColor("#1E293B"))
                        }
                    }
                }
            }
            if (key == filter) {
                btn.setBackgroundColor(Color.parseColor("#0284C7"))
                btn.setTextColor(Color.WHITE)
            } else {
                btn.setBackgroundColor(Color.parseColor("#F1F5F9"))
                btn.setTextColor(Color.parseColor("#1E293B"))
            }
            filterRow.addView(btn)
        }
        root.addView(filterRow)

        // ── Max Posts (1–6 per WIDGET_SPEC.md) ─────────────────────────────
        root.addView(textView("Max Posts (1–6)", 13f, false, "#64748B").apply {
            setPadding(0, dp(14), 0, dp(8))
        })
        maxPosts = WidgetPrefs.loadFeedMaxPosts(this, widgetId).coerceIn(1, 6)
        val maxOptions = (1..6).map { it.toString() }.toTypedArray()
        val maxSpinner = Spinner(this).also {
            val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, maxOptions)
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            it.adapter = adapter
            it.setSelection(maxPosts - 1)
            it.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(p: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                    maxPosts = pos + 1
                }
                override fun onNothingSelected(p: AdapterView<*>?) {}
            }
        }
        root.addView(maxSpinner)
    }

    override fun onSave() {
        WidgetPrefs.saveFeedLayoutStyle(this, widgetId, layoutStyle)
        WidgetPrefs.saveFeedMaxPosts(this, widgetId, maxPosts)
        WidgetPrefs.saveFeedFilter(this, widgetId, filter)
    }

    override fun triggerWidgetUpdate() {
        MdFeedCardWidgetProvider.update(this, AppWidgetManager.getInstance(this),
            widgetId, AppWidgetManager.getInstance(this).getAppWidgetOptions(widgetId))
    }
}
