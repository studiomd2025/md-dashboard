import JSZip from 'jszip';
import { ANDROID_WIDGET_TEMPLATES, ANDROID_WIDGET_PACKAGE } from '../data/androidWidgetTemplates';

export async function downloadWidgetCodeZip() {
  const zip = new JSZip();

  const originHint =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://your-app-domain.run.app';

  // 1. README / Guide for Android Studio Agent
  const readmeContent = `# My Diaries Dashboard — Android Widget Codebase Guide

Package: \`${ANDROID_WIDGET_PACKAGE}\`
Web App Origin: \`${originHint}\`

This ZIP contains starter XML layouts, drawable templates, \`AppWidgetProviderInfo\` XML, an \`AppWidgetProvider\` Kotlin template, and an \`AndroidManifest.xml\` receiver snippet for the 4 My Diaries Dashboard Android home-screen widgets.

---

## 1. Exact ZIP Contents

- \`android/app/src/main/res/layout/widget_md_countdown.xml\` — Adaptive Countdown widget layout (no clock icon)
- \`android/app/src/main/res/layout/widget_md_live.xml\` — My Diaries Live tile layout (Channel 1–3 + LIVE/OFFLINE badge)
- \`android/app/src/main/res/layout/widget_md_dashboard.xml\` — Single Post & Feed Card layout (uncropped image/GIF + metadata + excerpt)
- \`android/app/src/main/res/drawable/widget_surface_bg.xml\` — Background shape templates (solid & transparent — **must be split before compiling**, see Section 2)
- \`android/app/src/main/res/xml/md_dashboard_widget_info.xml\` — Resizable \`AppWidgetProviderInfo\` metadata
- \`android/app/src/main/java/com/studiomd/dashboard/MdDashboardWidgetProvider.kt\` — Kotlin \`AppWidgetProvider\` starter
- \`android/app/src/main/AndroidManifest.xml\` — \`<receiver>\` registration snippet (merge into your real \`AndroidManifest.xml\`)

---

## 2. Integration Checklist for Android Studio Agent

1. **Copy Resources & Kotlin Source**
   - Copy \`res/layout/*.xml\` and \`res/xml/*.xml\` into your Android module's \`app/src/main/res/\`.
   - Copy \`MdDashboardWidgetProvider.kt\` into \`app/src/main/java/com/studiomd/dashboard/\` (or update the \`package\` declaration + manifest \`android:name\` if your project uses a different applicationId/package).

2. **Split Drawables Before Building (\`aapt2\` Requirement)**
   - \`widget_surface_bg.xml\` in this ZIP contains **two** \`<?xml ...?>\` documents concatenated for convenience:
     1. \`res/drawable/widget_surface_bg.xml\` (solid rounded surface)
     2. \`res/drawable/widget_surface_transparent.xml\` (optional pure transparent surface)
   - Split those into two separate XML files before building so AAPT2 does not fail on multiple XML prologs.
   - \`widget_md_live.xml\` also references \`@drawable/widget_footer_bg\` on \`@+id/widget_live_status\`; create a pill/rounded shape drawable \`res/drawable/widget_footer_bg.xml\` (or point it to \`@drawable/widget_surface_bg\`).

3. **Merge \`AndroidManifest.xml\`**
   - Do **not** overwrite your project's full \`AndroidManifest.xml\` with the snippet file.
   - Add \`<uses-permission android:name="android.permission.INTERNET" />\` at the manifest root.
   - Merge the \`<receiver>\` block inside \`<application>...</application>\` (and register separate \`AppWidgetProvider\` receivers/info XMLs if exposing Countdown, Live, Single Post, and Feed Card as distinct entries in the launcher widget picker).

4. **Configure \`BASE_URL\` & Deep-Link Routes**
   - Set \`BASE_URL\` in \`MdDashboardWidgetProvider.kt\` to \`${originHint}\` (or your deployed production origin).
   - Ensure \`MainActivity\` handles incoming \`ACTION_VIEW\` intents / TWA / WebView hash routes:
     - \`#/timeline\` (Dashboard / Posts)
     - \`#/live\` (My Diaries Live)
     - \`#/next\` (Next on MD Countdowns)

---

## 3. Backend API Endpoints & JSON Contracts

### A. \`GET \${BASE_URL}/api/widget-feed.json\`
Returns countdowns and the latest 12 live/pinned posts:
\`\`\`json
{
  "title": "MY DIARIES DASHBOARD",
  "updatedAt": "2026-11-19T12:00:00.000Z",
  "countdowns": [
    {
      "id": "...",
      "title": "Event Title",
      "targetAt": "2026-12-01T00:00:00.000Z",
      "timeZone": "Asia/Seoul",
      "tag": "EventTag",
      "displayFormat": "full | compact | days-only | date-only | d-day"
    }
  ],
  "items": [
    {
      "id": "post-id",
      "title": "Diary Entry",
      "excerpt": "Plain text excerpt (up to 220 chars)",
      "publishedAt": "2026-11-19T10:00:00.000Z",
      "pinned": true,
      "pinnedUntil": "2026-11-26T10:00:00.000Z",
      "tags": ["Tag1", "Tag2"],
      "wideImageUrl": "https://.../image-or-gif.jpg",
      "isAnimatedGif": false
    }
  ]
}
\`\`\`
> **Note:** The starter \`MdDashboardWidgetProvider.kt\` reads \`summary\`, \`publishedLabel\`, and \`imageUrl\` as placeholder field names — map those to the actual JSON keys \`excerpt\`, \`publishedAt\` (formatted for display), and \`wideImageUrl\` shown above.

### B. \`GET \${BASE_URL}/api/twitch-status?channel=<callsign>\`
Valid callsigns: \`MDTV_ch1\` (Ch 1), \`MDMT_ch2\` (Ch 2), \`MDRS_ch3\` (Ch 3).
\`\`\`json
{
  "channel": "MDTV_ch1",
  "isLive": false,
  "bannerImageUrl": "https://...",
  "offlineImageUrl": "https://...",
  "streamTitle": "Stream title or null",
  "viewersCount": null
}
\`\`\`

---

## 4. Widget Design & Behavior Specs

1. **Countdown Widget (\`widget_md_countdown.xml\`)**
   - **Clockless design:** Never render a clock icon.
   - **Adaptive breakpoints** (via \`onAppWidgetOptionsChanged\`):
     - Smallest (\`width < 260dp\` & \`height < 126dp\`): Timer only.
     - Compact Horizontal (\`width >= 260dp\` & \`height < 126dp\`): Timer + single-line title.
     - Compact Vertical (\`126dp <= height < 172dp\`): Timer + title.
     - Expanded Vertical (\`height >= 172dp\`): Timer + title + hashtags.

2. **My Diaries Live Tile (\`widget_md_live.xml\`)**
   - Supports Channels 1–3 (\`MDTV_ch1\`, \`MDMT_ch2\`, \`MDRS_ch3\`).
   - Displays \`LIVE\` or \`OFFLINE\` badge, channel number, and optional \`NOW STREAMING\` + tags when expanded vertically.

3. **Single Post & Feed Card (\`widget_md_dashboard.xml\`)**
   - Uses \`adjustViewBounds="true"\` and \`scaleType="fitCenter"\` for uncropped image previews.
   - When \`isAnimatedGif\` is \`true\`: on Android 12+ (API 31+), use \`AnimatedImageDrawable\` / \`ImageDecoder\` if animated GIFs are enabled, or decode a single static frame when disabled.

4. **Themes & Transparency**
   - Supports solid color presets (White, Midnight, Sky, Emerald, Rose, Lavender, Amber) and **Adaptive Transparent** (no card fill/border, contrasting text against light or dark launcher wallpapers).
`;

  zip.file('README.md', readmeContent);

  // 2. Add all Android widget template files from ANDROID_WIDGET_TEMPLATES
  const androidFolder = zip.folder('android');
  if (androidFolder) {
    for (const tpl of ANDROID_WIDGET_TEMPLATES) {
      // tpl.path is e.g. "android/app/src/main/res/layout/widget_md_countdown.xml"
      // we can strip "android/" if present or put it directly in android/
      const subPath = tpl.path.startsWith('android/') ? tpl.path.slice(8) : tpl.path;
      androidFolder.file(subPath, tpl.code);
    }
  }

  // Generate ZIP blob and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-diaries-widget-code-android-studio.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
