# My Diaries Dashboard — Android Widget Specification (WIDGET_SPEC.md)

Package: `com.studiomd.dashboard`
Backend Origin (`BASE_URL`): `https://ais-dev-jlyggj2es4wxdx5r36t72p-456241029780.asia-northeast1.run.app`

This file is the single source of truth for implementing and debugging all 4 Android home-screen widgets (`MD Countdown`, `MD LIVE`, `MD Single Post`, `MD Feed Card`). Every LLM agent (Claude, Gemini, GPT) MUST follow this spec verbatim and check `HANDOFF.md` before editing.

---

## 0. Mandatory First Step (API Verification)

Before editing any widget data parsing code, verify live responses from `BASE_URL`:
1. `GET ${BASE_URL}/api/widget-feed.json`
   ```json
   {
     "title": "MY DIARIES DASHBOARD",
     "updatedAt": "2026-11-20T12:00:00.000Z",
     "countdowns": [
       {
         "id": "cd-2",
         "title": "Winter Studio Showcase",
         "targetAt": "2026-12-24T12:00:00.000Z",
         "timeZone": "Asia/Seoul",
         "tag": "StudioLaunch2026",
         "displayFormat": "full"
       }
     ],
     "items": [
       {
         "id": "post-id",
         "title": "",
         "excerpt": "Plain text excerpt up to 220 chars",
         "publishedAt": "2026-11-20T10:00:00.000Z",
         "pinned": true,
         "pinnedUntil": "2026-11-27T10:00:00.000Z",
         "tags": ["Tag1", "Tag2"],
         "wideImageUrl": "https://.../image.jpg",
         "hasMedia": true,
         "isAnimatedGif": false
       }
     ]
   }
   ```
2. `GET ${BASE_URL}/api/twitch-status?channel={MDTV_ch1|MDMT_ch2|MDRS_ch3}`
   ```json
   {
     "channel": "MDTV_ch1",
     "isLive": false,
     "bannerImageUrl": "https://...",
     "offlineImageUrl": "https://...",
     "streamTitle": "Stream title or null",
     "viewersCount": null
   }
   ```

---

## 1. Global Requirements (All 4 Widgets)

### A. Long-Press "Settings" Button (Create stack | Settings | Remove)
- Every `<appwidget-provider>` XML in `res/xml/` MUST declare:
  - `android:widgetFeatures="reconfigurable"`
  - `android:configure="..."` pointing to that widget's configuration Activity.
- On Samsung One UI / Android 9+, omitting `reconfigurable` hides the **Settings** button on long-press.

### B. Clean Native Picker Previews
- Do **NOT** use cropped screenshots from the web Widget Studio as `previewImage` / `previewLayout`.
- Never show debug dimensions (`265 x 254 px · drag corner to resize`), web scrollbars, or thick black outer rings.
- Use native Android XML `android:previewLayout` (API 31+) with clean sample state + matching clean fallback previews.

### C. Shared Theme Swatches & System-Adaptive Transparent Mode
8 theme presets:
0. **Transparent** — MUST have a distinct visual indicator in the config picker (diagonal split / checkerboard drawable + clear label), NEVER a plain white circle.
1. **White** (`#FFFFFF`, slate dark text)
2. **Midnight** (`#0F172A`, light text)
3. **Sky Blue** (`#F0F9FF`, deep sky text)
4. **Emerald** (`#ECFDF5`, deep emerald text)
5. **Rose** (`#FFF1F2`, deep rose text)
6. **Lavender** (`#F5F3FF`, deep violet text)
7. **Warm Amber** (`#FFFBEB`, deep amber text)

**Transparent background behavior:**
- Root background uses `@android:color/transparent` with **0dp stroke/border** and **no card shadow/fill**.
- Text, sublabels, dividers, and icons MUST automatically adapt to the phone's light/dark display/wallpaper theme (`res/values/` dark slate `#0F172A` ink vs `res/values-night/` crisp white `#FFFFFF` ink with subtle shadow radius for legibility).
- Corner Roundness selector on all config screens: `SHARP` (4dp), `CRISP` (12dp), `SOFT` (22dp).

### D. Date Formatting Rule
- Format ALL post dates as **`yyyy.m.d`** (e.g., `2026.11.21`), NEVER relative strings like `3 h ago`.

---

## 2. Per-Widget Functional Specs

### Widget 1: MD Countdown
- **Config options:**
  1. `Countdown Event` dropdown: populated dynamically from `countdowns[]` in `/api/widget-feed.json`. Default to the first event if none was picked yet. Never fall back to `D-?? / No upcoming events` when `countdowns[]` has items.
  2. `Display format` dropdown: **ONLY** support `Full timer (D:HH:MM:SS)`, `Days Remaining (D-# / D-DAY / D+#)`, `Days only`, and `Date only (yyyy.m.d)`. **Remove `Compact (e.g. 14d 3h)`.**
  3. `Widget Theme` + `Corner Roundness`.
- **Layout & behavior:**
  - Never display any clock icon.
  - Center timer typography cleanly and scale text size proportionally via `onAppWidgetOptionsChanged` (width/height dp):
    - Smallest (`w < 260dp && h < 126dp`): Timer only, centered.
    - Horizontal (`w >= 260dp && h < 126dp`): Timer left + single-line event title right.
    - Vertical (`126dp <= h < 172dp`): Timer + centered event title.
    - Expanded (`h >= 172dp`): Timer + event title + `#tag` strip below divider.
  - Tap opens `MainActivity` to `#/next` (or `#/?countdown={id}`).

### Widget 2: MD LIVE
- **Config options:** Channel (`Channel 1 / MDTV_ch1`, `Channel 2 / MDMT_ch2`, `Channel 3 / MDRS_ch3`), `Widget Theme`, `Corner Roundness`.
- **Layout & adaptive breakpoints (`onAppWidgetOptionsChanged`):**
  - Smallest (`w < 195dp && h < 145dp`): Status badge (`LIVE` / `OFFLINE`) top-right + `Ch #` + `callsign` centered. Hide brand header & footer.
  - Horizontal (`w >= 195dp && h < 145dp`): `Channel #` left + status badge right. Hide brand header, callsign & footer.
  - Vertical (`145dp <= h < 185dp`): `MD LIVE` (or `My Diaries Live` if wide) + status badge + `Channel #` + `callsign` + `NOW STREAMING` (only if live) + `Open Station ↗` / `Watch Broadcast ↗`.
  - Expanded Tall (`h >= 185dp`): Same as Vertical + event `#hashtags` strip above footer.
- **Deep link:** Tapping MD LIVE widget MUST open **`#/live`** in `MainActivity` (NOT Timeline).

### Widget 3: MD Single Post
- **Config options (NO View Mode selector):**
  1. `Select Post` dropdown: populated from `items[]` in `/api/widget-feed.json`.
     - For untitled or media-only posts, **NEVER show `"Diary Entry"`**. Build label as:
       1. Non-empty `title` (ignoring `"Diary Entry"`)
       2. Otherwise `excerpt` (up to ~42 chars), prefixed/annotated with `[Image]` or `[GIF]` if `wideImageUrl` is present
       3. Otherwise `[Image Post — yyyy.m.d]` / `yyyy.m.d`.
  2. `Animate GIF on mobile` checkbox.
  3. `Widget Theme` + `Corner Roundness`.
- **Layout & behavior:**
  - Purely **auto-responsive by widget size** when resized on home screen (scale padding/font size/excerpt maxLines cleanly with dp width & height).
  - Render uncropped first image/GIF (`adjustViewBounds="true"`, `scaleType="fitCenter"`), title (if non-empty), `yyyy.m.d · #tag`, excerpt, and `Open ↗` footer.
  - Tap opens `MainActivity` directly to `?post={id}`.

### Widget 4: MD Feed Card
- **Config options (match Widget Studio):**
  1. `Layout Style`: **`Full View`** (default), `Horizontal`, `List`.
  2. `Filter`: `All Posts` (pinned first, then newest), `Pinned Only`, `Certain Hashtag` (searchable/selectable list of tags from `items[]`), `Date Range` (`yyyy.m.d` From / To).
  3. `Max Posts`: `1` to `6`.
  4. `Animate GIF on mobile` (applicable to `Full View` & `Horizontal`).
  5. `Widget Theme` + `Corner Roundness`.
- **Rendering architecture:**
  - Use a real scrollable `ListView` backed by `RemoteViewsService` + `RemoteViewsFactory` (do NOT stuff only 1 hardcoded post view).
  - Keep cached/existing RemoteViews displayed while refreshing so placement/updates never flash blank white.
  - Layout styles per row:
    - `Full View`: uncropped full-width media on top, `yyyy.m.d` (+ `Pinned` badge if pinned), title (if any), excerpt, `#tags`.
    - `Horizontal`: square thumbnail on left + `yyyy.m.d`, title, excerpt, `#tags` on right.
    - `List`: clean heading (`title` or first sentence of `excerpt`) + `yyyy.m.d` date only.
  - Tap header/app button opens `#/timeline`; tapping an item opens `?post={id}`.

---

## 3. Critical Crash & Regression Rules (Do NOT Violate)

1. **Prevent `"Couldn't add widget."` (`RemoteViews` / `AppWidgetHostView` Crash):**
   - Never call `setInt(viewId, "setBackgroundResource", ...)` or mutate styles unless `viewId` exists on that exact inflated XML layout and supports that `@RemotableViewMethod`.
   - Never inject custom/unsupported Views into widget XML layouts.
   - Any `RemoteViewsService` for `MD Feed Card` `ListView` MUST declare `android:permission="android.permission.BIND_REMOTEVIEWS"` and `android:exported="false"` inside `AndroidManifest.xml`.
   - Wrap network/bitmap/background logic in safe `try/catch` with `Log.e("MDWidget", ...)` and push a valid base `RemoteViews` layout immediately so One UI never drops to `"Couldn't add widget."`.
2. **Prevent Hardcoded Screenshot on Home Screen:**
   - `MD Single Post` and `MD Feed Card` home-screen XMLs must render live fetched views—NEVER embed a static web-studio screenshot drawable inside the active widget layout.
3. **Only Prefix `[Image]` / `[GIF]` When Media Actually Exists:**
   - In `MD Single Post` selector, check `hasMedia == true` (or non-empty `wideImageUrl`) and `isAnimatedGif` before adding `[Image]` / `[GIF]`. Text-only posts must not say `[Image]`.
4. **Countdown Single-Line Protection:**
   - Set `android:maxLines="1"` / `autoSizeTextType` on `MD Countdown` timer `TextView` so `D-34` / `00 : 12 : 04 : 30` never splits across two lines when resized narrow.
5. **No "Clear Data" Needed for Web UI Updates:**
   - Point `capacitor.config.ts` `server.url` to your live deployed Shared URL (`https://ais-dev-jlyggj2es4wxdx5r36t72p-456241029780.asia-northeast1.run.app`) and ensure `MainActivity` does NOT trap outdated Service Worker caches.
