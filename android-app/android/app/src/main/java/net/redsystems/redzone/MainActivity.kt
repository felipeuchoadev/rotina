package net.redsystems.redzone

import android.os.Bundle
import android.view.Display
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        preferHighestRefreshRate()
        setContent { RedzoneApp() }
    }

    private fun preferHighestRefreshRate() {
        val activeDisplay = display ?: return
        val current = activeDisplay.mode
        val best = activeDisplay.supportedModes
            .filter { it.physicalWidth == current.physicalWidth && it.physicalHeight == current.physicalHeight }
            .maxByOrNull(Display.Mode::getRefreshRate) ?: current
        window.attributes = window.attributes.apply {
            preferredDisplayModeId = best.modeId
            preferredRefreshRate = best.refreshRate
        }
    }
}
