package com.studiomd.dashboard.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MdNotificationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            MdNotificationManager.schedulePeriodicChecks(context)
        }
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                MdNotificationManager.checkAllAndNotify(context.applicationContext)
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val ACTION_POLL = "com.studiomd.dashboard.ACTION_POLL_NOTIFICATIONS"
        const val ACTION_WAKEUP_CHECK = "com.studiomd.dashboard.ACTION_WAKEUP_NOTIFICATIONS"
    }
}
