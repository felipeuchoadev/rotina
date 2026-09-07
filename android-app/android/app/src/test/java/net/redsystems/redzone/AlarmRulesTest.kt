package net.redsystems.redzone

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmRulesTest {
    @Test fun normalAlarmAllowsExactlyThreeSnoozes() {
        assertTrue(AlarmRules.canSnooze(false, 0))
        assertTrue(AlarmRules.canSnooze(false, 2))
        assertFalse(AlarmRules.canSnooze(false, 3))
    }

    @Test fun tryHardNeverAllowsSnooze() {
        assertFalse(AlarmRules.canSnooze(true, 0))
    }

    @Test fun otaOnlyAcceptsNewerVersion() {
        assertTrue(AlarmRules.shouldUpdate(8, 7))
        assertFalse(AlarmRules.shouldUpdate(7, 7))
        assertFalse(AlarmRules.shouldUpdate(6, 7))
    }

    @Test fun alarmHasFiniteSafetyLimit() {
        assertTrue(AlarmService.MAX_RING_MS in 60_000L..600_000L)
    }
}
