# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.pair.darb.agent.data.remote.dto.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
