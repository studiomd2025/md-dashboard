import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import React from 'react';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen p-6 bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
          <h2 className="text-base font-bold">App Render Error</h2>
          <pre className="text-xs bg-slate-900 p-4 rounded-xl max-w-full overflow-auto border border-white/10">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import './index.css';

// Inside Capacitor / Android WebView, unregister any stale Service Worker and purge
// old Workbox caches so web updates appear immediately without pressing "Clear data".
if (typeof window !== 'undefined') {
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const isNativeWebView =
    Boolean(cap?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:' ||
    /; wv\)/i.test(navigator.userAgent);

  if (isNativeWebView) {
    if ('serviceWorker' in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker
        .getRegistrations()
        .then(async (regs) => {
          const hadRegs = regs.length > 0;
          await Promise.all(regs.map((r) => r.unregister()));
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          if ((hadController || hadRegs) && !sessionStorage.getItem('md-sw-purged')) {
            sessionStorage.setItem('md-sw-purged', '1');
            window.location.reload();
          }
        })
        .catch(() => {
          // ignore WebView SW cleanup errors
        });
    }
  } else {
    registerSW({ immediate: true });
  }
}

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><App /></AppErrorBoundary>);
