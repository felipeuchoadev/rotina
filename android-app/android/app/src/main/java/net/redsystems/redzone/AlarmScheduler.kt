package net.redsystems.redzone

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

object AlarmScheduler {
    private const val PREFS = "redzone_native_alarms"
    private const val DATA = "alarms"
    fun sync(context: Context, json: String) {
        val incoming = JSONArray(json); val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val previous = runCatching { JSONArray(prefs.getString(DATA, "[]")) }.getOrDefault(JSONArray())
        for (i in 0 until previous.length()) cancel(context, previous.optJSONObject(i)?.optString("id").orEmpty())
        prefs.edit().putString(DATA, incoming.toString()).apply()
        for (i in 0 until incoming.length()) incoming.optJSONObject(i)?.takeIf { it.optBoolean("ativo", true) }?.let { scheduleNext(context, it) }
    }
    fun rescheduleAll(context: Context) {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(DATA, "[]") ?: "[]"
        val alarms = runCatching { JSONArray(raw) }.getOrDefault(JSONArray())
        for (i in 0 until alarms.length()) alarms.optJSONObject(i)?.takeIf { it.optBoolean("ativo", true) }?.let { scheduleNext(context, it) }
    }
    fun scheduleNext(context: Context, alarm: JSONObject, fromMillis: Long = System.currentTimeMillis()) {
        val parts = alarm.optString("hora", "07:00").split(':').mapNotNull(String::toIntOrNull); if (parts.size != 2) return
        val days = alarm.optJSONArray("dias") ?: JSONArray("[0,1,2,3,4,5,6]")
        val selected = (0 until days.length()).map { days.optInt(it) }.toSet(); val next = Calendar.getInstance(); var found = false
        for (offset in 0..7) {
            next.timeInMillis = fromMillis; next.add(Calendar.DAY_OF_YEAR, offset); next.set(Calendar.HOUR_OF_DAY, parts[0]); next.set(Calendar.MINUTE, parts[1]); next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0)
            if ((selected.isEmpty() || next.get(Calendar.DAY_OF_WEEK) - 1 in selected) && next.timeInMillis > fromMillis + 1000) { found = true; break }
        }
        if (found) scheduleAt(context, alarm, next.timeInMillis, 0)
    }
    fun scheduleAt(context: Context, alarm: JSONObject, time: Long, snoozes: Int) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager; val pending = pending(context, alarm, snoozes)
        if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
        else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
    }
    private fun pending(context: Context, alarm: JSONObject, snoozes: Int): PendingIntent {
        val id = alarm.optString("id", alarm.optString("nome", "alarme")); val intent = Intent(context, AlarmReceiver::class.java).putExtra("alarm", alarm.toString()).putExtra("snoozes", snoozes)
        return PendingIntent.getBroadcast(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    private fun cancel(context: Context, id: String) {
        val pending = PendingIntent.getBroadcast(context, id.hashCode(), Intent(context, AlarmReceiver::class.java), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE) ?: return
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending); pending.cancel()
    }
}
