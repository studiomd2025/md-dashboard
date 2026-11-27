import React from 'react';
import { Download, ExternalLink, Sparkles } from 'lucide-react';
import type { DesignSettings, EventCountdown, Post } from '../types';
import type { BroadcastChannel } from './LiveTvView';

export interface MobileWidgetStudioViewProps {
  posts: Post[];
  countdowns: EventCountdown[];
  nowMs: number;
  design?: DesignSettings;
  activeStation?: BroadcastChannel;
  onOpenTimeline?: () => void;
  onOpenLive?: () => void;
  onOpenCountdown?: (countdownId: string) => void;
}

export const MobileWidgetStudioView: React.FC<MobileWidgetStudioViewProps> = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="aero-glass rounded-3xl p-6 sm:p-10 shadow-xl dark:border-slate-700/80 dark:bg-slate-900/90">
        {/* Header / Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              Official Android APK Release
            </div>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              My Diaries Dashboard for Android
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Experience Frutiger Aero 2026 multimedia diaries, live streaming, and interactive home-screen widgets natively on your Android device.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center rounded-xl bg-emerald-100 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              Android 7.0+
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="https://github.com/studiomd2025/md-dashboard/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 hover:bg-sky-500 hover:shadow-sky-500/35 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Download APK (Latest Release)
          </a>
          <a
            href="https://github.com/studiomd2025/md-dashboard/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-800 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900 transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            View All Releases on GitHub
          </a>
        </div>

        {/* 3-Step Sideload Guide */}
        <div className="mt-10">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Quick Installation & Widget Guide
          </h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                1
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Download the APK:</strong> Click the primary download button above to grab the signed <span className="font-mono text-xs">.apk</span> from GitHub Releases.
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                2
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Allow Installation:</strong> If Android prompts you about installing apps from unknown sources, tap <em className="text-sky-600 dark:text-sky-400">Settings</em> and enable <em className="text-sky-600 dark:text-sky-400">Allow from this source</em>.
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                3
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Open & Install:</strong> Tap the downloaded file to complete installation, open MD Dashboard, and long-press your home screen to add the interactive Home-Screen Countdown & Live Widgets!
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
