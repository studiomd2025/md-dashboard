package com.studiomd.dashboard;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.studiomd.dashboard.widget.MdNotificationManager;
import com.studiomd.dashboard.widget.WidgetBridge;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {

    private static final int REQ_POST_NOTIFICATIONS = 4012;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Register native plugins after Capacitor initializes bridge
        registerPlugin(WidgetBridge.class);
        registerPlugin(FirebaseAuthenticationPlugin.class);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setJavaScriptEnabled(true);
        }

        // Schedule periodic native checks for scheduled posts, countdown target dates, and MD Memo feed
        MdNotificationManager.INSTANCE.schedulePeriodicChecks(this);
        requestNotificationPermissionIfNeeded();

        // Handle incoming deep link intent on cold launch
        handleWidgetDeepLink(getIntent());
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    REQ_POST_NOTIFICATIONS
                );
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Handle incoming deep link intent when app is already open in background
        handleWidgetDeepLink(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(() -> {
                getBridge().getWebView().evaluateJavascript("if (typeof window !== 'undefined' && window.dispatchEvent) { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); }", null);
            }, 300);
        }
    }

    private void handleWidgetDeepLink(Intent intent) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView wv = getBridge().getWebView();
            
            // Clear stale PWA service worker cache on startup to avoid "Clear Data" requirement
            wv.post(() -> {
                wv.evaluateJavascript(
                    "if ('serviceWorker' in navigator) { " +
                    "  navigator.serviceWorker.getRegistrations().then(function(regs) { " +
                    "    for (var r of regs) { r.unregister(); } " +
                    "  }); " +
                    "} " +
                    "if ('caches' in window) { " +
                    "  caches.keys().then(function(names) { " +
                    "    for (var name of names) { caches.delete(name); } " +
                    "  }); " +
                    "}", null
                );
            });

            if (intent == null) return;
            Uri data = intent.getData();
            if (data == null) return;
            String uriStr = data.toString();

            if (uriStr.contains("#/") || uriStr.contains("?post=")) {
                wv.postDelayed(() -> {
                    if (uriStr.contains("#/")) {
                        String rawRoute = uriStr.substring(uriStr.indexOf("#/") + 2); // e.g. "live?ch=2" or "next"
                        String tabName = rawRoute.split("\\?")[0];
                        String chNum = "";
                        if (uriStr.contains("ch=")) {
                            try {
                                chNum = uriStr.substring(uriStr.indexOf("ch=") + 3);
                                if (chNum.contains("&")) chNum = chNum.substring(0, chNum.indexOf("&"));
                            } catch (Exception e) {}
                        }

                        final String channelToSelect = chNum;
                        String js = "try { " +
                                    "  window.localStorage.setItem('md_active_view', '" + tabName + "'); " +
                                    "  window.location.hash = '#/" + tabName + "'; " +
                                    "  window.dispatchEvent(new HashChangeEvent('hashchange')); " +
                                    (channelToSelect.isEmpty() ? "" : 
                                    "  setTimeout(function() { " +
                                    "    var btns = document.querySelectorAll('button'); " +
                                    "    for (var i = 0; i < btns.length; i++) { " +
                                    "      var txt = btns[i].textContent || ''; " +
                                    "      if (txt.indexOf('Channel " + channelToSelect + "') !== -1 || txt.indexOf('CH 0" + channelToSelect + "') !== -1) { " +
                                    "        btns[i].click(); " +
                                    "        break; " +
                                    "      } " +
                                    "    } " +
                                    "  }, 400); ") +
                                    "} catch(e) {}";
                        wv.evaluateJavascript(js, null);
                    } else if (uriStr.contains("?post=")) {
                        String postId = uriStr.substring(uriStr.indexOf("?post=") + 6);
                        wv.evaluateJavascript("window.location.href = '/?post=" + postId + "';", null);
                    }
                }, 600);
            }
        }
    }
}
