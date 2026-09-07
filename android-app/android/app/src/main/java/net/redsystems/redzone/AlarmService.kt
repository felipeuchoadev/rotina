package net.redsystems.redzone

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import androidx.core.app.NotificationCompat
import org.json.JSONObject

class AlarmService : Service() {
    private var player: MediaPlayer? = null; private var vibrator: Vibrator? = null
    private val handler=Handler(Looper.getMainLooper())
    @Volatile private var stopRequested=false
    override fun onCreate() { super.onCreate(); createChannel() }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopAlarm(); return START_NOT_STICKY }
        val raw = intent?.getStringExtra("alarm") ?: return START_NOT_STICKY
        val alarm = runCatching { JSONObject(raw) }.getOrElse { stopAlarm(); return START_NOT_STICKY }
        val snoozes = intent.getIntExtra("snoozes", 0)
        releaseOutputs(); stopRequested=false
        val full = Intent(this, AlarmActivity::class.java).putExtra("alarm", raw).putExtra("snoozes", snoozes).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val fullPending = PendingIntent.getActivity(this, alarm.optString("id").hashCode(), full, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stopPending = PendingIntent.getBroadcast(this, alarm.optString("id").hashCode(), Intent(this,AlarmControlReceiver::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(alarm.optString("nome", "Alarme REDZONE"))
            .setContentText("Toque para abrir e desligar").setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true).setAutoCancel(false).setFullScreenIntent(fullPending, true).setContentIntent(fullPending)
            .addAction(0,"DESLIGAR",stopPending).build()
        startForeground(NOTIFICATION_ID, notification);AlarmRuntimeState.active=true
        runCatching {
            val custom = alarm.optString("customUrl").takeIf { alarm.optString("som") == "custom" && it.startsWith("https://redsystems.ddns.net/") }
            val next = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                if (custom != null) setDataSource(custom) else setDataSource(this@AlarmService, Settings.System.DEFAULT_ALARM_ALERT_URI)
                isLooping=true; val volume=(alarm.optInt("intensidade",100).coerceIn(20,100)/100f); setVolume(volume,volume)
            }
            player=next
            next.setOnPreparedListener { if(stopRequested||player!==it) runCatching{it.release()} else it.start() }
            next.setOnErrorListener { media,_,_-> if(player===media)player=null;runCatching{media.release()};true }
            next.prepareAsync()
        }
        vibrator = if (Build.VERSION.SDK_INT >= 31) getSystemService(VibratorManager::class.java).defaultVibrator else @Suppress("DEPRECATION") getSystemService(VIBRATOR_SERVICE) as Vibrator
        val pattern = longArrayOf(0,900,180,900,180)
        if (Build.VERSION.SDK_INT >= 26) vibrator?.vibrate(VibrationEffect.createWaveform(pattern,0)) else @Suppress("DEPRECATION") vibrator?.vibrate(pattern,0)
        handler.removeCallbacksAndMessages(null)
        handler.postDelayed({ if(!stopRequested)stopAlarm() },MAX_RING_MS)
        runCatching { startActivity(full) }; return START_NOT_STICKY
    }
    private fun releaseOutputs(){handler.removeCallbacksAndMessages(null);val old=player;player=null;runCatching{old?.setOnPreparedListener(null)};runCatching{old?.stop()};runCatching{old?.release()};vibrator?.cancel();vibrator=null}
    private fun stopAlarm() { stopRequested=true;releaseOutputs();AlarmRuntimeState.active=false;(getSystemService(NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIFICATION_ID);stopForeground(STOP_FOREGROUND_REMOVE);stopSelf() }
    override fun onDestroy() { stopRequested=true;releaseOutputs();AlarmRuntimeState.active=false;super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
    private fun createChannel() { if (Build.VERSION.SDK_INT >= 26) (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(NotificationChannel(CHANNEL,"Alarmes REDZONE",NotificationManager.IMPORTANCE_HIGH).apply { description="Alarmes definidos pelo usuário"; setSound(null,null) }) }
    companion object { const val CHANNEL="redzone_alarms_v1";const val ACTION_STOP="net.redsystems.redzone.STOP_ALARM";const val NOTIFICATION_ID=7001;const val MAX_RING_MS=10*60_000L }
}

object AlarmRuntimeState{@Volatile var active=false}
