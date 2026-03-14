const { NativeModules } = require("react-native");

interface NotificationModuleInterface {
	startService(token: string, userId: string, usersJson: string, intervalMs: number): void;
	stopService(): void;
	setAppForeground(foreground: boolean): void;
	showNotification(title: string, body: string, channelId: string | null): void;
	cancelAll(): void;
	clearUnreadTracking(): void;
}

const NotificationModule = NativeModules.NotificationModule as
	| NotificationModuleInterface
	| undefined;

export function startNotificationService(
	token: string,
	userId: string,
	usersMap: Record<string, unknown>,
	intervalMs?: number
): void {
	if (!NotificationModule) return;
	const usersJson = JSON.stringify(usersMap || {});
	NotificationModule.startService(token, userId, usersJson, intervalMs || 120000);
}

export function stopNotificationService(): void {
	if (!NotificationModule) return;
	NotificationModule.stopService();
}

export function setAppForeground(foreground: boolean): void {
	if (!NotificationModule) return;
	NotificationModule.setAppForeground(foreground);
}

export function showNotification(title: string, body: string, channelId?: string): void {
	if (!NotificationModule) return;
	NotificationModule.showNotification(title, body, channelId || null);
}

export function cancelAllNotifications(): void {
	if (!NotificationModule) return;
	NotificationModule.cancelAll();
}

export function clearUnreadTracking(): void {
	if (!NotificationModule) return;
	NotificationModule.clearUnreadTracking();
}
