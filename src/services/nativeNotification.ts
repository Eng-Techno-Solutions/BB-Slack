import type { AccountEntry } from "../types";
import { NativeModules, Platform } from "react-native";

interface NativeNotificationModule {
	setAccounts(accountsJson: string): void;
	startBackgroundPolling(): void;
	stopBackgroundPolling(): void;
	setChannelsMentionOnly(enabled: boolean): void;
	sendTestNotification(): void;
	getDiagnostics(): Promise<string>;
}

const NotifModule = NativeModules.NotificationModule as NativeNotificationModule | undefined;

export interface NotifDiagnostics {
	serviceStartedAt: number;
	now: number;
	lastPoll: {
		at?: number;
		foreground?: boolean;
		accounts?: number;
		results?: string[];
	};
}

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

export function syncChannelsMentionOnlyToNative(enabled: boolean): void {
	if (Platform.OS !== "android" || !NotifModule) return;
	NotifModule.setChannelsMentionOnly(enabled);
}

export function hasNotifDiagnostics(): boolean {
	return Platform.OS === "android" && !!NotifModule;
}

export function sendTestNotification(): void {
	if (!hasNotifDiagnostics()) return;
	NotifModule.sendTestNotification();
}

export async function getNotifDiagnostics(): Promise<NotifDiagnostics | null> {
	if (!hasNotifDiagnostics()) return null;
	try {
		const raw = await NotifModule.getDiagnostics();
		return JSON.parse(raw) as NotifDiagnostics;
	} catch (_e) {
		return null;
	}
}
