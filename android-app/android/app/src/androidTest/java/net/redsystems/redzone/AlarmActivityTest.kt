package net.redsystems.redzone

import android.content.Context
import android.content.Intent
import android.view.ViewGroup
import android.widget.Button
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AlarmActivityTest {
    private fun buttonTexts(tryHard: Boolean, snoozes: Int): List<String> {
        val context=ApplicationProvider.getApplicationContext<Context>()
        val alarm="""{"id":"audit","hora":"10:10","nome":"Teste REDZONE","tryHard":$tryHard,"tema":"ouro"}"""
        val intent=Intent(context,AlarmActivity::class.java).putExtra("alarm",alarm).putExtra("snoozes",snoozes).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        var texts=emptyList<String>()
        ActivityScenario.launch<AlarmActivity>(intent).use { scenario -> scenario.onActivity { activity ->
            val root=activity.findViewById<ViewGroup>(android.R.id.content)
            fun collect(group:ViewGroup):List<String> = (0 until group.childCount).flatMap { i -> when(val child=group.getChildAt(i)){is Button->listOf(child.text.toString());is ViewGroup->collect(child);else->emptyList()} }
            texts=collect(root)
        } }
        return texts
    }

    @Test fun normalAlarmOffersSnoozeAndStop() {
        val texts=buttonTexts(false,0)
        assertTrue(texts.any { it.startsWith("ADIAR 5 MINUTOS") })
        assertTrue(texts.contains("DESLIGAR ALARME"))
    }

    @Test fun thirdSnoozeAndTryHardCannotSnooze() {
        assertFalse(buttonTexts(false,3).any { it.startsWith("ADIAR") })
        assertFalse(buttonTexts(true,0).any { it.startsWith("ADIAR") })
    }
}
