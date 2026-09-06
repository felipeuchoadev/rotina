package net.redsystems.redzone

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_TIME_CHANGED || intent.action == Intent.ACTION_TIMEZONE_CHANGED) { AlarmScheduler.rescheduleAll(context); return }
        val alarm = intent.getStringExtra("alarm") ?: return
        val service = Intent(context, AlarmService::class.java).putExtra("alarm", alarm).putExtra("snoozes", intent.getIntExtra("snoozes", 0))
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
        AlarmScheduler.scheduleNext(context, JSONObject(alarm), System.currentTimeMillis() + 60_000)
    }
}
