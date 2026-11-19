import JSZip from 'jszip';
import { ANDROID_WIDGET_TEMPLATES, ANDROID_WIDGET_PACKAGE } from '../data/androidWidgetTemplates';

export async function downloadWidgetCodeZip() {
  const zip = new JSZip();

  // 1. README / Guide for Android Studio Agent
  const readmeContent = `# My Diaries Dashboard - Android Widget Codebase
Package: ${ANDROID_WIDGET_PACKAGE}

This ZIP package contains all the XML layout templates, Android AppWidgetProvider Kotlin code, and widget files for the My Diaries widget collection.

## Contents
- android/res/layout/ (XML layout templates for countdown, live, and dashboard widgets)
- android/res/xml/ (Widget provider info)
- android/res/drawable/ (Surface background drawables)
- android/app/src/main/java/com/studiomd/dashboard/ (Kotlin AppWidgetProvider)

## Instructions for Android Studio Agent
1. Place XML layouts into res/layout/
2. Place provider info into res/xml/
3. Place Kotlin code into your app's package directory
4. Register the receiver in AndroidManifest.xml
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
