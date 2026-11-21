# Android Widget Agent Handoff Tracker (HANDOFF.md)

**Instructions for EVERY LLM Session (Claude, Gemini, GPT):**
1. Read `WIDGET_SPEC.md` and this `HANDOFF.md` before touching code.
2. Run `git status` and verify live JSON from `BASE_URL/api/widget-feed.json` first.
3. Update the checklist below before finishing your turn so any follow-up model can resume without redoing completed work.

---

## Status Checklist

### Phase 1: Shared Foundation & API Sync
- [ ] Verified live `GET {BASE_URL}/api/widget-feed.json` and `GET {BASE_URL}/api/twitch-status` return HTTP 200 JSON
- [ ] All 4 `<appwidget-provider>` XMLs declare `android:widgetFeatures="reconfigurable"` & `android:configure` (unlocks **Settings** button beside Create stack & Remove)
- [ ] Widget picker previews replaced with clean native XML `android:previewLayout` in `res/xml-v31/` (zero Studio screenshots / debug text)
- [ ] Widget Theme picker shows 8 distinct swatches including **Transparent** (with split/checkerboard indicator)
- [ ] Transparent theme uses `@android:color/transparent`, zero border, and automatic Light/Dark adaptive text (`values/` vs `values-night/`)
- [ ] All dates formatted strictly as `yyyy.m.d`
- [ ] `MainActivity` handles `onCreate` + `onNewIntent` for `?post={id}`, `#/live`, `#/next`, `#/timeline` and avoids stale WebView cache

### Phase 2: Individual Widgets (Zero `"Couldn't add widget."` Crashes)
- [ ] **MD Countdown:** Spinner loads `countdowns[]` on UI thread; `Compact` format removed; clockless; `maxLines="1"` timer; dynamic scaling + adaptive Smallest/Horiz/Vertical/Expanded layouts
- [ ] **MD LIVE:** Opens `#/live`; never throws on Save/Resize; adaptive `Smallest (Ch #)` / `Horiz (Channel #)` / `Vertical` / `Expanded (+#Tags)`; live `NOW STREAMING` indicator
- [ ] **MD Single Post:** Never shows screenshot drawable on home screen; `[Image]`/`[GIF]` prefix ONLY when `hasMedia == true` (never `"Diary Entry"`); no View Mode selector; auto-responsive; `Open ↗` + `?post={id}` deep link; never throws on Save
- [ ] **MD Feed Card:** Config includes `Layout Style` (`Full View` default / `Horizontal` / `List`), `Filter` (`All` / `Pinned` / `Certain Hashtag` / `Date Range`), `Max Posts` (1–6), `Animate GIF`; `RemoteViewsService` has `BIND_REMOTEVIEWS` permission in manifest; no white flash or `"Couldn't add widget."` crash

### Phase 3: Build Verification
- [ ] `./gradlew assembleDebug` (or `.\gradlew.bat assembleDebug`) passes with 0 errors

---

## Last Session Notes
*(Agent: fill this section at the end of every turn)*
- **Model Used:** (pending)
- **Files Created / Modified:** (none yet)
- **Build Command Result:** (pending)
- **Next Action / Remaining:** Complete Phase 1 & 2, verify no RemoteViews exceptions, then run `assembleDebug`.
