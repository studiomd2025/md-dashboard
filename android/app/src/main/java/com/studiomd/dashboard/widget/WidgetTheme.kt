package com.studiomd.dashboard.widget

import android.content.Context
import android.content.res.Configuration
import androidx.core.content.ContextCompat
import com.studiomd.dashboard.R

/**
 * Widget colour themes matching WIDGET_SPEC.md.
 * 8 presets:
 * 0. Transparent (@android:color/transparent, 0dp stroke, adaptive light/dark ink)
 * 1. White (#FFFFFF, slate dark text)
 * 2. Midnight (#0F172A, light text)
 * 3. Sky Blue (#F0F9FF, deep sky text)
 * 4. Emerald (#ECFDF5, deep emerald text)
 * 5. Rose (#FFF1F2, deep rose text)
 * 6. Lavender (#F5F3FF, deep violet text)
 * 7. Warm Amber (#FFFBEB, deep amber text)
 */
enum class WidgetTheme(
    val id: String,
    val displayName: String,
    val bgHex: String,
    val inkHex: String,
    val subHex: String,
    val accentHex: String,
    val strokeHex: String,
    val isTransparent: Boolean = false
) {
    TRANSPARENT("transparent", "Transparent", "#00000000", "#0F172A", "#64748B", "#0284C7", "#00000000", true),
    WHITE      ("white",       "White",       "#FFFFFF",   "#0F172A", "#64748B", "#0284C7", "#E2E8F0"),
    MIDNIGHT   ("midnight",    "Midnight",    "#0F172A",   "#F8FAFC", "#94A3B8", "#38BDF8", "#1E293B"),
    SKY        ("sky",         "Sky Blue",    "#F0F9FF",   "#0C4A6E", "#0369A1", "#0284C7", "#BAE6FD"),
    EMERALD    ("emerald",     "Emerald",     "#ECFDF5",   "#064E3B", "#047857", "#059669", "#A7F3D0"),
    ROSE       ("rose",        "Rose",        "#FFF1F2",   "#881337", "#BE123C", "#F43F5E", "#FECDD3"),
    LAVENDER   ("lavender",    "Lavender",    "#F5F3FF",   "#3B0764", "#7C3AED", "#8B5CF6", "#DDD6FE"),
    AMBER      ("amber",       "Warm Amber",  "#FFFBEB",   "#713F12", "#B45309", "#D97706", "#FDE68A");

    companion object {
        val ALL: List<WidgetTheme> = entries.toList()
        val displayNames: Array<String> get() = ALL.map { it.displayName }.toTypedArray()
        fun fromId(id: String): WidgetTheme = ALL.firstOrNull { it.id == id } ?: TRANSPARENT

        /**
         * Checks whether the system is currently in Night/Dark mode.
         * Used to guarantee crisp white text on transparent backgrounds in dark mode.
         */
        fun isSystemNight(ctx: Context): Boolean {
            val uiMode = ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            return uiMode == Configuration.UI_MODE_NIGHT_YES
        }

        fun getInkColor(ctx: Context, theme: WidgetTheme): Int {
            if (theme.isTransparent) {
                return if (isSystemNight(ctx)) android.graphics.Color.parseColor("#FFFFFF")
                else ContextCompat.getColor(ctx, R.color.widget_adaptive_ink)
            }
            return android.graphics.Color.parseColor(theme.inkHex)
        }

        fun getSubColor(ctx: Context, theme: WidgetTheme): Int {
            if (theme.isTransparent) {
                return if (isSystemNight(ctx)) android.graphics.Color.parseColor("#CBD5E1")
                else ContextCompat.getColor(ctx, R.color.widget_adaptive_subtext)
            }
            return android.graphics.Color.parseColor(theme.subHex)
        }

        fun getAccentColor(ctx: Context, theme: WidgetTheme): Int {
            if (theme.isTransparent) {
                return if (isSystemNight(ctx)) android.graphics.Color.parseColor("#38BDF8")
                else ContextCompat.getColor(ctx, R.color.widget_adaptive_accent)
            }
            return android.graphics.Color.parseColor(theme.accentHex)
        }

        fun getDividerColor(ctx: Context, theme: WidgetTheme): Int {
            if (theme.isTransparent) {
                return if (isSystemNight(ctx)) android.graphics.Color.parseColor("#475569")
                else ContextCompat.getColor(ctx, R.color.widget_adaptive_divider)
            }
            return android.graphics.Color.parseColor(theme.strokeHex)
        }

        /**
         * Returns the correct surface drawable resource matching the theme and corner radius.
         */
        fun getSurfaceDrawable(theme: WidgetTheme, corner: WidgetCorner): Int {
            return if (theme.isTransparent) {
                when (corner) {
                    WidgetCorner.SHARP -> R.drawable.widget_surface_transparent_sharp
                    WidgetCorner.SOFT -> R.drawable.widget_surface_transparent_soft
                    else -> R.drawable.widget_surface_transparent_crisp
                }
            } else {
                when (corner) {
                    WidgetCorner.SHARP -> R.drawable.widget_surface_sharp
                    WidgetCorner.SOFT -> R.drawable.widget_surface_soft
                    else -> R.drawable.widget_surface_crisp
                }
            }
        }
    }
}

/** Corner radius presets: Sharp (4dp), Crisp (12dp), Soft (22dp) per WIDGET_SPEC.md */
enum class WidgetCorner(val id: String, val displayName: String, val radiusDp: Int) {
    SHARP ("sharp", "Sharp", 4),
    CRISP ("crisp", "Crisp", 12),
    SOFT  ("soft",  "Soft",  22);

    companion object {
        val ALL: List<WidgetCorner> = entries.toList()
        fun fromId(id: String): WidgetCorner = ALL.firstOrNull { it.id == id } ?: CRISP
    }
}
