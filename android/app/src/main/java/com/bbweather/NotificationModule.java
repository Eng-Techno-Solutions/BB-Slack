package com.engtechnos.BBSlack;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.SystemClock;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class NotificationModule extends ReactContextBaseJavaModule {

    private static final String PREFS_NAME = "BBSlackNotifPrefs";
    private static final String KEY_ACCOUNTS = "accounts";
    private static final String KEY_LAST_UNREADS = "lastUnreads";
    private static final long POLL_INTERVAL = 2 * 60 * 1000;

    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    @ReactMethod
    public void setAccounts(String accountsJson) {
        Context context = getReactApplicationContext();
        getPrefs().edit()
            .putString(KEY_ACCOUNTS, accountsJson)
            .apply();
        // Keep the alarm lifetime tied to having at least one account.
        // Auto-arming here means a fresh login covers the swipe-kill case
        // (where AppState=background is never delivered before the process dies).
        if (accountsJson == null || accountsJson.equals("[]")) {
            cancelAlarm(context);
        } else {
            scheduleAlarm(context);
        }
    }

    @ReactMethod
    public void startBackgroundPolling() {
        scheduleAlarm(getReactApplicationContext());
    }

    @ReactMethod
    public void stopBackgroundPolling() {
        cancelAlarm(getReactApplicationContext());
    }

    static void scheduleAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, NotificationAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT
        );
        alarmManager.setRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + POLL_INTERVAL,
            POLL_INTERVAL,
            pendingIntent
        );
    }

    static void cancelAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, NotificationAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT
        );
        alarmManager.cancel(pendingIntent);
    }

    private SharedPreferences getPrefs() {
        return getReactApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static String getAccounts(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_ACCOUNTS, "[]");
    }

    public static String getLastUnreads(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_LAST_UNREADS, "{}");
    }

    public static void setLastUnreads(Context context, String unreadsJson) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_LAST_UNREADS, unreadsJson).apply();
    }
}
