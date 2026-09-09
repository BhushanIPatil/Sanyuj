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
        // Importance cannot be raised in place — recreate if FCM already made a silent channel.
        if (existing != null && existing.importance < NotificationManager.IMPORTANCE_HIGH) {
            manager.deleteNotificationChannel(id)
        }
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
