import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(<App />);
