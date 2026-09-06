package net.redsystems.redzone

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import org.json.JSONObject

class AlarmActivity : ComponentActivity() {
    private lateinit var alarm: JSONObject; private var snoozes=0
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        alarm=JSONObject(intent.getStringExtra("alarm")?:"{}"); snoozes=intent.getIntExtra("snoozes",0); val tryHard=alarm.optBoolean("tryHard",false)
        val root=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; gravity=Gravity.CENTER; setPadding(42,42,42,42); setBackgroundColor(Color.rgb(12,4,6)) }
        root.addView(TextView(this).apply { text=alarm.optString("hora","ALARME"); textSize=62f; gravity=Gravity.CENTER; setTextColor(Color.WHITE) })
        root.addView(TextView(this).apply { text=alarm.optString("nome","Despertar"); textSize=30f; gravity=Gravity.CENTER; setTextColor(Color.WHITE); setPadding(0,20,0,50) })
        if(!tryHard&&snoozes<3) root.addView(Button(this).apply { text="ADIAR 5 MINUTOS (${snoozes}/3)"; setOnClickListener{snooze()} },LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=20})
        root.addView(Button(this).apply { text="DESLIGAR ALARME"; setOnClickListener{dismiss()} },LinearLayout.LayoutParams(-1,-2)); setContentView(root)
    }
    private fun dismiss(){startService(Intent(this,AlarmService::class.java).setAction("STOP"));finishAndRemoveTask()}
    private fun snooze(){startService(Intent(this,AlarmService::class.java).setAction("STOP"));AlarmScheduler.scheduleAt(this,alarm,System.currentTimeMillis()+5*60_000,snoozes+1);finishAndRemoveTask()}
}
