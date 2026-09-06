package net.redsystems.redzone

import android.Manifest
import android.app.AlarmManager
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.View
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var offline: TextView
    private var pendingFiles: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermission: PermissionRequest? = null

    private val filePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        pendingFiles?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)); pendingFiles = null
    }
    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        val request = pendingWebPermission; pendingWebPermission = null
        if (request != null && grants.values.all { it }) request.grant(request.resources) else request?.deny()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(9, 10, 14); window.navigationBarColor = Color.rgb(16, 17, 22)
        createContent(); configureWebView(); askNotificationPermission(); loadRequestedUrl(intent)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (webView.canGoBack()) webView.goBack() else finish() }
        })
    }

    private fun createContent() {
        val root = FrameLayout(this)
        webView = WebView(this).apply { setBackgroundColor(Color.rgb(9, 10, 14)) }
        offline = TextView(this).apply {
            text = "Sem conexão\n\nToque para tentar novamente"; textSize = 18f; gravity = android.view.Gravity.CENTER
            setTextColor(Color.WHITE); setBackgroundColor(Color.rgb(9, 10, 14)); visibility = View.GONE
            setOnClickListener { loadRequestedUrl(intent) }
        }
        root.addView(webView, FrameLayout.LayoutParams(-1, -1)); root.addView(offline, FrameLayout.LayoutParams(-1, -1)); setContentView(root)
    }

    @Suppress("SetJavaScriptEnabled")
    private fun configureWebView() {
        CookieManager.getInstance().apply { setAcceptCookie(true); setAcceptThirdPartyCookies(webView, false) }
        webView.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = true; databaseEnabled = true; allowFileAccess = false; allowContentAccess = true
            mediaPlaybackRequiresUserGesture = true; setGeolocationEnabled(true)
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString REDZONE-Android/${BuildConfig.VERSION_NAME}"
        }
        webView.addJavascriptInterface(NativeBridge(), "RedzoneNative")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "https" && uri.host.equals(APP_HOST, true)) return false
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }; return true
            }
            override fun onPageFinished(view: WebView, url: String) {
                offline.visibility = View.GONE
                view.evaluateJavascript("document.documentElement.classList.add('android-app');window.dispatchEvent(new Event('redzone-native-ready'))") {}
            }
            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                if (request.isForMainFrame && response.statusCode >= 500) offline.visibility = View.VISIBLE
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                pendingFiles?.onReceiveValue(null); pendingFiles = callback
                return runCatching { filePicker.launch(params.createIntent().apply { putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true) }); true }
                    .getOrElse { pendingFiles = null; callback.onReceiveValue(null); false }
            }
            override fun onPermissionRequest(request: PermissionRequest) {
                if (!request.origin.host.equals(APP_HOST, true)) { request.deny(); return }
                val wanted = mutableListOf<String>()
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE in request.resources) wanted += Manifest.permission.CAMERA
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE in request.resources) wanted += Manifest.permission.RECORD_AUDIO
                if (wanted.isEmpty()) request.grant(request.resources) else { pendingWebPermission = request; permissions.launch(wanted.toTypedArray()) }
            }
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                callback.invoke(origin, Uri.parse(origin).host.equals(APP_HOST, true), false)
            }
        }
        webView.setDownloadListener { url, userAgent, disposition, mime, _ ->
            val filename = URLUtil.guessFileName(url, disposition, mime)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mime); addRequestHeader("User-Agent", userAgent); CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
                setTitle(filename); setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
            }
            (getSystemService(DOWNLOAD_SERVICE) as DownloadManager).enqueue(request); Toast.makeText(this, "Download iniciado", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadRequestedUrl(source: Intent) {
        if ((getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager).activeNetwork == null) { offline.visibility = View.VISIBLE; return }
        val deep = source.data; val url = if (deep?.scheme == "https" && deep.host.equals(APP_HOST, true)) deep.toString() else APP_URL
        webView.loadUrl(url)
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); loadRequestedUrl(intent) }
    override fun onDestroy() { pendingFiles?.onReceiveValue(null); webView.destroy(); super.onDestroy() }
    private fun askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 900)
    }
    inner class NativeBridge {
        @JavascriptInterface fun syncAlarms(json: String) { runCatching { AlarmScheduler.sync(this@MainActivity, json) } }
        @JavascriptInterface fun requestExactAlarmPermission() {
            if (Build.VERSION.SDK_INT >= 31 && !(getSystemService(ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms())
                runOnUiThread { runCatching { startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName"))) } }
        }
        @JavascriptInterface fun share(text: String) { runOnUiThread { startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type="text/plain"; putExtra(Intent.EXTRA_TEXT, text) }, "Compartilhar")) } }
        @JavascriptInterface fun version(): String = BuildConfig.VERSION_NAME
    }
    companion object { const val APP_HOST = "redsystems.ddns.net"; const val APP_URL = "https://redsystems.ddns.net/rotina/?android=1" }
}
