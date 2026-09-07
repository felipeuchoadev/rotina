package net.redsystems.redzone

object AlarmRules {
    const val MAX_SNOOZES = 3
    fun canSnooze(tryHard: Boolean, snoozes: Int) = !tryHard && snoozes < MAX_SNOOZES
    fun shouldUpdate(remoteCode: Int, currentCode: Int) = remoteCode > currentCode
}
