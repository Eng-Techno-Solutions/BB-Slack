import type { AccountEntry } from "../types";
import { NativeModules, Platform } from "react-native";

interface NativeNotificationModule {
	setAccounts(accountsJson: string): void;
	startBackgroundPolling(): void;
	stopBackgroundPolling(): void;
}

const NotifModule = NativeModules.NotificationModule as NativeNotificationModule | undefined;

export function syncAccountsToNative(accounts: AccountEntry[]): void {
	if (Platform.OS !== "android" || !NotifModule) return;
	NotifModule.setAccounts(JSON.stringify(accounts));
}

export function startBackgroundNotifications(): void {
	if (Platform.OS !== "android" || !NotifModule) return;
	NotifModule.startBackgroundPolling();
}

export function stopBackgroundNotifications(): void {
	if (Platform.OS !== "android" || !NotifModule) return;
	NotifModule.stopBackgroundPolling();
}
