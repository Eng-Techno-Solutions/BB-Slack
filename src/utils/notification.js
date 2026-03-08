var { NativeModules } = require('react-native');
var NotificationModule = NativeModules.NotificationModule;

export function startNotificationService(token, userId, usersMap, intervalMs) {
  if (!NotificationModule) return;
  var usersJson = JSON.stringify(usersMap || {});
  NotificationModule.startService(token, userId, usersJson, intervalMs || 120000);
}

export function stopNotificationService() {
  if (!NotificationModule) return;
  NotificationModule.stopService();
}

export function setAppForeground(foreground) {
  if (!NotificationModule) return;
  NotificationModule.setAppForeground(foreground);
}

export function showNotification(title, body, channelId) {
  if (!NotificationModule) return;
  NotificationModule.showNotification(title, body, channelId || null);
}

export function cancelAllNotifications() {
  if (!NotificationModule) return;
  NotificationModule.cancelAll();
}

export function clearUnreadTracking() {
  if (!NotificationModule) return;
  NotificationModule.clearUnreadTracking();
}
