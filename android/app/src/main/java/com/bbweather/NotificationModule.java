package com.bbweather;

import android.content.Intent;
import android.content.SharedPreferences;
import android.content.Context;
import android.os.Build;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class NotificationModule extends ReactContextBaseJavaModule {

    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "NotificationModule";
    }

    @ReactMethod
    public void startService(String token, String userId, String usersMapJson, int intervalMs) {
        Context context = getReactApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("bb_notifications", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("token", token)
            .putString("userId", userId)
            .putString("usersMap", usersMapJson)
            .putBoolean("appForeground", true)
            .putInt("pollInterval", intervalMs)
            .apply();

        NotificationHelper.createChannel(context);

        Intent intent = new Intent(context, SlackPollingService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @ReactMethod
    public void stopService() {
        Context context = getReactApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("bb_notifications", Context.MODE_PRIVATE);
        prefs.edit()
            .remove("token")
            .remove("userId")
            .remove("usersMap")
            .apply();

        Intent intent = new Intent(context, SlackPollingService.class);
        context.stopService(intent);
    }

    @ReactMethod
    public void setAppForeground(boolean foreground) {
        Context context = getReactApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("bb_notifications", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("appForeground", foreground).apply();

        if (foreground) {
            NotificationHelper.cancelAll(context);
        }
    }

    @ReactMethod
    public void showNotification(String title, String body, String channelId) {
        Context context = getReactApplicationContext();
        int id = channelId != null ? channelId.hashCode() : (int) System.currentTimeMillis();
        NotificationHelper.show(context, id, title, body, channelId);
    }

    @ReactMethod
    public void cancelAll() {
        NotificationHelper.cancelAll(getReactApplicationContext());
    }

    @ReactMethod
    public void clearUnreadTracking() {
        Context context = getReactApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("bb_notifications", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        for (String key : prefs.getAll().keySet()) {
            if (key.startsWith("unread_") || key.startsWith("mention_")) {
                editor.remove(key);
            }
        }
        editor.apply();
    }

    public static void emitNotificationOpen(ReactApplicationContext context, String channelId) {
        if (context != null && context.hasActiveCatalystInstance()) {
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onNotificationOpen", channelId);
        }
    }
}
