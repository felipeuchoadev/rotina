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
        val id=runCatching{JSONObject(alarm).optString("id")}.getOrDefault("")
        val prefs=context.getSharedPreferences("redzone_alarm_guard",Context.MODE_PRIVATE);val now=System.currentTimeMillis();val key="last:$id"
        if(id.isNotBlank()&&now-prefs.getLong(key,0)<10_000)return
        if(id.isNotBlank())prefs.edit().putLong(key,now).apply()
        val service = Intent(context, AlarmService::class.java).putExtra("alarm", alarm).putExtra("snoozes", intent.getIntExtra("snoozes", 0))
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service) else context.startService(service)
        AlarmScheduler.scheduleNext(context, JSONObject(alarm), System.currentTimeMillis() + 60_000)
    }
}
