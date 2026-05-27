package com.engtechnos.BBSlack;

import android.app.IntentService;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.support.v4.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;

public class NotificationPollService extends IntentService {

    private static final String SLACK_API = "https://slack.com/api/";
    private static final int BASE_NOTIF_ID = 9000;

    public NotificationPollService() {
        super("NotificationPollService");
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        String accountsJson = NotificationModule.getAccounts(this);
        String lastUnreadsJson = NotificationModule.getLastUnreads(this);

        JSONArray accounts;
        JSONObject lastUnreads;
        try {
            accounts = new JSONArray(accountsJson);
            lastUnreads = new JSONObject(lastUnreadsJson);
        } catch (Exception e) {
            return;
        }

        if (accounts.length() == 0) return;

        JSONObject newUnreads = new JSONObject();
        int notifIndex = 0;

        NotificationManager notifManager = (NotificationManager)
            getSystemService(Context.NOTIFICATION_SERVICE);
        if (notifManager == null) return;

        for (int i = 0; i < accounts.length(); i++) {
            try {
                JSONObject account = accounts.getJSONObject(i);
                String token = account.optString("token", "");
                String teamName = account.optString("teamName", "");
                String userId = account.optString("userId", "");

                if (token.isEmpty()) continue;

                JSONArray channels = fetchConversations(token);
                if (channels == null) continue;

                for (int j = 0; j < channels.length(); j++) {
                    JSONObject ch = channels.getJSONObject(j);
                    String channelId = ch.optString("id", "");
                    int unreadCount = ch.optInt("unread_count_display", 0);
                    boolean isMember = ch.optBoolean("is_member", false);
                    boolean isIm = ch.optBoolean("is_im", false);
                    boolean isMpim = ch.optBoolean("is_mpim", false);

                    if (!isMember && !isIm && !isMpim) continue;
                    if (unreadCount <= 0) continue;

                    String key = userId + ":" + channelId;
                    int prevCount = lastUnreads.optInt(key, 0);

                    try {
                        newUnreads.put(key, unreadCount);
                    } catch (Exception e) {
                        // ignore
                    }

                    if (unreadCount > prevCount) {
                        int newMessages = unreadCount - prevCount;
                        String title;
                        String body;

                        if (isIm) {
                            String dmUser = ch.optString("user", "");
                            title = "New DM" + (teamName.isEmpty() ? "" : " — " + teamName);
                            body = newMessages + " new message" + (newMessages > 1 ? "s" : "")
                                + " from " + dmUser;
                        } else {
                            String channelName = ch.optString("name", channelId);
                            title = "#" + channelName
                                + (teamName.isEmpty() ? "" : " — " + teamName);
                            body = newMessages + " new message" + (newMessages > 1 ? "s" : "");
                        }

                        showNotification(notifManager, BASE_NOTIF_ID + notifIndex, title, body);
                        notifIndex++;
                    }
                }
            } catch (Exception e) {
                // Skip this account, try next
            }
        }

        NotificationModule.setLastUnreads(this, newUnreads.toString());
    }

    private JSONArray fetchConversations(String token) {
        HttpURLConnection conn = null;
        try {
            String urlStr = SLACK_API
                + "conversations.list?types=public_channel,private_channel,mpim,im"
                + "&exclude_archived=true&limit=200";

            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();

            if (conn instanceof HttpsURLConnection) {
                try {
                    SSLContext sc = SSLContext.getInstance("TLSv1.2", "Conscrypt");
                    sc.init(null, null, null);
                    ((HttpsURLConnection) conn).setSSLSocketFactory(sc.getSocketFactory());
                } catch (Exception e) {
                    // Fall back to default SSL
                }
            }

            conn.setRequestMethod("GET");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("Authorization", "Bearer " + token);

            int code = conn.getResponseCode();
            if (code != 200) return null;

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8")
            );
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();

            JSONObject response = new JSONObject(sb.toString());
            if (!response.optBoolean("ok", false)) return null;

            return response.optJSONArray("channels");
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void showNotification(NotificationManager manager, int id, String title, String body) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, id, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build();

        manager.notify(id, notification);
    }
}
