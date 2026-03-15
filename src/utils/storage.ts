import type { FontSizeKey, ThemeMode } from "../theme";
import type { AccountEntry } from "../types";
import { STORAGE_KEYS } from "./constants";
import type { AsyncStorageInterface } from "./types";
import { Platform } from "react-native";

export type { AccountEntry as Account };

function getAsyncStorage(): AsyncStorageInterface {
	return require("react-native").AsyncStorage;
}

export async function saveToken(token: string): Promise<void> {
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.TOKEN, token);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.TOKEN, token);
	}
}

export async function getToken(): Promise<string | null> {
	if (Platform.OS === "web") {
		return localStorage.getItem(STORAGE_KEYS.TOKEN);
	}
	return await getAsyncStorage().getItem(STORAGE_KEYS.TOKEN);
}

export async function clearToken(): Promise<void> {
	if (Platform.OS === "web") {
		localStorage.removeItem(STORAGE_KEYS.TOKEN);
	} else {
		await getAsyncStorage().removeItem(STORAGE_KEYS.TOKEN);
	}
}

export async function saveTheme(mode: ThemeMode): Promise<void> {
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.THEME, mode);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.THEME, mode);
	}
}

export async function getTheme(): Promise<ThemeMode> {
	if (Platform.OS === "web") {
		return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode) || "dark";
	}
	const val = await getAsyncStorage().getItem(STORAGE_KEYS.THEME);
	return (val as ThemeMode) || "dark";
}

export async function saveNotifInterval(ms: number): Promise<void> {
	const val = String(ms);
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.NOTIF_INTERVAL, val);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.NOTIF_INTERVAL, val);
	}
}

export async function getNotifInterval(): Promise<number> {
	let val: string | null;
	if (Platform.OS === "web") {
		val = localStorage.getItem(STORAGE_KEYS.NOTIF_INTERVAL);
	} else {
		val = await getAsyncStorage().getItem(STORAGE_KEYS.NOTIF_INTERVAL);
	}
	return val ? parseInt(val, 10) : 120000;
}

export async function saveNotifEnabled(enabled: boolean): Promise<void> {
	const val = enabled ? "1" : "0";
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.NOTIF_ENABLED, val);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.NOTIF_ENABLED, val);
	}
}

export async function getNotifEnabled(): Promise<boolean> {
	let val: string | null;
	if (Platform.OS === "web") {
		val = localStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED);
	} else {
		val = await getAsyncStorage().getItem(STORAGE_KEYS.NOTIF_ENABLED);
	}
	return val !== "0";
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
	const val = enabled ? "1" : "0";
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, val);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.SOUND_ENABLED, val);
	}
}

export async function getSoundEnabled(): Promise<boolean> {
	let val: string | null;
	if (Platform.OS === "web") {
		val = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
	} else {
		val = await getAsyncStorage().getItem(STORAGE_KEYS.SOUND_ENABLED);
	}
	return val !== "0";
}

export async function saveFontSize(size: FontSizeKey): Promise<void> {
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.FONT_SIZE, size);
	}
}

export async function getFontSize(): Promise<FontSizeKey> {
	let val: string | null;
	if (Platform.OS === "web") {
		val = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
	} else {
		val = await getAsyncStorage().getItem(STORAGE_KEYS.FONT_SIZE);
	}
	return (val as FontSizeKey) || "medium";
}

export async function getAccounts(): Promise<AccountEntry[]> {
	let val: string | null;
	if (Platform.OS === "web") {
		val = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
	} else {
		val = await getAsyncStorage().getItem(STORAGE_KEYS.ACCOUNTS);
	}
	if (!val) return [];
	try {
		return JSON.parse(val) as AccountEntry[];
	} catch (e) {
		return [];
	}
}

export async function saveAccounts(accounts: AccountEntry[]): Promise<void> {
	const val = JSON.stringify(accounts);
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.ACCOUNTS, val);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.ACCOUNTS, val);
	}
}

export async function getActiveAccountId(): Promise<string | null> {
	if (Platform.OS === "web") {
		return localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT) || null;
	}
	return (await getAsyncStorage().getItem(STORAGE_KEYS.ACTIVE_ACCOUNT)) || null;
}

export async function saveActiveAccountId(id: string): Promise<void> {
	if (Platform.OS === "web") {
		localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, id);
	} else {
		await getAsyncStorage().setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, id);
	}
}
