package net.redsystems.redzone

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import androidx.core.content.ContextCompat
import android.widget.Toast
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

object UpdateManager {
    private const val VERSION_URL = "https://redsystems.ddns.net/rotina/app-version.json"
    private const val APK_HOST = "redsystems.ddns.net"
    private var checking = false
    private var checkedAt = 0L

    fun check(activity: ComponentActivity) {
        if (checking || System.currentTimeMillis() - checkedAt < 60_000) return
        checking = true; checkedAt = System.currentTimeMillis()
        Thread {
            try {
                val connection = URL("$VERSION_URL?t=${System.currentTimeMillis()}").openConnection() as HttpURLConnection
                connection.connectTimeout = 8_000; connection.readTimeout = 8_000; connection.useCaches = false
                val data = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
                val code = data.optInt("versionCode"); val apk = data.optString("apk"); val sha256=data.optString("sha256")
                if (AlarmRules.shouldUpdate(code, BuildConfig.VERSION_CODE) && Uri.parse(apk).let { it.scheme == "https" && it.host == APK_HOST })
                    activity.runOnUiThread { download(activity, code, apk, sha256) }
            } catch (_: Exception) { } finally { checking = false }
        }.start()
    }

    private fun download(activity: ComponentActivity, code: Int, url: String, sha256: String) {
        val prefs = activity.getSharedPreferences("redzone_updates", Context.MODE_PRIVATE)
        val filename = "redzone-update-$code.apk"
        val file = File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), filename)
        if (file.exists() && file.length() > 100_000 && validHash(file,sha256)) { install(activity, file); return }
        if (prefs.getInt("downloading", 0) == code) {
            val oldId=prefs.getLong("downloadId",-1); if(oldId>0){
                val manager=activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                manager.query(DownloadManager.Query().setFilterById(oldId)).use{c->if(c.moveToFirst()&&c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))==DownloadManager.STATUS_SUCCESSFUL){prefs.edit().clear().apply();if(file.exists()&&validHash(file,sha256))install(activity,file)else file.delete()}}
            }; return
        }
        if (Build.VERSION.SDK_INT >= 26 && !activity.packageManager.canRequestPackageInstalls()) {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}")))
            checkedAt = 0; return
        }
        file.delete()
        val manager = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val request = DownloadManager.Request(Uri.parse(url)).setTitle("Atualizando REDZONE").setDescription("A nova versão está sendo preparada")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, filename)
        val id = manager.enqueue(request); prefs.edit().putInt("downloading", code).putLong("downloadId",id).apply()
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return
                runCatching { activity.unregisterReceiver(this) }; prefs.edit().remove("downloading").apply()
                if (!file.exists()||!validHash(file,sha256)){file.delete();Toast.makeText(activity,"Atualização inválida. Tente novamente.",Toast.LENGTH_LONG).show();return}
                install(activity,file)
            }
        }
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        ContextCompat.registerReceiver(activity, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }
    private fun validHash(file:File,expected:String):Boolean{if(!Regex("^[A-Fa-f0-9]{64}$").matches(expected))return false;val digest=MessageDigest.getInstance("SHA-256");file.inputStream().use{input->val buffer=ByteArray(64*1024);while(true){val n=input.read(buffer);if(n<=0)break;digest.update(buffer,0,n)}};return digest.digest().joinToString(""){"%02X".format(it)}.equals(expected,true)}
    private fun install(activity:ComponentActivity,file:File){
        val uri=FileProvider.getUriForFile(activity,"${activity.packageName}.updates",file)
        activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
