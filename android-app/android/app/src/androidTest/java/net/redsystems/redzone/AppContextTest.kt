package net.redsystems.redzone

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppContextTest {
    @Test fun applicationIdIsStableForOtaUpdates() {
        assertEquals("net.redsystems.redzone", InstrumentationRegistry.getInstrumentation().targetContext.packageName)
    }
}
