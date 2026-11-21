package com.studiomd.dashboard;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.studiomd.dashboard.widget.WidgetBridge;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Register native plugins after Capacitor initializes bridge
        registerPlugin(WidgetBridge.class);
        registerPlugin(FirebaseAuthenticationPlugin.class);

        // Handle incoming deep link intent on cold launch
        handleWidgetDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Handle incoming deep link intent when app is already open in background
        handleWidgetDeepLink(intent);
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
                        String rawRoute = uriStr.substring(uriStr.indexOf("#/") + 2); // e.g. "live" or "next"
                        String tabName = rawRoute.split("\\?")[0];
                        wv.evaluateJavascript(
                            "try { " +
                            "  window.localStorage.setItem('md_active_view', '" + tabName + "'); " +
                            "  window.location.hash = '#/" + tabName + "'; " +
                            "  window.dispatchEvent(new HashChangeEvent('hashchange')); " +
                            "} catch(e) {}", null
                        );
                    } else if (uriStr.contains("?post=")) {
                        String postId = uriStr.substring(uriStr.indexOf("?post=") + 6);
                        wv.evaluateJavascript("window.location.href = '/?post=" + postId + "';", null);
                    }
                }, 600);
            }
        }
    }
}
