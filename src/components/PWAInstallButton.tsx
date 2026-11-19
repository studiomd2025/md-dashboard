import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

const ANDROID_RELEASES_URL =
  'https://github.com/studiomd2025/md-dashboard/releases';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'full',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const androidLinkClass = `inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200/80 bg-white/75 font-medium text-sky-900 transition-colors hover:bg-white dark:border-sky-800/50 dark:bg-slate-900/60 dark:text-sky-100 whitespace-nowrap shrink-0 cursor-pointer ${
    variant === 'full' ? 'w-full px-4 py-2.5 text-sm' : 'px-3.5 py-2 text-xs'
  }`;

  if (isInstalled) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Installed as standalone mobile app
        </div>
        <a
          href={ANDROID_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={androidLinkClass}
        >
          <Smartphone className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          Install on Android
        </a>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={install}
          className={`aero-button-primary inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
            variant === 'full' ? 'w-full px-4 py-2.5 text-sm' : 'px-3.5 py-2 text-xs'
          }`}
        >
          <Download className="h-4 w-4 shrink-0" />
          Install Mobile App
        </button>
        <a
          href={ANDROID_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={androidLinkClass}
        >
          <Smartphone className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          Install on Android
        </a>
      </div>
    );
  }

  if (isIOS) {
    return (
      <>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-2.5 text-sm font-medium text-sky-900 transition-colors hover:bg-white dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            Install on iPhone / iPad
          </button>
          <a
            href={ANDROID_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={androidLinkClass}
          >
            <Smartphone className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            Install on Android
          </a>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="aero-glass w-full max-w-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Install on iOS Safari
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 dark:text-slate-400"
                  aria-label="Close guide"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li>1. Tap the Share button in the Safari toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Launch MyDiaries directly as a full-screen mobile app.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white dark:bg-sky-600 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <a
      href={ANDROID_RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={androidLinkClass}
    >
      <Smartphone className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
      Install on Android
    </a>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/95 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-lg backdrop-blur-md lg:bottom-5 dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode — Viewing cached intranet data</span>
    </div>
  );
};
