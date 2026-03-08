package com.bbweather;

import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import org.json.JSONArray;
import org.json.JSONObject;

public class SlackPollingService extends Service {
    private static final long DEFAULT_POLL_INTERVAL = 120000;
    private static final String PREFS_NAME = "bb_notifications";

    private Handler handler;
    private Runnable pollRunnable;
    private boolean running = false;
    private SSLSocketFactory sslFactory;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        try {
            SSLContext sc = SSLContext.getInstance("TLSv1.2", "Conscrypt");
            sc.init(null, null, null);
            sslFactory = sc.getSocketFactory();
        } catch (Exception e) {
            sslFactory = null;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String token = prefs.getString("token", null);
        String userId = prefs.getString("userId", null);

        if (token == null || userId == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!running) {
            running = true;
            startPolling();
        }

        return START_STICKY;
    }

    private void startPolling() {
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (!running) return;
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        pollForMessages();
                    }
                }).start();
                long interval = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                    .getInt("pollInterval", (int) DEFAULT_POLL_INTERVAL);
                handler.postDelayed(this, interval);
            }
        };
        long initialInterval = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getInt("pollInterval", (int) DEFAULT_POLL_INTERVAL);
        handler.postDelayed(pollRunnable, initialInterval);
    }

    private void pollForMessages() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isForeground = prefs.getBoolean("appForeground", true);
        if (isForeground) return;

        String token = prefs.getString("token", null);
        String userId = prefs.getString("userId", null);
        String usersJson = prefs.getString("usersMap", "{}");
        if (token == null || userId == null) return;

        try {
            JSONObject usersMap = new JSONObject(usersJson);
            String cursor = "";

            do {
                String url = "https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im&exclude_archived=true&limit=200";
                if (cursor.length() > 0) {
                    url += "&cursor=" + cursor;
                }
                String response = httpGet(url, token);
                JSONObject data = new JSONObject(response);
                if (!data.optBoolean("ok", false)) return;

                JSONArray channels = data.optJSONArray("channels");
                if (channels == null) return;

                processChannels(channels, prefs, usersMap, userId);

                JSONObject meta = data.optJSONObject("response_metadata");
                cursor = (meta != null) ? meta.optString("next_cursor", "") : "";
            } while (cursor.length() > 0);

        } catch (Exception e) {
            // Silent fail
        }
    }

    private void processChannels(JSONArray channels, SharedPreferences prefs, JSONObject usersMap, String userId) {
        SharedPreferences.Editor editor = prefs.edit();

        try {
            for (int i = 0; i < channels.length(); i++) {
                JSONObject ch = channels.getJSONObject(i);
                String chId = ch.getString("id");
                boolean isIm = ch.optBoolean("is_im", false);
                boolean isMpim = ch.optBoolean("is_mpim", false);
                int unread = ch.optInt("unread_count_display", 0);
                int mentions = ch.optInt("mention_count_display", 0);

                String unreadKey = "unread_" + chId;
                String mentionKey = "mention_" + chId;
                int lastUnread = prefs.getInt(unreadKey, 0);
                int lastMentions = prefs.getInt(mentionKey, 0);

                boolean shouldNotify = false;
                String title = "";
                String body = "";

                if ((isIm || isMpim) && unread > lastUnread && unread > 0) {
                    shouldNotify = true;
                    String name = "Someone";
                    if (isIm) {
                        String dmUserId = ch.optString("user", "");
                        name = getUserDisplayName(usersMap, dmUserId);
                    } else {
                        name = ch.optString("name", "Group message");
                    }
                    int newCount = unread - lastUnread;
                    title = name;
                    body = newCount + " new message" + (newCount > 1 ? "s" : "");
                } else if (!isIm && !isMpim && mentions > lastMentions && mentions > 0) {
                    shouldNotify = true;
                    String name = ch.optString("name", "channel");
                    int newMentions = mentions - lastMentions;
                    title = "#" + name;
                    body = newMentions + " new mention" + (newMentions > 1 ? "s" : "");
                }

                if (shouldNotify) {
                    NotificationHelper.show(this, chId.hashCode(), title, body, chId);
                }

                editor.putInt(unreadKey, unread);
                editor.putInt(mentionKey, mentions);
            }
        } catch (Exception e) {
            // Silent fail
        }

        editor.apply();
    }

    private String getUserDisplayName(JSONObject usersMap, String userId) {
        try {
            if (usersMap.has(userId)) {
                JSONObject user = usersMap.getJSONObject(userId);
                String displayName = "";
                if (user.has("profile")) {
                    JSONObject profile = user.getJSONObject("profile");
                    displayName = profile.optString("display_name", "");
                    if (displayName.isEmpty()) {
                        displayName = profile.optString("real_name", "");
                    }
                }
                if (displayName.isEmpty()) {
                    displayName = user.optString("real_name", user.optString("name", "Someone"));
                }
                return displayName;
            }
        } catch (Exception e) {
            // Fall through
        }
        return "Someone";
    }

    private String httpGet(String urlString, String token) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        if (conn instanceof HttpsURLConnection && sslFactory != null) {
            ((HttpsURLConnection) conn).setSSLSocketFactory(sslFactory);
        }
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(30000);

        try {
            BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8")
            );
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            return sb.toString();
        } finally {
            conn.disconnect();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (handler != null && pollRunnable != null) {
            handler.removeCallbacks(pollRunnable);
        }
        super.onDestroy();
    }
}
