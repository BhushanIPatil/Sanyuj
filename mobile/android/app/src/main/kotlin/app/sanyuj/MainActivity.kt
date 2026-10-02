package app.sanyuj

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ensureDefaultNotificationChannel()
    }

    private fun ensureDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val id = "sanyuj_default"
        val existing = manager.getNotificationChannel(id)
        // Channel settings belong to the user, including silent/disabled states.
        if (existing != null) return
        val channel = NotificationChannel(
            id,
            "Sanyuj",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "General Sanyuj notifications"
            enableVibration(true)
            setShowBadge(true)
        }
        manager.createNotificationChannel(channel)
    }
}
