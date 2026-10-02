# Flutter and plugins supply their consumer rules. Do not retain the entire
# embedding: that retains unused Play Store deferred-component integration.
-keep class com.supabase.** { *; }
-dontwarn com.supabase.**
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class com.dexterous.** { *; }
