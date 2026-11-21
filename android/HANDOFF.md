# Android Widget Agent Handoff Tracker (HANDOFF.md)

**Instructions for EVERY LLM Session (Claude, Gemini, GPT):**
1. Read `WIDGET_SPEC.md` and this `HANDOFF.md` before touching code.
2. Run `git status` and verify live JSON from `BASE_URL/api/widget-feed.json` first.
3. Update the checklist below before finishing your turn so any follow-up model can resume without redoing completed work.

---

## Status Checklist

### Phase 1: Shared Foundation & API Sync
- [x] Verified live `GET {BASE_URL}/api/widget-feed.json` and `GET {BASE_URL}/api/twitch-status` return HTTP 200 JSON
- [x] All 4 `<appwidget-provider>` XMLs declare `android:widgetFeatures="reconfigurable"` & `android:configure` (unlocks **Settings** button beside Create stack & Remove)
- [x] Widget picker previews replaced with clean native XML `android:previewLayout` in `res/xml-v31/` (zero Studio screenshots / debug text)
- [x] Widget Theme picker shows 8 distinct swatches including **Transparent** (with split/checkerboard indicator)
- [x] Transparent theme uses `@android:color/transparent`, zero border, and automatic Light/Dark adaptive text (`values/` vs `values-night/`)
- [x] All dates formatted strictly as `yyyy.m.d`
- [x] `MainActivity` handles `onCreate` + `onNewIntent` for `?post={id}`, `#/live`, `#/next`, `#/timeline` and avoids stale WebView cache

### Phase 2: Individual Widgets (Zero `"Couldn't add widget."` Crashes)
- [x] **MD Countdown:** Spinner loads `countdowns[]` on UI thread; `Compact` format removed; clockless; `maxLines="1"` timer; dynamic scaling + adaptive Smallest/Horiz/Vertical/Expanded layouts
- [x] **MD LIVE:** Opens `#/live`; never throws on Save/Resize; adaptive `Smallest (Ch #)` / `Horiz (Channel #)` / `Vertical` / `Expanded (+#Tags)`; live `NOW STREAMING` indicator
- [x] **MD Single Post:** Never shows screenshot drawable on home screen; `[Image]`/`[GIF]` prefix ONLY when `hasMedia == true` (never `"Diary Entry"`); no View Mode selector; auto-responsive; `Open ↗` + `?post={id}` deep link; never throws on Save
- [x] **MD Feed Card:** Config includes `Layout Style` (`Full View` default / `Horizontal` / `List`), `Filter` (`All` / `Pinned` / `Certain Hashtag` / `Date Range`), `Max Posts` (1–6), `Animate GIF`; `RemoteViewsService` has `BIND_REMOTEVIEWS` permission in manifest; no white flash or `"Couldn't add widget."` crash

### Phase 3: Build Verification
- [x] `./gradlew assembleDebug` (or `.\gradlew.bat assembleDebug`) passes with 0 errors

---

## Last Session Notes
*(Agent: fill this section at the end of every turn)*
- **Model Used:** Claude 3.7 Sonnet / Android Studio Agent
- **Files Created / Modified:**
  - `app/src/main/assets/capacitor.config.json`: Removed `server.url` so app loads bundled local web assets from `assets/public/` instead of attempting remote navigation to Google AI Studio preview proxy (which caused 403 error on launch).
  - `app/src/main/java/com/studiomd/dashboard/MainActivity.java`: Automated PWA ServiceWorker unregistration and CacheStorage clearing on startup to prevent stale web UI caching (eliminates manual "Clear Data" requirement), and added delayed hash route handling with `HashChangeEvent` dispatching.
  - `app/src/main/java/com/studiomd/dashboard/widget/MdLiveWidgetProvider.kt`: Included channel parameter (`#/live?ch=$ch`) in deep links so tapping MD Live opens the station route directly.
  - `app/src/main/java/com/studiomd/dashboard/widget/` (`MdCountdownWidgetProvider.kt`, `MdLiveWidgetProvider.kt`, `MdSinglePostWidgetProvider.kt`, `MdFeedCardWidgetProvider.kt`): Kept background ImageView `VISIBLE` for transparent themes with transparent drawables so transparent widgets maintain identical layout bounds and zero font clipping.
  - `app/src/main/res/layout/widget_feed_item_full.xml` & `WidgetFeedService.kt`: Expanded media images to maximum width (`scaleType="centerCrop"`, `maxHeight="220dp"`, full-res bitmap decoding).
  - `app/google-services.json`: Restored from git commit `e4e5ec4`.
  - `app/src/main/java/com/studiomd/dashboard/MainActivity.java`: Registered `FirebaseAuthenticationPlugin.class`, removed main-thread `wv.clearCache(true)` / `LOAD_NO_CACHE` blocking calls.
  - `app/src/main/java/com/studiomd/dashboard/widget/WidgetApiClient.kt`: Implemented direct Firestore REST API query (`documents:runQuery`) to bypass AI Studio proxy HTML redirect, HTML stripping, attachment media detection, and local feed caching.
  - `app/src/main/java/com/studiomd/dashboard/widget/WidgetConfigActivities.kt`: Removed Corner Roundness selector, fixed Single Post dropdown label formatting (`[Image]` prefix strictly when `hasMedia == true`), and updated Countdown format options.
  - `app/src/main/java/com/studiomd/dashboard/widget/MdCountdownWidgetProvider.kt`: Scaled 1x1 timer text size dynamically to avoid `D-(` clipping.
  - `app/src/main/java/com/studiomd/dashboard/widget/MdLiveWidgetProvider.kt`: Updated `widget_live_brand` header maxLines and dynamic tags.
  - `app/src/main/java/com/studiomd/dashboard/widget/WidgetFeedService.kt` & `widget_feed_item_full.xml`: Preserved cached posts on refresh (no empty feed flash), added scaled bitmap decoding (2s timeout, `inSampleSize=2`), set `scaleType="fitCenter"` and `adjustViewBounds="true"` for uncropped Full View images.
  - `app/src/main/res/layout/widget_single_post.xml`: Removed hardcoded timestamp preview text.
- **Build Command Result:** `app:assembleDebug` completed successfully with 0 errors.
- **Next Action / Remaining:** All 7 diagnostic issues resolved and verified.
