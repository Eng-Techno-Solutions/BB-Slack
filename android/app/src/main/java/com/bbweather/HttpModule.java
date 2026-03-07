package com.bbweather;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.io.BufferedReader;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;

import org.json.JSONObject;

public class HttpModule extends ReactContextBaseJavaModule {

    public HttpModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "HttpModule";
    }

    private static SSLSocketFactory createTls12SocketFactory() {
        try {
            SSLContext sc = SSLContext.getInstance("TLSv1.2", "Conscrypt");
            sc.init(null, null, null);
            return new Tls12SocketFactory(sc.getSocketFactory());
        } catch (Exception e) {
            return null;
        }
    }

    private static class Tls12SocketFactory extends SSLSocketFactory {
        private final SSLSocketFactory delegate;

        Tls12SocketFactory(SSLSocketFactory delegate) {
            this.delegate = delegate;
        }

        @Override public String[] getDefaultCipherSuites() { return delegate.getDefaultCipherSuites(); }
        @Override public String[] getSupportedCipherSuites() { return delegate.getSupportedCipherSuites(); }
        @Override public Socket createSocket(Socket s, String host, int port, boolean autoClose) throws IOException {
            return enableTls12(delegate.createSocket(s, host, port, autoClose));
        }
        @Override public Socket createSocket(String host, int port) throws IOException {
            return enableTls12(delegate.createSocket(host, port));
        }
        @Override public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException {
            return enableTls12(delegate.createSocket(host, port, localHost, localPort));
        }
        @Override public Socket createSocket(InetAddress host, int port) throws IOException {
            return enableTls12(delegate.createSocket(host, port));
        }
        @Override public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort) throws IOException {
            return enableTls12(delegate.createSocket(address, port, localAddress, localPort));
        }

        private Socket enableTls12(Socket socket) {
            if (socket instanceof SSLSocket) {
                ((SSLSocket) socket).setEnabledProtocols(new String[]{"TLSv1.2"});
            }
            return socket;
        }
    }

    @ReactMethod
    public void request(final String method, final String urlString, final String headersJson, final String body, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(urlString);
                    conn = (HttpURLConnection) url.openConnection();
                    if (conn instanceof HttpsURLConnection) {
                        SSLSocketFactory factory = createTls12SocketFactory();
                        if (factory != null) {
                            ((HttpsURLConnection) conn).setSSLSocketFactory(factory);
                        }
                    }
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(30000);
                    conn.setInstanceFollowRedirects(true);

                    if (headersJson != null && headersJson.length() > 2) {
                        JSONObject headers = new JSONObject(headersJson);
                        Iterator<String> keys = headers.keys();
                        while (keys.hasNext()) {
                            String key = keys.next();
                            conn.setRequestProperty(key, headers.getString(key));
                        }
                    }

                    if (body != null && body.length() > 0 && !method.equals("GET")) {
                        conn.setDoOutput(true);
                        OutputStream os = conn.getOutputStream();
                        os.write(body.getBytes("UTF-8"));
                        os.flush();
                        os.close();
                    }

                    int code = conn.getResponseCode();

                    BufferedReader reader;
                    if (code >= 200 && code < 400) {
                        reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                    } else {
                        reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));
                    }

                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject result = new JSONObject();
                    result.put("status", code);
                    result.put("body", sb.toString());
                    promise.resolve(result.toString());
                } catch (Exception e) {
                    String msg = e.getClass().getName() + ": " + e.getMessage();
                    if (e.getCause() != null) {
                        msg += " | Cause: " + e.getCause().getClass().getName() + ": " + e.getCause().getMessage();
                    }
                    promise.reject("NETWORK_ERROR", msg);
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        }).start();
    }

    @ReactMethod
    public void get(final String urlString, final Promise promise) {
        request("GET", urlString, "{}", "", promise);
    }

    @ReactMethod
    public void uploadMultipart(final String urlString, final String token, final String fieldsJson, final String fileName, final String fileType, final String fileBase64, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    String boundary = "----BBUpload" + System.currentTimeMillis();
                    URL url = new URL(urlString);
                    conn = (HttpURLConnection) url.openConnection();
                    if (conn instanceof HttpsURLConnection) {
                        SSLSocketFactory factory = createTls12SocketFactory();
                        if (factory != null) {
                            ((HttpsURLConnection) conn).setSSLSocketFactory(factory);
                        }
                    }
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(60000);
                    conn.setReadTimeout(60000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                    conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

                    OutputStream os = conn.getOutputStream();
                    String crlf = "\r\n";

                    // Write text fields
                    if (fieldsJson != null && fieldsJson.length() > 2) {
                        JSONObject fields = new JSONObject(fieldsJson);
                        Iterator<String> keys = fields.keys();
                        while (keys.hasNext()) {
                            String key = keys.next();
                            String val = fields.getString(key);
                            os.write(("--" + boundary + crlf).getBytes("UTF-8"));
                            os.write(("Content-Disposition: form-data; name=\"" + key + "\"" + crlf).getBytes("UTF-8"));
                            os.write((crlf).getBytes("UTF-8"));
                            os.write(val.getBytes("UTF-8"));
                            os.write(crlf.getBytes("UTF-8"));
                        }
                    }

                    // Write file field
                    byte[] fileBytes = android.util.Base64.decode(fileBase64, android.util.Base64.DEFAULT);
                    os.write(("--" + boundary + crlf).getBytes("UTF-8"));
                    os.write(("Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"" + crlf).getBytes("UTF-8"));
                    os.write(("Content-Type: " + fileType + crlf).getBytes("UTF-8"));
                    os.write((crlf).getBytes("UTF-8"));
                    os.write(fileBytes);
                    os.write(crlf.getBytes("UTF-8"));

                    // End boundary
                    os.write(("--" + boundary + "--" + crlf).getBytes("UTF-8"));
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    BufferedReader reader;
                    if (code >= 200 && code < 400) {
                        reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                    } else {
                        reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));
                    }

                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject result = new JSONObject();
                    result.put("status", code);
                    result.put("body", sb.toString());
                    promise.resolve(result.toString());
                } catch (Exception e) {
                    promise.reject("UPLOAD_ERROR", e.getMessage());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }

    private HttpURLConnection openConnectionWithTls(URL url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        if (conn instanceof HttpsURLConnection) {
            SSLSocketFactory factory = createTls12SocketFactory();
            if (factory != null) {
                ((HttpsURLConnection) conn).setSSLSocketFactory(factory);
            }
        }
        return conn;
    }

    private void downloadWithRedirects(String urlString, String token, String destPath, int maxRedirects) throws Exception {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = openConnectionWithTls(url);
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(30000);
            conn.setInstanceFollowRedirects(false);
            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }

            int code = conn.getResponseCode();
            if (code >= 300 && code < 400 && maxRedirects > 0) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                conn = null;
                if (location != null) {
                    downloadWithRedirects(location, token, destPath, maxRedirects - 1);
                    return;
                }
                throw new Exception("Redirect with no Location header");
            }

            if (code >= 200 && code < 300) {
                InputStream is = conn.getInputStream();
                FileOutputStream fos = new FileOutputStream(destPath);
                byte[] buffer = new byte[8192];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    fos.write(buffer, 0, len);
                }
                fos.close();
                is.close();
            } else {
                throw new Exception("HTTP " + code);
            }
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    @ReactMethod
    public void downloadFile(final String urlString, final String token, final String destPath, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    downloadWithRedirects(urlString, token, destPath, 5);
                    promise.resolve(destPath);
                } catch (Exception e) {
                    promise.reject("DOWNLOAD_ERROR", e.getMessage());
                }
            }
        }).start();
    }

    @ReactMethod
    public void uploadBinary(final String urlString, final String fileBase64, final String contentType, final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    URL url = new URL(urlString);
                    conn = openConnectionWithTls(url);
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(60000);
                    conn.setReadTimeout(60000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", contentType);

                    byte[] fileBytes = android.util.Base64.decode(fileBase64, android.util.Base64.DEFAULT);
                    conn.setRequestProperty("Content-Length", String.valueOf(fileBytes.length));

                    OutputStream os = conn.getOutputStream();
                    os.write(fileBytes);
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    BufferedReader reader;
                    if (code >= 200 && code < 400) {
                        reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                    } else {
                        reader = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "UTF-8"));
                    }

                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    JSONObject result = new JSONObject();
                    result.put("status", code);
                    result.put("body", sb.toString());
                    promise.resolve(result.toString());
                } catch (Exception e) {
                    promise.reject("UPLOAD_ERROR", e.getMessage());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }
}
