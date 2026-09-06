package net.redsystems.redzone

import android.content.Intent
import android.graphics.Color
import android.content.res.ColorStateList
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject

class AlarmActivity : ComponentActivity() {
    private lateinit var alarm: JSONObject; private var snoozes=0
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState); window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window,false); WindowInsetsControllerCompat(window,window.decorView).apply { hide(WindowInsetsCompat.Type.systemBars()); systemBarsBehavior=WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE }
        alarm=JSONObject(intent.getStringExtra("alarm")?:"{}"); snoozes=intent.getIntExtra("snoozes",0); val tryHard=alarm.optBoolean("tryHard",false)
        val palette=themePalette(alarm.optString("tema","red")); val root=LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; gravity=Gravity.CENTER; setPadding(42,42,42,42); setBackgroundColor(Color.parseColor(palette.first)) }
        root.addView(TextView(this).apply { text=alarm.optString("hora","ALARME"); textSize=62f; gravity=Gravity.CENTER; setTextColor(Color.WHITE) })
        root.addView(TextView(this).apply { text=alarm.optString("nome","Despertar"); textSize=30f; gravity=Gravity.CENTER; setTextColor(Color.WHITE); setPadding(0,20,0,50) })
        if(!tryHard&&snoozes<3) root.addView(Button(this).apply { text="ADIAR 5 MINUTOS (${snoozes}/3)"; backgroundTintList=ColorStateList.valueOf(Color.parseColor(palette.second)); setTextColor(Color.WHITE); setOnClickListener{snooze()} },LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=20})
        root.addView(Button(this).apply { text="DESLIGAR ALARME"; backgroundTintList=ColorStateList.valueOf(Color.parseColor(palette.third)); setTextColor(if(isLight(palette.third))Color.BLACK else Color.WHITE); setOnClickListener{dismiss()} },LinearLayout.LayoutParams(-1,-2)); setContentView(root)
    }
    private fun dismiss(){startService(Intent(this,AlarmService::class.java).setAction("STOP"));finishAndRemoveTask()}
    private fun snooze(){startService(Intent(this,AlarmService::class.java).setAction("STOP"));AlarmScheduler.scheduleAt(this,alarm,System.currentTimeMillis()+5*60_000,snoozes+1);finishAndRemoveTask()}
    private fun themePalette(id:String):Triple<String,String,String> = when(id){
        "menininha","sakura","lavanda","pessego","menta","perola","claro"->Triple("#17181b","#9467bd","#ffffff")
        "marinho","cobalto","gelo"->Triple("#030812","#347fd6","#70b7ff")
        "tatico","selva","oliva"->Triple("#060904","#687f42","#adc975")
        "sangue","inferno","lava"->Triple("#0c0304","#b3121f","#ff4b4b")
        "ouro","deserto","cobre"->Triple("#0a0806","#a9791f","#ffd34d")
        "roxo","vinho","rosa"->Triple("#0a060d","#7a1fb3","#c05fff")
        "oceano","ceu","jade","aurora","esmerald"->Triple("#021014","#138ca3","#67d9d2")
        else->Triple("#0e1013","#b3121f","#ffffff")
    }
    private fun isLight(hex:String):Boolean{val c=Color.parseColor(hex);return Color.red(c)*.299+Color.green(c)*.587+Color.blue(c)*.114>160}
}
