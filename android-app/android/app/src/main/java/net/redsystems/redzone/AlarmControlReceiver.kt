package net.redsystems.redzone

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmControlReceiver:BroadcastReceiver(){
    override fun onReceive(context:Context,intent:Intent){
        if(intent.action!=AlarmService.ACTION_STOP)return
        context.stopService(Intent(context,AlarmService::class.java))
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(AlarmService.NOTIFICATION_ID)
    }
}
