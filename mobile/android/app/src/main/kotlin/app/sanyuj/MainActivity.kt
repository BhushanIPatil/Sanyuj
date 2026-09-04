package app.sanyuj

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onStart() {
        super.onStart()
        ensureDefaultNotificationChannel()
    }

    private fun ensureDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val id = "sanyuj_default"
        if (manager.getNotificationChannel(id) != null) return
        val channel = NotificationChannel(
            id,
            "Sanyuj",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "General Sanyuj notifications"
        }
        manager.createNotificationChannel(channel)
    }
}
