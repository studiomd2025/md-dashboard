package com.studiomd.dashboard;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.studiomd.dashboard.widget.WidgetBridge;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the native widget bridge plugin before Capacitor initialises
        registerPlugin(WidgetBridge.class);
        super.onCreate(savedInstanceState);

        // ── Fix: prevent stale PWA Service Worker cache from blocking updates ──
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView wv = getBridge().getWebView();
            WebSettings ws = wv.getSettings();
            ws.setCacheMode(WebSettings.LOAD_NO_CACHE);
            wv.clearCache(true);
        }

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
        if (intent == null) return;
        Uri data = intent.getData();
        if (data == null) return;

        // If the WebView is already ready, route it immediately
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView wv = getBridge().getWebView();
            String uriStr = data.toString();

            // Handle widget deep links:
            // e.g. https://localhost/#/live, https://localhost/#/next, https://localhost/#/timeline, https://localhost/?post={id}
            if (uriStr.contains("#/") || uriStr.contains("?post=")) {
                wv.post(() -> {
                    // Extract relative route/query
                    String route = "";
                    if (uriStr.contains("#/")) {
                        route = "#/" + uriStr.substring(uriStr.indexOf("#/") + 2);
                        wv.evaluateJavascript("window.location.hash = '" + route.substring(1) + "';", null);
                    } else if (uriStr.contains("?post=")) {
                        String postId = uriStr.substring(uriStr.indexOf("?post=") + 6);
                        wv.evaluateJavascript("window.location.href = '/?post=" + postId + "';", null);
                    }
                });
            }
        }
    }
}
