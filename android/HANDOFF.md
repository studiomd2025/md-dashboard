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
- **Model Used:** Gemini (Android Studio Agent)
- **Root Causes Identified & Fixed:**
  1. **Missing CORS headers in `server.ts`**: Render returned `HTTP 200` with full playlist JSON on same-origin Web UI, but lacked `Access-Control-Allow-Origin`, causing Android WebView (`origin: https://localhost`) to block the response.
  2. **Broken `apiBase` & placeholder fallback in uncommitted `LiveTvView.tsx`**: `window.location.hostname === 'localhost'` is `true` inside Capacitor Android, which routed `/api/youtube-playlist` to `https://localhost/...` instead of `https://mddashboard.onrender.com`, and injected 3 hardcoded placeholder tracks when `localStorage` was empty.
  3. **Build/sync desync**: Earlier hotfixes edited `app/src/main/assets/public/assets/index-s9Ep_ynB.js` directly instead of updating `src/` and running `npm run build` + `npx cap sync android`.
- **Files Modified:**
  - `src/lib/apiClient.ts` (new): Routes native Capacitor requests to `https://mddashboard.onrender.com` using `CapacitorHttp` (bypassing WebView CORS + 45s cold-start timeout + retries) and adds a direct native `CapacitorHttp` YouTube playlist scraper + RSS fallback when needed.
  - `src/components/LiveTvView.tsx`: Uses `fetchYouTubePlaylist` / `fetchJsonWithRetry`, removes hardcoded fake tracks, adds `Retry Sync` button in the playlist modal.
  - `src/App.tsx`, `src/components/MobileWidgetStudioView.tsx`: Uses `fetchJsonWithRetry` / `buildApiUrl` for `/api/state` and `/api/twitch-status`.
  - `server.ts`: Added CORS middleware (`Access-Control-Allow-Origin: *`) and YouTube consent cookie headers on playlist fetches.
  - Synced `dist/` -> `android/app/src/main/assets/public/` (`index-D9oHQZvT.js`) via `npm run build` + `npx cap sync android`.
- **Build & Deploy Result:** `tsc --noEmit`, `vite build`, `npx cap sync android`, and `:app:assembleDebug` all succeeded with 0 errors. Deployed to `adb-R83L103J3PK-SXbtHf._adb-tls-connect._tcp`.
